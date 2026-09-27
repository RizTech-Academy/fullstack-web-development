import Link from "next/link";
import { Suspense } from "react";

import { logout } from "@/app/actions/auth";
import { CartBadge } from "@/components/cart-badge";
import { fetchCurrentUser } from "@/lib/cart";

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/products" className="text-lg font-semibold">
          Kirana Store
        </Link>

        <nav className="flex items-center gap-4">
          {/*
            Each of these reads a cookie, so each is dynamic. Wrapping them
            individually means the shell — and the catalogue below it — is still
            sent immediately instead of waiting on the API.
          */}
          <Suspense fallback={<span className="text-sm text-gray-400">Account</span>}>
            <AccountMenu />
          </Suspense>
          <Suspense fallback={<span className="text-sm text-gray-400">Cart</span>}>
            <CartBadge />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function AccountMenu() {
  const user = await fetchCurrentUser();

  if (!user) {
    return (
      <Link href="/account/login" className="text-sm font-medium">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-gray-500 sm:inline">
        {user.name.split(" ")[0]}
      </span>
      {/* A form, because signing out changes state and must not be a GET link
          that a prefetch or an image loader could trigger by itself. */}
      <form action={logout}>
        <button type="submit" className="text-sm underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
