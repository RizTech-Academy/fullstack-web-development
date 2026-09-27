/**
 * Scoped to the storefront by the `(storefront)` route group, deliberately.
 *
 * A `loading.tsx` wraps everything below it in a Suspense boundary. When a
 * page suspends, Next flushes the fallback — and with it the HTTP response
 * headers, status 200. If a page further down then calls `notFound()`, the
 * not-found page renders but the status has already gone out as 200.
 *
 * That is a soft 404: Google indexes it as a real page. Putting this file at
 * `src/app/loading.tsx` did exactly that to `/products/[slug]`, and the route
 * group is what fixes it. See docs/decisions/0012.
 */
export default function Loading() {
  // Matches the grid it replaces, so the page does not jump when data arrives.
  return (
    <div className="space-y-6">
      <div className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>
    </div>
  );
}
