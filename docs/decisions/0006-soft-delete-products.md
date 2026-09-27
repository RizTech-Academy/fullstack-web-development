# 0006 — Products and variants are deactivated, never deleted

**Status:** accepted · 2026-09-27

## Context

The shop stops selling a product. A real `DELETE` is the obvious move and it is
wrong here, for three reasons.

Orders reference variants for reporting. Deleting a variant either breaks that
reference or cascades into the order history, and an order that loses its lines
is an accounting problem, not a data-modelling one.

Prices and catalogues are seasonal. Tomatoes come off the list in the monsoon
and back in October. Re-creating the product gives it a new id, so every report
that grouped by product sees two products.

Somebody will do it by mistake. `isActive = false` is a checkbox away from being
undone; a delete is a restore from backup.

## Decision

`Product.isActive` and `Variant.isActive` are the only way anything leaves the
catalogue. Nothing in the API deletes either.

Every read filters on it, including nested reads:

```ts
where: { isActive: true, variants: { some: { isActive: true } } }
```

A product whose variants are all inactive must not appear, or the storefront
renders a card with no price.

## Consequences

- The filter is easy to forget, so it lives in one place per resource —
  `ProductsService.buildWhere` — and not in each controller.
- The tables grow forever. At one shop's scale that is nothing. At a thousand
  shops, an archive table would be worth having; a partial index on
  `isActive = true` comes first.
- `@@index([isActive, name])` exists because every catalogue query filters and
  sorts on exactly that pair.
