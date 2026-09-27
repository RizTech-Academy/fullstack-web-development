/**
 * A layout for the shop pages, and a route group so it does not wrap the
 * account, checkout or order pages.
 *
 * `(shop)` is in brackets, so it groups files without appearing in the URL:
 * `(shop)/products/page.tsx` is still `/products`.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="space-y-6">{children}</div>;
}
