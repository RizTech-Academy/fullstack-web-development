import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductImage } from "@/components/product-image";
import { VariantPicker } from "@/components/variant-picker";
import { ApiError, fetchProduct } from "@/lib/api";

type Params = Promise<{ slug: string }>;

/**
 * Note what is *not* here: a `loading.tsx`.
 *
 * A loading boundary above this route flushes the response — status and all —
 * before the page decides whether the product exists, so `notFound()` renders
 * the right page with a 200 status. See docs/decisions/0012.
 */

async function load(slug: string) {
  try {
    return await fetchProduct(slug);
  } catch (error) {
    // A missing product is a 404 page, not a crash. Anything else is a real
    // failure and must keep bubbling, or a broken API looks like an empty shop.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await load(slug);

  if (!product) return { title: "Product not found" };

  return {
    title: product.name,
    description:
      product.description ??
      `Buy ${product.name} online and have it delivered from your neighbourhood kirana shop.`,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await load(slug);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/" className="underline">
          Shop
        </Link>
        {" / "}
        <Link href={`/?category=${product.category.slug}`} className="underline">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            sizes="(max-width: 768px) 100vw, 480px"
            // The largest thing on the page and the reason somebody opened it,
            // so it is loaded eagerly rather than waiting its turn.
            priority
            fallback={product.name.slice(0, 1)}
          />
        </div>

        <div>
          {product.brand && (
            <p className="text-sm uppercase tracking-wide text-gray-500">
              {product.brand}
            </p>
          )}
          <h1 className="text-2xl font-semibold">{product.name}</h1>

          {product.description && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {product.description}
            </p>
          )}

          <div className="mt-6">
            <VariantPicker variants={product.variants} />
          </div>
        </div>
      </div>
    </div>
  );
}
