# 0017 — Configuration is validated at startup, and has no fallbacks

**Status:** accepted · 2026-09-27

## Context

`process.env.WHATEVER` is `string | undefined` everywhere it is read, so every
read grows a fallback:

```ts
origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
const secret = process.env.JWT_SECRET ?? "dev-secret";
```

Both of those are how a shop ends up misconfigured in production with nothing
in the logs. The fallback is chosen to make local development pleasant, and it
is always the dangerous option — because the dangerous option is the one that
lets the process start.

The failure mode is the worst kind: not a crash, but a system that works
normally and is quietly wrong. A permissive CORS origin is an API readable by
any site on the internet. A default JWT secret is every account at once.

## Decision

One schema, validated before anything is constructed:

```ts
const schema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
  JWT_SECRET: z.string().min(32),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().url(),
  // …
});
```

Wired into Nest's `ConfigModule` as `validate`, so it runs during bootstrap.

**Secrets have no defaults.** `CORS_ORIGIN` has no default either, because a
wrong origin is either a broken shop or an open one. `PORT` and `LOG_LEVEL` do,
because being wrong about them is inconvenient rather than dangerous.

**The length checks are not decoration.** A short JWT secret is brute-forceable
offline, and a forged token is every account.

All problems are reported at once, or a deployment fails as many times as there
are missing variables.

## Consequences

- A misconfigured deployment **will not start**, which the platform treats as a
  failed deploy and rolls back. That is the entire point: a rollback is a
  non-event, and an API running with no authentication is an incident.
- The error names the variable and what was wrong with it. Verified by running
  it three ways:

  ```text
  JWT_SECRET: String must contain at least 32 character(s)
  CORS_ORIGIN: Required
  DATABASE_URL: Invalid input: must start with "postgres"
  ```

- The validator never logs values. It is the one place that has all of them,
  which makes it the one place most likely to leak them.
- Adding a variable means adding it here. That is the feature — a variable not
  in the schema is one nobody documented.
