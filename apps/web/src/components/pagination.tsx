import Link from "next/link";
import type { Paginated } from "@kirana/shared";

import type { RawSearchParams } from "@/lib/search-params";

export function Pagination<T>({
  result,
  params,
}: {
  result: Paginated<T>;
  params: RawSearchParams;
}) {
  if (result.totalPages <= 1) return null;

  const href = (page: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      // Keep every other filter, including repeated keys.
      for (const one of Array.isArray(value) ? value : [value]) {
        next.append(key, one);
      }
    }
    if (page > 1) next.set("page", String(page));
    const encoded = next.toString();
    return encoded ? `/products?${encoded}` : "/products";
  };

  const button =
    "rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      {result.hasPrevious ? (
        <Link href={href(result.page - 1)} className={button} rel="prev">
          Previous
        </Link>
      ) : (
        <span className={`${button} opacity-40`}>Previous</span>
      )}

      <span className="text-sm text-gray-500">
        Page {result.page} of {result.totalPages}
      </span>

      {result.hasNext ? (
        <Link href={href(result.page + 1)} className={button} rel="next">
          Next
        </Link>
      ) : (
        <span className={`${button} opacity-40`}>Next</span>
      )}
    </nav>
  );
}
