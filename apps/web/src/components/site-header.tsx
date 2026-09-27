import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold">
          Kirana Store
        </Link>
        <p className="hidden text-sm text-gray-500 sm:block">
          Delivering in Pune — 412207, 411014, 411028
        </p>
      </div>
    </header>
  );
}
