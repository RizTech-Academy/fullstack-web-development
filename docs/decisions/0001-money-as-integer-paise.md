# 1. Money as integer paise

Date: 2026-09-27
Status: Accepted

## Context

Every JavaScript number is a double-precision float. `0.1 + 0.2` is
`0.30000000000000004`, and `1.005 * 100` is `100.49999999999999`. A shop that
adds up line totals in floats will eventually present a total that is a paisa
off, and an accounting system whose numbers drift is a real problem rather than
a cosmetic one.

## Decision

Store and calculate all money as an **integer count of paise**. ₹285.00 is
`28500`. Convert to rupees only at the moment of display, in one function.

Field names carry the unit: `pricePaise`, `totalPaise`, `unitPricePaise`. A
field called `price` is a bug waiting to happen because nobody can tell what it
holds.

## Consequences

**Good**

- All arithmetic is exact. No rounding drift, ever.
- The unit is impossible to misread at a call site.
- Conversion exists in exactly one place (`formatPaise`), so every price on the
  site is formatted identically.

**Bad**

- Every value must be converted for display, and forgetting gives a number a
  hundred times too large — which is at least obvious.
- Input from a human is in rupees and must be converted on the way in
  (`rupeesToPaise`), with rounding rather than truncation.
- Percentage discounts still need a rounding decision. We round to the nearest
  paisa.

## Alternatives considered

**Floats.** Rejected — the failure is silent and cumulative.

**`Decimal` (Prisma) / `NUMERIC` (Postgres).** Exact and correct, and rejected
because JavaScript has no native decimal type, so values arrive as strings or as
a library object that must be converted at every boundary. Integers are simpler
and equally exact for a currency with two decimal places.

**A money library.** More machinery than a single-currency shop needs.
