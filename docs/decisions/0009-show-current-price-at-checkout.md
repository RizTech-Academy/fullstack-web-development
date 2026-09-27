# 9. Show the current price at checkout, and say it changed

Date: 2026-09-27
Status: Accepted

## Context

A customer adds atta at ₹285. The owner raises it to ₹295. The customer checks
out an hour later. Which price applies?

## Decision

Charge the **current** price, and tell the customer explicitly at checkout that
a price has changed, showing the old and new values, before they pay.

## Consequences

**Good**

- No stale-cart loss: a cart held for three weeks cannot commit the shop to an
  old price.
- No surprise on the receipt, because the change is stated before payment.
- Nothing extra is stored on the cart item.

**Bad**

- The checkout total can change under the customer, so the interface must
  handle it deliberately rather than re-render silently.
- A price rise between the checkout page loading and the order being placed is
  still possible. The order is placed at the price shown on the confirmation
  step, and the window is seconds.

## Alternatives considered

**Honour the price when added.** Customer-friendly, and it makes a long-held
cart a guaranteed loss. It would also require storing a price on the cart item,
contradicting decision 0003.

**Charge the new price silently.** Simplest, and it generates complaints and
chargebacks. Rejected on those grounds alone.
