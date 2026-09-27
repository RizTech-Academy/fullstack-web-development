import Image from "next/image";

/**
 * A product picture, or a readable placeholder when there is none.
 *
 * Two things here are deliberate.
 *
 * **The images live in this repository**, under `public/product-images/`, not
 * on somebody else's server. A hotlinked image rots: the host rate-limits you, or
 * moves the file, or starts serving something else entirely, and a storefront
 * whose pictures have vanished looks broken in a way that is very hard to
 * debug from the code.
 *
 * The folder is `product-images` rather than `products` because everything in
 * `public/` is served from the root: `public/products/tomato.svg` would live
 * inside the `/products/[slug]` route's namespace and shadow any product whose
 * slug happened to collide with a file name.
 *
 * **SVG bypasses the image optimiser.** Next refuses to optimise SVG unless you
 * set `dangerouslyAllowSVG`, and it is right to: an SVG is a document that can
 * contain script, so optimising one you did not write is a way to serve
 * somebody else's JavaScript from your own domain. `unoptimized` sidesteps the
 * question — the file is served as it is — and there is nothing to optimise in
 * a 1 KB flat illustration anyway. A real photograph is a different matter, and
 * goes through the optimiser like everything else.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  fallback,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Shown when there is no image. Usually the first letter of the name. */
  fallback: string;
}) {
  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-3xl text-gray-400">
        {fallback}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      // Without `sizes` Next assumes the image fills the viewport and serves a
      // 1920px file into a 200px box on a phone.
      sizes={sizes}
      priority={priority}
      unoptimized={src.endsWith(".svg")}
      className="object-cover"
    />
  );
}
