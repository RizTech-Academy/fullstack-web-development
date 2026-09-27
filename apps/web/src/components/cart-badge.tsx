import Link from "next/link";

import { fetchCart } from "@/lib/cart";

export async function CartBadge() {
  const cart = await fetchCart();

  return (
    <Link
      href="/cart"
      className="relative text-sm font-medium"
      // Without this the link announces as "Cart1", because the count sits in
      // an adjacent span and nothing separates them. An explicit label says
      // what the number means.
      aria-label={
        cart.itemCount === 0
          ? "Cart, empty"
          : `Cart, ${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}`
      }
    >
      Cart
      {cart.itemCount > 0 && (
        <span
          aria-hidden="true"
          className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-700 px-1.5 text-xs font-semibold text-white"
        >
          {cart.itemCount}
        </span>
      )}
    </Link>
  );
}
