# 4. Decrement stock at order placement, not at add-to-cart

Date: 2026-09-27
Status: Accepted

## Context

Two customers, one packet of atta. Stock can be reduced when an item is added
to a cart (reserving it) or when an order is actually placed.

## Decision

Decrement at **order placement**, inside a transaction, using a conditional
update so the check and the write are one statement:

```
UPDATE variants SET stock = stock - :qty
WHERE id = :id AND stock >= :qty
```

Zero rows affected means insufficient stock, and the whole order is rolled back
with a 409 naming the item.

A `CHECK (stock >= 0)` constraint backs this up, so negative stock is impossible
regardless of what the code does.

## Consequences

**Good**

- The owner's stock number matches the physical shelf, which is what they
  expect.
- No background job to expire reservations, and no abandoned carts holding
  stock hostage.
- The race is closed by the database rather than by application logic.

**Bad**

- A customer can reach checkout and find an item unavailable. The interface
  must handle this well — naming the item and offering to remove it.
- A popular item during a rush is first-come-first-served at the moment of
  payment, not at the moment of adding.

## Alternatives considered

**Reserve at add-to-cart.** Rejected: abandoned carts would hold stock, the
owner's number would no longer match the shelf, and it needs expiry and a
background job.

**Row locking with `SELECT ... FOR UPDATE`.** Correct but slower, requests
queue, and it risks deadlock. The conditional update achieves the same with no
lock held.
