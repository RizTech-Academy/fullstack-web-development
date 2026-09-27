# 2. Snapshot product details on order items

Date: 2026-09-27
Status: Accepted

## Context

An order item needs to show the product name, variant label and price paid.
Either reference the variant and read through it, or copy the values onto the
order item when the order is placed.

Products change. Names get corrected, prices rise, variants are discontinued.

## Decision

Copy `productName`, `variantLabel`, `sku` and `unitPricePaise` onto each order
item when the order is placed. Also copy the delivery address and slot label
onto the order.

Keep `variantId` as an **optional** link for reporting only. Nothing that
renders an order reads through it, and it must never cascade on delete.

## Consequences

**Good**

- An invoice always shows what the customer actually paid and ordered.
- Renaming, repricing or deactivating a product cannot alter history.
- Deleting a variant cannot orphan or corrupt an order.

**Bad**

- The data is duplicated, and an order item's name can differ from the current
  product name. This is correct and looks wrong at first glance, which is why
  this record exists.
- A typo corrected in a product name is not corrected on past orders. Intended.
- "Sales by product" reporting must join on `variantId`, which may be null.

## Alternatives considered

**Reference the live variant.** Rejected: an order's total would change when a
price changed. That is a commercial and legal problem, not untidiness.

**Store a JSON blob of the variant.** Rejected: harder to query, no better than
explicit columns.
