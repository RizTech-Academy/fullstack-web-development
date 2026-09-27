import { CategoryNav } from "@/components/category-nav";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { fetchCategories, fetchProducts } from "@/lib/api";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";

// A promise in Next 15, so it must be awaited before anything reads a key.
type SearchParams = Promise<RawSearchParams>;

export default async function StorefrontPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

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
      <SearchForm params={params} />
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
