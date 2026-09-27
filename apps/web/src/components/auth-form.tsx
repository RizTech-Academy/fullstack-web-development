"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PASSWORD_MIN_LENGTH } from "@kirana/shared";

import { login, register, type FormState } from "@/app/actions/auth";

const INITIAL: FormState = { error: null };

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next: string;
}) {
  const [state, action, pending] = useActionState(
    mode === "login" ? login : register,
    INITIAL,
  );

  return (
    <form action={action} className="mx-auto max-w-sm space-y-4">
      {/* Carried through the form rather than kept in the URL only, so it
          survives the POST. It is validated server-side before use. */}
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950"
        >
          {state.error}
        </p>
      )}

      {/*
        `defaultValue` from the returned state, so a rejected form comes back
        filled in. Uncontrolled inputs are reset when the action re-renders the
        form, which is how a wrong password ended up wiping the email address.
      */}
      {mode === "register" && (
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          defaultValue={state.values?.name ?? ""}
          required
        />
      )}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email ?? ""}
        required
      />

      {mode === "register" && (
        <Field
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          defaultValue={state.values?.phone ?? ""}
          hint="Optional now, needed at checkout."
        />
      )}

      <Field
        label="Password"
        name="password"
        type="password"
        // "current-password" on login and "new-password" on register, so a
        // password manager offers the right thing instead of nothing.
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        minLength={mode === "register" ? PASSWORD_MIN_LENGTH : undefined}
        hint={
          mode === "register"
            ? `At least ${PASSWORD_MIN_LENGTH} characters. Length beats punctuation.`
            : undefined
        }
        required
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-gray-900 px-4 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
      </button>

      <p className="text-center text-sm text-gray-500">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link
              href={`/account/register?next=${encodeURIComponent(next)}`}
              className="underline"
            >
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={`/account/login?next=${encodeURIComponent(next)}`}
              className="underline"
            >
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  ...input
}: {
  label: string;
  name: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const hintId = hint ? `${name}-hint` : undefined;

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-describedby={hintId}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        {...input}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
