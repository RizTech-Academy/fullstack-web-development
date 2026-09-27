import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { fetchCurrentUser } from "@/lib/cart";
import { safeNextParam } from "@/lib/next-param";
import type { RawSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [params, user] = await Promise.all([searchParams, fetchCurrentUser()]);
  const next = safeNextParam(params.next);

  // Already signed in. Showing the form again would be confusing and would let
  // somebody sign in as a second person on top of the first.
  if (user) redirect(next);

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-center text-xl font-semibold">Sign in</h1>
      <AuthForm mode="login" next={next} />
    </div>
  );
}
