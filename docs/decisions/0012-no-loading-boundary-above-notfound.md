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

The storefront lives in a `(storefront)` route group with its own `loading.tsx`,
so the boundary covers `/` and nothing else.

`/products/[slug]` has **no loading boundary above it**. It makes one request,
so there is little to wait for, and a correct status code is worth more than a
skeleton.

## Consequences

- Any new route that can call `notFound()` must be checked the same way, with
  `curl -o /dev/null -w "%{http_code}"`. The rendered page is not the evidence;
  the status line is.
- A route that genuinely needs streaming *and* can 404 must decide the 404
  before it suspends — fetch the record above the boundary, and stream only the
  parts that cannot fail.
