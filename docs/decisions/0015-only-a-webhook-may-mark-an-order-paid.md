# 0015 — Only a signed webhook may mark an order paid

**Status:** accepted · 2026-09-27

## Context

After a customer pays, the gateway sends the browser back to a success URL. It
is extremely tempting to treat arriving at that URL as proof of payment — it is
one line of code and it works every time you test it.

It is also a URL. Anybody can visit a URL. A customer who notices
`/checkout/success?order=KS-20260927-7F3K2A` can type it again with a different
order number, and the shop ships groceries it was never paid for.

Even without malice the redirect is unreliable. The customer closes the tab on
the bank's page. Their train goes into a tunnel. The app switches to the UPI
application and never comes back. In every one of those cases the money moved
and the browser never told anybody.

## Decision

`PaymentsService.handleWebhook` is the only code that may move an order out of
`PENDING_PAYMENT`. The browser's return journey is navigation, nothing more.

The webhook route has **no guard** — the gateway has no session — so the
signature is the entire security boundary:

```ts
if (!signature || !this.gateway.verify(rawBody, signature)) {
  throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, "Bad signature.");
}
```

Three things this depends on, and all three are easy to get wrong:

- **The raw bytes.** `NestFactory.create(AppModule, { rawBody: true })` keeps
  them on `request.rawBody`. A signature covers exactly what was sent, and
  `JSON.stringify` of a parsed body produces different bytes.
- **`timingSafeEqual`, not `===`.** String comparison returns at the first
  differing byte, so how long it takes leaks how much of the signature was
  right.
- **The amount is checked against our own record**, not trusted from the event.

## Consequences

- Webhooks arrive more than once. That is documented gateway behaviour, not a
  fault, so a repeat delivery must change nothing — the handler returns early
  unless the payment is still `PENDING`.
- A webhook for a payment we do not recognise returns **200**, not 404. A
  gateway that receives an error retries, and retrying will not make us
  recognise it.
- A `PENDING_PAYMENT` order holds stock it has not paid for, so unpaid orders
  are swept after `PAYMENT_WINDOW_MINUTES` and cancelled through the state
  machine, which returns the stock and frees the slot.
- Local development needs a way to make the server send itself a signed event.
  `POST /payments/simulate` does that, and it is registered only outside
  production. It asks the **server** to sign and deliver, which is exactly what
  a gateway does from its own machines — the browser still cannot mark anything
  paid.
