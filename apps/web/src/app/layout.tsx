import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  // %s is replaced by each page's own title, so no page repeats the shop name.
  title: { default: "Kirana Store — groceries delivered in Pune", template: "%s | Kirana Store" },
  description:
    "Atta, dal, fresh vegetables, dairy and household essentials delivered from your neighbourhood kirana shop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
