import type { Prisma } from "@prisma/client";
import {
  CartIssueCode,
  cartTotals,
  type CartIssue,
  type CartLine,
  type CartView,
} from "@kirana/shared";

export type CartRow = Prisma.CartGetPayload<{
  include: {
    items: {
      include: { variant: { include: { product: true } } };
    };
  };
}>;

type CartItemRow = CartRow["items"][number];

function toLine(item: CartItemRow): CartLine {
  const { variant } = item;
  const { product } = variant;

  return {
    id: item.id,
    variantId: variant.id,
    productSlug: product.slug,
    productName: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    variantLabel: variant.label,
    unitPricePaise: variant.pricePaise,
    quantity: item.quantity,
    // Computed here, never stored. A stored line total is a number that can
    // disagree with the price beside it.
    linePaise: variant.pricePaise * item.quantity,
  };
}

function issueFor(item: CartItemRow): CartIssue | null {
  const { variant } = item;
  const label = `${variant.product.name} (${variant.label})`;

  if (!variant.isActive || !variant.product.isActive) {
    return {
      variantId: variant.id,
      code: CartIssueCode.UNAVAILABLE,
      available: 0,
      message: `${label} is no longer sold.`,
    };
  }

  if (variant.stock <= 0) {
    return {
      variantId: variant.id,
      code: CartIssueCode.OUT_OF_STOCK,
      available: 0,
      message: `${label} has just gone out of stock.`,
    };
  }

  if (variant.stock < item.quantity) {
    return {
      variantId: variant.id,
      code: CartIssueCode.REDUCED_STOCK,
      available: variant.stock,
      // Say the number here. "Only 3 left" is actionable; "not enough stock"
      // makes the customer guess.
      message: `Only ${variant.stock} of ${label} left.`,
    };
  }

  return null;
}

export function toCartView(row: CartRow | null): CartView {
  const items = row?.items ?? [];

  // Oldest first, so the cart does not reshuffle every time a quantity changes.
  const ordered = [...items].sort(
    (a, b) => a.addedAt.getTime() - b.addedAt.getTime(),
  );

  const lines = ordered.map(toLine);
  const issues = ordered
    .map(issueFor)
    .filter((issue): issue is CartIssue => issue !== null);

  return {
    id: row?.id ?? null,
    lines,
    totals: cartTotals(lines),
    issues,
    // Distinct products, not units. "3" next to the basket meaning three
    // kilograms of one thing reads as a bug.
    itemCount: lines.length,
  };
}
