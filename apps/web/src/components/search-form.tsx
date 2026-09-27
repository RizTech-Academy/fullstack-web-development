import { readString, type RawSearchParams } from "@/lib/search-params";

/**
 * A plain form, not a client component with `onChange`.
 *
 * `method="get"` puts the query in the URL, which means the result is
 * shareable, survives a refresh, and works with JavaScript disabled or still
 * loading on a slow connection. Debounced search-as-you-type is a genuine
 * improvement on top of this, not a replacement for it.
 */
export function SearchForm({ params }: { params: RawSearchParams }) {
  const q = readString(params, "q") ?? "";
  const category = readString(params, "category");
  const sort = readString(params, "sort");

  return (
    <form action="/products" method="get" className="flex gap-2">
      {/* Submitting resets to page 1, which is what a new search should do. */}
      {category && <input type="hidden" name="category" value={category} />}
      {sort && <input type="hidden" name="sort" value={sort} />}

      <label htmlFor="q" className="sr-only">
        Search products
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Atta, dal, milk…"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
      >
        Search
      </button>
    </form>
  );
}
