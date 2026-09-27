"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  ErrorCode,
  formatPaise,
  type AuthUser,
  type CartView,
  type DeliveryDay,
} from "@kirana/shared";

import { placeOrder, type CheckoutState } from "@/app/actions/checkout";

const INITIAL: CheckoutState = { error: null, code: null };

export function CheckoutForm({
  cart,
  days,
  user,
  pincodes,
}: {
  cart: CartView;
  days: DeliveryDay[];
  user: AuthUser;
  pincodes: string[];
}) {
  // React 19. The action returns the next state, so an error survives the
  // re-render without a useEffect or a second fetch.
  const [state, action, pending] = useActionState(placeOrder, INITIAL);

  const bookable = days.filter((day) => day.slots.length > 0);
  const firstSlot = bookable[0]?.slots[0];

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {state.error && (
          <div
            role="alert"
            className="rounded border border-red-300 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950"
          >
            <p>{state.error}</p>
            {/* A stock or slot problem is fixed somewhere else, so say where. */}
            {state.code === ErrorCode.INSUFFICIENT_STOCK && (
              <Link href="/cart" className="mt-1 inline-block underline">
                Back to the cart
              </Link>
            )}
          </div>
        )}

        <fieldset className="space-y-4">
          <legend className="text-base font-medium">Delivery address</legend>

          <Field label="Name" name="name" defaultValue={user.name} required />
          <Field
            label="Mobile number"
            name="phone"
            type="tel"
            inputMode="numeric"
            defaultValue={user.phone ?? ""}
            hint="Ten digits. The delivery person will call this number."
            required
          />
          <Field label="Flat, building, street" name="line1" required />
          <Field label="Area" name="line2" />
          <Field label="Landmark" name="landmark" hint="Optional, and it helps." />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" name="city" defaultValue="Pune" required />
            <div>
              <label htmlFor="pincode" className="block text-sm font-medium">
                Pincode
              </label>
              <select
                id="pincode"
                name="pincode"
                required
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                {/* A select, not a text box. The shop delivers to three
                    pincodes, so offering a free-text field only invites an
                    address it will have to refuse later. */}
                {pincodes.map((pincode) => (
                  <option key={pincode} value={pincode}>
                    {pincode}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-medium">Delivery slot</legend>

          {bookable.length === 0 ? (
            <p className="text-sm text-gray-500">
              Every slot in the next few days is full. Please try again tomorrow.
            </p>
          ) : (
            bookable.map((day) => (
              <div key={day.date}>
                <p className="mb-1 text-sm font-medium">{day.label}</p>
                <div className="flex flex-wrap gap-2">
                  {day.slots.map((slot) => (
                    <label
                      key={`${day.date}-${slot.id}`}
                      className="cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm has-checked:border-gray-900 dark:border-gray-700 dark:has-checked:border-white"
                    >
                      <input
                        type="radio"
                        name="slot"
                        // Both values in one field: an id without its date is
                        // meaningless, and two fields could disagree.
                        value={`${slot.id}|${day.date}`}
                        defaultChecked={slot.id === firstSlot?.id && day.date === bookable[0]?.date}
                        required
                        className="mr-2"
                      />
                      {slot.label}
                      {slot.remaining <= 3 && (
                        <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">
                          {slot.remaining} left
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-base font-medium">Payment</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="paymentMethod" value="CASH_ON_DELIVERY" defaultChecked />
            Cash on delivery
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input type="radio" name="paymentMethod" value="ONLINE" disabled />
            Pay online — added in module 14
          </label>
        </fieldset>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="mb-3 text-sm font-medium">
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
          </h2>
          <ul className="space-y-2 text-sm">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">
                  {line.productName} × {line.quantity}
                </span>
                <span className="shrink-0">{formatPaise(line.linePaise)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1 border-t border-gray-200 pt-3 text-sm dark:border-gray-800">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal</dt>
              <dd>{formatPaise(cart.totals.subtotalPaise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Delivery</dt>
              <dd>
                {cart.totals.deliveryPaise === 0
                  ? "Free"
                  : formatPaise(cart.totals.deliveryPaise)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold dark:border-gray-800">
              <dt>Total</dt>
              <dd>{formatPaise(cart.totals.totalPaise)}</dd>
            </div>
          </dl>
        </div>

        <button
          type="submit"
          disabled={pending || bookable.length === 0}
          className="w-full rounded bg-green-700 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Placing your order…" : "Place order"}
        </button>

        <p className="text-xs text-gray-500">
          You will be charged {formatPaise(cart.totals.totalPaise)} on delivery.
          Prices are the current ones — if something changed since you added it,
          the cart already shows the new price.
        </p>
      </aside>
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
        {!input.required && <span className="ml-1 text-gray-400">(optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        // Tied to the input, so a screen reader reads the hint as part of the
        // field rather than as loose text somewhere nearby.
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
