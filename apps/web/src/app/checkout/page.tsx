import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DELIVERY_PINCODES } from "@kirana/shared";

import { CheckoutForm } from "@/components/checkout-form";
import { fetchCart, fetchCurrentUser, fetchDeliveryDays } from "@/lib/cart";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const user = await fetchCurrentUser();

  // Checked on the server, before anything renders. A client-side guard here
  // would flash the form and, more importantly, would not stop anybody.
  if (!user) redirect("/account/login?next=%2Fcheckout");

  const [cart, days] = await Promise.all([fetchCart(), fetchDeliveryDays()]);

  if (cart.lines.length === 0) redirect("/cart");
  // Checking out a cart with problems would fail at the API anyway. Sending
  // them back to the cart, where the problems are explained, is kinder than
  // showing the error on a form they cannot fix from.
  if (cart.issues.length > 0) redirect("/cart");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Checkout</h1>
      <CheckoutForm
        cart={cart}
        days={days}
        user={user}
        pincodes={[...DELIVERY_PINCODES]}
      />
    </div>
  );
}
