import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@kirana/shared";

import { Price } from "./price";

export function ProductCard({ product }: { product: ProductSummary }) {
  const variant = product.cheapestVariant;

  return (
    <article className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <Link href={`/products/${product.slug}`} className="group">
        <div className="relative mb-3 aspect-square overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              // Without `sizes` Next assumes the image fills the viewport and
              // serves a 1920px file into a 200px box on a phone.
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
              className="object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl text-gray-400">
              {product.name.slice(0, 1)}
            </div>
          )}

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
