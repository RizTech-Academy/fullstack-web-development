# 0012 — No loading boundary above a route that can 404

**Status:** accepted · 2026-09-27

## Context

`src/app/loading.tsx` gave the whole application a skeleton while data loaded,
which is the documented way to do it.

It also turned every missing product into a **soft 404**:

    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/products/nope
    200

The not-found page rendered correctly. The status line said the request had
succeeded.

`loading.tsx` wraps everything below it in a Suspense boundary. When the page
suspends, Next streams the fallback — and an HTTP response cannot send its
status after the body has started. By the time `notFound()` runs, `200 OK` has
already left the building.

A soft 404 is not cosmetic. Google treats it as a real page, indexes it, and the
storefront accumulates thousands of URLs that look like products and are not.

## Decision

**No `loading.tsx` anywhere above a route that can call `notFound()`.**

The listing still streams, using a `<Suspense>` written *inside*
`(shop)/products/page.tsx`. That is the distinction that matters:

| | what it wraps |
|---|---|
| `loading.tsx` in a segment | that segment **and every route below it** |
| `<Suspense>` inside a page | only that page's own content |

`(shop)/products/loading.tsx` therefore covered `(shop)/products/[slug]` too,
which is how the product page lost its status code. The `<Suspense>` inside the
listing page does not reach the detail route at all, so both stream and both
answer correctly.

`error.tsx` is fine to keep: it swaps in content after something has thrown, and
does not flush the response early.

## Consequences

- Any new route that can call `notFound()` must be checked the same way, with
  `curl -o /dev/null -w "%{http_code}"`. The rendered page is not the evidence;
  the status line is.
- A route that genuinely needs streaming *and* can 404 must decide the 404
  before it suspends — fetch the record above the boundary, and stream only the
  parts that cannot fail.
- The `<Suspense>` in the listing is keyed on the search params, so changing a
  filter shows the skeleton again instead of leaving stale results on screen.
