import type { Metadata } from "next";
import Link from "next/link";
import { formatPaise, FREE_DELIVERY_THRESHOLD_PAISE, type CartIssue } from "@kirana/shared";

import { ProductImage } from "@/components/product-image";
import { QuantityStepper } from "@/components/quantity-stepper";
import { fetchCart, fetchCurrentUser } from "@/lib/cart";

export const metadata: Metadata = {
  title: "Your cart",
  // Nothing personal should ever be indexed.
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const [cart, user] = await Promise.all([fetchCart(), fetchCurrentUser()]);

  if (cart.lines.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-xl font-semibold">Your cart is empty.</h1>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Start shopping
        </Link>
      </div>
    );
  }

  const issueFor = new Map(cart.issues.map((issue) => [issue.variantId, issue]));
  const blocking = cart.issues.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Your cart</h1>

      {blocking && (
        <div
          role="alert"
          className="rounded border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950"
        >
          <p className="font-medium">Some items need attention before checkout.</p>
          <ul className="mt-1 list-inside list-disc">
            {cart.issues.map((issue) => (
              <li key={issue.variantId}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {cart.lines.map((line) => {
          const issue = issueFor.get(line.variantId);

          return (
            <li key={line.id} className="flex gap-4 py-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                <ProductImage
                  src={line.imageUrl}
                  alt=""
                  sizes="80px"
                  fallback={line.productName.slice(0, 1)}
                />
              </div>

              <div className="min-w-0 flex-1">
                <Link href={`/products/${line.productSlug}`} className="font-medium hover:underline">
                  {line.productName}
                </Link>
                <p className="text-sm text-gray-500">
                  {line.variantLabel} · {formatPaise(line.unitPricePaise)} each
                </p>

                {issue && (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                    {issue.message}
                  </p>
                )}

                <div className="mt-2">
                  <QuantityStepper
                    variantId={line.variantId}
                    quantity={line.quantity}
                    // The cap is what the shop actually has when there is a
                    // problem, and the per-item limit otherwise.
                    max={issue ? issue.available : 50}
                  />
                </div>
              </div>

              <p className="shrink-0 font-medium">{formatPaise(line.linePaise)}</p>
            </li>
          );
        })}
      </ul>

      <Totals cart={cart} />

      {blocking ? (
        <p className="text-sm text-gray-500">
          Fix the items above and the checkout button will come back.
        </p>
      ) : (
        <Link
          href={user ? "/checkout" : "/account/login?next=%2Fcheckout"}
          className="block rounded bg-green-700 px-4 py-3 text-center font-medium text-white"
        >
          {user ? "Checkout" : "Sign in to check out"}
        </Link>
      )}
    </div>
  );
}

function Totals({ cart }: { cart: Awaited<ReturnType<typeof fetchCart>> }) {
  const { totals } = cart;

  return (
    <dl className="space-y-1 border-t border-gray-200 pt-4 text-sm dark:border-gray-800">
      <Row label="Subtotal" value={formatPaise(totals.subtotalPaise)} />
      <Row
        label="Delivery"
        value={totals.deliveryPaise === 0 ? "Free" : formatPaise(totals.deliveryPaise)}
      />
      {totals.freeDeliveryShortfallPaise !== null && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Add {formatPaise(totals.freeDeliveryShortfallPaise)} more for free delivery
          (over {formatPaise(FREE_DELIVERY_THRESHOLD_PAISE)}).
        </p>
      )}
      <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold dark:border-gray-800">
        <dt>Total</dt>
        <dd>{formatPaise(totals.totalPaise)}</dd>
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// Referenced so the import is not flagged as unused when the type is only used
// in a signature above.
export type { CartIssue };
