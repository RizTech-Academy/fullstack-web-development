import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryNav } from "@/components/category-nav";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/product-grid-skeleton";
import { SearchForm } from "@/components/search-form";
import { fetchCategories, fetchProducts } from "@/lib/api";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Groceries delivered in Pune",
  description:
    "Atta, dal, fresh vegetables, dairy and household essentials delivered from your neighbourhood kirana shop.",
};

// A promise in Next 15, so it must be awaited before anything reads a key.
type SearchParams = Promise<RawSearchParams>;

/**
 * Note what is **not** here: a `loading.tsx`.
 *
 * `loading.tsx` wraps the whole segment *and everything below it*, including
 * `products/[slug]`. That route calls `notFound()`, and a flushed Suspense
 * fallback sends the 200 status line before it can — every missing product
 * became a soft 404. A `<Suspense>` written inside this page wraps only this
 * page's own content, which is the distinction that matters. See decision 0012.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <SearchForm params={params} />

      <Suspense fallback={<ProductGridSkeleton />} key={JSON.stringify(params)}>
        {/* Keyed on the search params, so changing a filter shows the skeleton
            again rather than the previous results sitting there looking live. */}
        <Catalogue params={params} />
      </Suspense>
    </div>
  );
}

async function Catalogue({ params }: { params: RawSearchParams }) {
  const query = {
    q: readString(params, "q"),
    category: readString(params, "category"),
    sort: readString(params, "sort"),
    page: readPage(params),
  };

  // Both requests start before either is awaited. Awaiting the first on its
  // own line would make the page as slow as the two added together.
  const [products, categories] = await Promise.all([
    fetchProducts(query),
    fetchCategories(),
  ]);

  return (
    <div className="space-y-6">
      <CategoryNav categories={categories} params={params} />

      <p className="text-sm text-gray-500">
        {products.total === 0
          ? "Nothing matched."
          : `${products.total} product${products.total === 1 ? "" : "s"}`}
      </p>

      {products.items.length === 0 ? (
        <EmptyState query={query.q} />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      <Pagination result={products} params={params} />
    </div>
  );
}

function EmptyState({ query }: { query?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
      <p className="font-medium">
        {query ? `No results for "${query}".` : "No products here yet."}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Try a shorter word — searching for &quot;dal&quot; finds more than
        &quot;toor dal 1kg&quot;.
      </p>
    </div>
  );
}
