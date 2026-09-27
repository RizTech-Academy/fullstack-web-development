"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PASSWORD_MIN_LENGTH, type AuthUser } from "@kirana/shared";

import { ApiError } from "@/lib/api";
import { apiRequest } from "@/lib/api-server";
import { safeNextParam } from "@/lib/next-param";

/**
 * `values` carries back what was typed.
 *
 * Without it a failed sign-in re-renders an empty form and the customer retypes
 * their email to find out they mistyped the password. The password itself is
 * deliberately not carried back: it would end up in the server action's
 * response and, from there, in the page's serialised state.
 */
export type FormState = {
  error: string | null;
  values?: { email?: string; name?: string; phone?: string };
};

export async function login(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = formData.get("next");
  const next = safeNextParam(typeof raw === "string" ? raw : undefined);

  const email = String(formData.get("email") ?? "");

  try {
    await apiRequest<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { email, password: formData.get("password") },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message, values: { email } };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  // Outside the try block on purpose: `redirect` works by throwing, so a catch
  // around it swallows the redirect and shows an error instead.
  redirect(next);
}

export async function register(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = formData.get("next");
  const next = safeNextParam(typeof raw === "string" ? raw : undefined);
  const password = String(formData.get("password") ?? "");
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };

  // Checked here as well as in the API, because a round trip to be told the
  // password is too short is a slow way to learn it.
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { error: `Use at least ${PASSWORD_MIN_LENGTH} characters.`, values };
  }

  try {
    await apiRequest<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      body: {
        name: values.name,
        email: values.email,
        password,
        phone: values.phone || undefined,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, values };
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Already signed out, or the API is down. Either way the customer wanted to
    // leave, so do not show them an error about it.
  }
  revalidatePath("/", "layout");
  redirect("/");
}
