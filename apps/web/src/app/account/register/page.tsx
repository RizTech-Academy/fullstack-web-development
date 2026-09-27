import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { fetchCurrentUser } from "@/lib/cart";
import { safeNextParam } from "@/lib/next-param";
import type { RawSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [params, user] = await Promise.all([searchParams, fetchCurrentUser()]);
  const next = safeNextParam(params.next);

  if (user) redirect(next);

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-center text-xl font-semibold">Create an account</h1>
      <p className="text-center text-sm text-gray-500">
        Whatever is in your cart stays there.
      </p>
      <AuthForm mode="register" next={next} />
    </div>
  );
}
