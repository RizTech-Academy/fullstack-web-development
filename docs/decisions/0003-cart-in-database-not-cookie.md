# 3. Cart in the database, not a cookie

Date: 2026-09-27
Status: Accepted

## Context

The brief says a cart must survive closing the browser. A customer browsing on
a phone and ordering on a laptop is normal.

## Decision

Store carts in the database. A signed-in cart is keyed by `userId`; a
signed-out cart is keyed by a `sessionId` held in a cookie. On sign-in, merge
the session cart into the user's cart.

A `@@unique([cartId, variantId])` constraint means adding the same variant twice
increases the quantity rather than creating a second line.

**No price is stored on a cart item.** The cart displays the current price.

## Consequences

**Good**

- The cart survives closing the browser and moving between devices.
- The shop can see abandoned carts, which is commercially useful.
- Quantity handling is enforced by the database rather than remembered in code.

**Bad**

- A database write on every cart change, rather than a cookie update.
- Signed-out carts accumulate and need periodic cleanup.
- The sign-in merge is genuinely fiddly: the same variant may be in both carts,
  and quantities must combine without exceeding `MAX_CART_QUANTITY`.

## Alternatives considered

**Cookie or localStorage.** Rejected: per-device, size-limited, and it would
mean trusting the client about what is in the cart.

**Store the price on the cart item.** Rejected: it would be stale, and it
contradicts decision 0009.
