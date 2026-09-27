import Link from "next/link";
import type { ProductSummary } from "@kirana/shared";

import { Price } from "./price";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: ProductSummary }) {
  const variant = product.cheapestVariant;

  return (
    <article className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <Link href={`/products/${product.slug}`} className="group">
        <div className="relative mb-3 aspect-square overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
          <ProductImage
            src={product.imageUrl}
            // Empty alt, not the product name. The name is the heading right
            // below, and a screen reader reading it twice is noise.
            alt=""
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            fallback={product.name.slice(0, 1)}
          />

          {!variant.inStock && (
            <span className="absolute left-2 top-2 rounded bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-white">
              Out of stock
            </span>
          )}
        </div>

        {product.brand && (
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {product.brand}
          </p>
        )}
        <h3 className="text-sm font-medium group-hover:underline">{product.name}</h3>
        <p className="mb-2 text-xs text-gray-500">{variant.label}</p>
      </Link>

      <div className="mt-auto">
        <Price variant={variant} />
      </div>
    </article>
  );
}
