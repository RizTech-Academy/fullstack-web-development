import type { Prisma } from "@prisma/client";
import type {
  ProductDetail,
  ProductSummary,
  VariantSummary,
} from "@kirana/shared";

type VariantRow = Prisma.VariantGetPayload<object>;

export type ProductRow = Prisma.ProductGetPayload<{
  include: { category: true; variants: true };
}>;

function toVariant(row: VariantRow): VariantSummary {
  return {
    id: row.id,
    sku: row.sku,
    label: row.label,
    unit: row.unit,
    // Prisma returns Decimal for this column, which is an object rather than
    // a number and does not survive JSON as one.
    quantity: Number(row.quantity),
    pricePaise: row.pricePaise,
    mrpPaise: row.mrpPaise,
    // Never expose the count. The client only needs to know whether to enable
    // the button — see docs/decisions and the module 7 lesson.
    inStock: row.stock > 0,
  };
}

function activeVariants(row: ProductRow): VariantRow[] {
  return row.variants
    .filter((v) => v.isActive)
    .sort((a, b) => a.pricePaise - b.pricePaise);
}

export function toProductSummary(row: ProductRow): ProductSummary {
  const variants = activeVariants(row);
  const cheapest = variants[0];

  if (!cheapest) {
    throw new Error(
      `Product ${row.slug} has no active variants and should have been filtered out`,
    );
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    imageUrl: row.imageUrl,
    category: { slug: row.category.slug, name: row.category.name },
    cheapestVariant: toVariant(cheapest),
  };
}

export function toProductDetail(row: ProductRow): ProductDetail {
  return {
    ...toProductSummary(row),
    description: row.description,
    variants: activeVariants(row).map(toVariant),
  };
}
