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
