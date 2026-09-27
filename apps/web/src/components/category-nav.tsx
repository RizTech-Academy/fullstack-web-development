import Link from "next/link";
import type { CategoryOption } from "@kirana/shared";

import { readString, type RawSearchParams } from "@/lib/search-params";

/**
 * Links, not buttons. Each filter is a different URL, so the back button
 * works, the page can be shared, and the server can cache it.
 */
export function CategoryNav({
  categories,
  params,
}: {
  categories: CategoryOption[];
  params: RawSearchParams;
}) {
  const active = readString(params, "category");
  const q = readString(params, "q");

  const href = (slug?: string) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (slug) next.set("category", slug);
    const encoded = next.toString();
    return encoded ? `/products?${encoded}` : "/products";
  };

  const chip = (isActive: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${
      isActive
        ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
        : "border-gray-300 text-gray-700 hover:border-gray-500 dark:border-gray-700 dark:text-gray-300"
    }`;

  return (
    <nav aria-label="Categories" className="flex flex-wrap gap-2">
      <Link href={href()} className={chip(!active)}>
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={href(category.slug)}
          className={chip(active === category.slug)}
          aria-current={active === category.slug ? "page" : undefined}
        >
          {category.name}
          <span className="ml-1 text-xs opacity-70">{category.productCount}</span>
        </Link>
      ))}
    </nav>
  );
}
