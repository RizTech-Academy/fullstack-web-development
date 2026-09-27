# 0014 — An order's status is a state machine, written down once

**Status:** accepted · 2026-09-27

## Context

`Order.status` is an enum with six values. An enum column with no rules beside
it drifts within a month: one endpoint sets `DELIVERED` on an order that was
cancelled, another lets a `PENDING_PAYMENT` order skip straight to `PACKED`, and
each is defensible on its own.

The rules also have to exist in two places — the API enforces them, and the
shop's admin screen has to decide which buttons to show. Two copies of a rule is
one copy and one bug waiting.

## Decision

The allowed moves live in `packages/shared/src/order.ts`, as data:

```ts
export const ORDER_STATUS_FLOW: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PLACED", "CANCELLED"],
  PLACED: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
} as const;
```

`OrdersService.setStatus` is the only code that writes the column, and it checks
`canTransition` before it does. The admin screen renders one button per entry in
`ORDER_STATUS_FLOW[order.status]`, so the interface cannot offer a move the API
would refuse.

A **customer** may cancel a narrower set — `PENDING_PAYMENT` and `PLACED` only.
Once it is on a scooter, turning the delivery person around is a phone call, not
a button.

Every change appends an `OrderEvent` in the same transaction. The `status`
column is where the order is now; the events are how it got there, and that is
the question that always gets asked about the one order that went wrong.

## Consequences

- Cancelling must give the stock back and free the delivery place. Both are
  conditional updates — `increment` for stock, and `decrement` guarded by
  `booked > 0` so a double cancellation cannot invent capacity.
- Terminal statuses are an empty array, which is the whole of "you cannot
  un-deliver an order". No extra check is needed.
- Adding a status means editing one object. Anything that forgets to handle it
  fails to compile, because the `Record<OrderStatus, …>` must be exhaustive.
