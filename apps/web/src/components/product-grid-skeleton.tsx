/** Matches the real grid, so the page does not jump when the data arrives. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <li
          key={index}
          className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
        />
      ))}
    </ul>
  );
}
