# 0013 — Claim scarce things with a conditional UPDATE, never read-then-write

**Status:** accepted · 2026-09-27

## Context

Two things in this application are scarce: stock, and places in a delivery slot.

The obvious way to spend one is to read it, check there is enough, and write the
new value:

```ts
const variant = await tx.variant.findUnique({ where: { id } });
if (variant.stock < quantity) throw new Error("Not enough");
await tx.variant.update({ where: { id }, data: { stock: variant.stock - quantity } });
```

This is wrong, and it is wrong in the way that is hardest to notice: it works
every time you test it by hand. Two customers buying the last bag of atta at the
same moment both read `stock = 1`, both decide it is fine, and both subtract.
Stock ends at `-1` and one of them has an order the shop cannot fill.

A transaction does not fix it. `READ COMMITTED` — PostgreSQL's default, and
Prisma's — lets both reads see the same row. Raising the isolation level to
`SERIALIZABLE` does fix it, at the cost of failed transactions you then have to
retry, on every checkout, for a problem that has a cheaper answer.

## Decision

Put the condition in the `WHERE` clause and let the database do the check and
the write in one statement:

```ts
const claimed = await tx.variant.updateMany({
  where: { id, isActive: true, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (claimed.count === 0) throw AppException.insufficientStock(…);
```

The database takes a row lock for the duration of the statement, so the second
request waits, re-evaluates `stock >= quantity` against the updated row, matches
nothing, and gets `count: 0`. No read, no race, no retry loop.

Delivery slots use the same shape against `SlotBooking.booked`, which is why
that table exists: counting orders per slot would be a read-then-write again.

## Consequences

- `count === 0` is the only signal, so every call site must check it. A bare
  `await updateMany(...)` that ignores the result is a silent failure.
- The real number is not known when the claim fails. Reading it afterwards for
  the error message is safe, because the throw rolls the transaction back.
- `updateMany` is used for single rows, which reads oddly. `update` throws when
  nothing matches and cannot express a conditional write, so this is deliberate.
- Stock is decremented at **order placement**, not when something is added to a
  cart — see decision 0004. Nothing in the cart holds stock.
