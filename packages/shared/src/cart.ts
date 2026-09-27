import { DELIVERY_CHARGE_PAISE, FREE_DELIVERY_THRESHOLD_PAISE } from "./constants";
import type { Paise } from "./money";

export interface CartLine {
  /** The cart item's own id, which is what the API takes for an update. */
  id: string;
  variantId: string;
  productSlug: string;
  productName: string;
  brand: string | null;
  imageUrl: string | null;
  variantLabel: string;
  /** The price now, not the price when it was added — see decision 0009. */
  unitPricePaise: Paise;
  quantity: number;
  linePaise: Paise;
}

export const CartIssueCode = {
  /** Nothing left. The line cannot be ordered at all. */
  OUT_OF_STOCK: "OUT_OF_STOCK",
  /** Some left, but fewer than the cart asks for. */
  REDUCED_STOCK: "REDUCED_STOCK",
  /** No longer for sale: the variant or its product was deactivated. */
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type CartIssueCode = (typeof CartIssueCode)[keyof typeof CartIssueCode];

export interface CartIssue {
  variantId: string;
  code: CartIssueCode;
  /** How many can actually be ordered. Zero for OUT_OF_STOCK. */
  available: number;
  message: string;
}

export interface CartTotals {
  subtotalPaise: Paise;
  deliveryPaise: Paise;
  totalPaise: Paise;
  /**
   * How much more is needed for free delivery, or null once it is reached.
   * The API computes it so the front end cannot promise a different number.
   */
  freeDeliveryShortfallPaise: Paise | null;
}

export interface CartView {
  /** Null when nothing has been added yet — no row is created for a look. */
  id: string | null;
  lines: CartLine[];
  totals: CartTotals;
  /** Empty means the cart can go to checkout as it stands. */
  issues: CartIssue[];
  itemCount: number;
}

export function deliveryChargeFor(subtotalPaise: Paise): Paise {
  // An empty cart has no delivery charge, which is not the same as free
  // delivery. Without this line an empty cart shows "₹40 delivery".
  if (subtotalPaise <= 0) return 0;
  return subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE ? 0 : DELIVERY_CHARGE_PAISE;
}

/**
 * One implementation, imported by both halves.
 *
 * The front end shows these numbers and the API charges them. Two
 * implementations drift, and the day they disagree the customer sees one total
 * and is billed another — which is the kind of bug that ends in a refund and a
 * bad review rather than a stack trace.
 */
export function cartTotals(lines: Pick<CartLine, "linePaise">[]): CartTotals {
  const subtotalPaise = lines.reduce((sum, line) => sum + line.linePaise, 0);
  const deliveryPaise = deliveryChargeFor(subtotalPaise);
  const shortfall = FREE_DELIVERY_THRESHOLD_PAISE - subtotalPaise;

  return {
    subtotalPaise,
    deliveryPaise,
    totalPaise: subtotalPaise + deliveryPaise,
    freeDeliveryShortfallPaise:
      subtotalPaise > 0 && shortfall > 0 ? shortfall : null,
  };
}

export const EMPTY_CART: CartView = {
  id: null,
  lines: [],
  totals: cartTotals([]),
  issues: [],
  itemCount: 0,
};
