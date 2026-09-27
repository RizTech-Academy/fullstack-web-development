import { redirect } from "next/navigation";

/**
 * The shop is at /products, not at /.
 *
 * A grocery site's front page eventually becomes offers, repeat orders and
 * "buy again" — none of which is the catalogue. Keeping the catalogue on its
 * own route from the start means that page can be built later without a
 * rewrite, and without breaking every link somebody has shared.
 */
export default function Home() {
  redirect("/products");
}
