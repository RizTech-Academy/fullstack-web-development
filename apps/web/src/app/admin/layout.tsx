import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { fetchCurrentUser } from "@/lib/cart";

/**
 * The guard for the whole admin area, in the layout so no page below can be
 * added without it.
 *
 * This is convenience, not security. The API checks the role on every request,
 * because anybody can ask the API directly and a front end has no authority
 * over anything. If this file were deleted, the admin pages would render empty
 * and every call behind them would 403.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await fetchCurrentUser();

  if (!user) redirect("/account/login?next=%2Fadmin");
  // 404, not a redirect. A signed-in customer who wanders here learns nothing
  // about whether an admin area exists.
  if (user.role !== "ADMIN") notFound();

  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b border-gray-200 pb-3 text-sm dark:border-gray-800">
        <Link href="/admin" className="font-medium">
          Orders
        </Link>
        <Link href="/admin/inventory" className="font-medium">
          Inventory
        </Link>
        <Link href="/products" className="ml-auto text-gray-500">
          Back to the shop
        </Link>
      </nav>
      {children}
    </div>
  );
}
