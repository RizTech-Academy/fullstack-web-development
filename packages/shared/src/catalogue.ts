import type { Paise } from "./money";

export type Unit =
  | "GRAM"
  | "KILOGRAM"
  | "MILLILITRE"
  | "LITRE"
  | "PIECE"
  | "PACKET";

export interface CategorySummary {
  slug: string;
  name: string;
}

export interface VariantSummary {
  id: string;
  sku: string;
  label: string;
  unit: Unit;
  /** In the smallest sensible unit: grams, millilitres or pieces. */
  quantity: number;
  pricePaise: Paise;
  mrpPaise: Paise | null;
  /**
   * Deliberately a boolean rather than the count. The exact stock level is
   * commercial information, and the client only needs to know whether to
   * enable the button.
   */
  inStock: boolean;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  category: CategorySummary;
  cheapestVariant: VariantSummary;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  variants: VariantSummary[];
}

export interface CategoryOption {
  slug: string;
  name: string;
  productCount: number;
}

/**
 * Price per kilogram, litre or piece, so a customer can compare pack sizes.
 *
 * Only correct because every variant stores its quantity in the smallest
 * sensible unit. Mixing grams and kilograms across products would make this
 * silently wrong.
 */
export function pricePerUnit(variant: {
  pricePaise: Paise;
  quantity: number;
  unit: Unit;
}): { paise: Paise; unit: string } | null {
  if (variant.quantity <= 0) return null;

  switch (variant.unit) {
    case "GRAM":
      return { paise: Math.round((variant.pricePaise / variant.quantity) * 1000), unit: "kg" };
    case "MILLILITRE":
      return { paise: Math.round((variant.pricePaise / variant.quantity) * 1000), unit: "L" };
    case "PIECE":
      return { paise: Math.round(variant.pricePaise / variant.quantity), unit: "piece" };
    default:
      return null;
  }
}
