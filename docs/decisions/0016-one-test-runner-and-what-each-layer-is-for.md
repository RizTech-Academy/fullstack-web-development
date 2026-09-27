# 0016 — One test runner, and a job for each layer

**Status:** accepted · 2026-09-27

## Context

Nest scaffolds Jest. Next has no opinion. The shared package needed something.
Three runners would mean three configurations, three sets of matchers and three
ways to write a mock, in one repository, for no benefit.

Jest also would not run at all on Node 25: `jest-environment-node` copies
globals into the sandbox and Node's newer `localStorage` throws
`SecurityError: Cannot initialize local storage without a --localstorage-file
path`. Jest 30 did not fix it. A student on a current Node would meet that
before they met a single test.

## Decision

**Vitest everywhere**, for unit, service and API end-to-end tests. **Playwright**
for the browser.

The API needs `unplugin-swc`: Vitest transforms with esbuild, which does not
implement `emitDecoratorMetadata`, and Nest's dependency injection is built on
exactly that metadata. Without it the error blames your providers rather than
the compiler.

Each layer has a job, and nothing is tested twice:

| Layer | What only it can prove | Cost |
|---|---|---|
| Unit (`packages/shared`) | arithmetic, the state machine, date handling | milliseconds |
| Service (`apps/api/src/**.spec.ts`) | branches and refusals, with fakes | milliseconds |
| API e2e (`apps/api/test`) | transactions, row locks, cookies, signatures | seconds, needs PostgreSQL |
| Component (`apps/web/src`) | what a person sees rendered | milliseconds |
| Playwright (`apps/web/e2e`) | the whole thing, in a browser | tens of seconds, needs everything |

## Consequences

- Unit tests do **not** use `Test.createTestingModule`. A service is a class —
  construct it and pass fakes. The DI container is worth booting for end-to-end
  tests and is ceremony for one service with two dependencies.
- Service tests never assert "we called `updateMany`". Mocking a query builder
  and then asserting the mock was called tests the mock. Stock release and slot
  release are proved end to end, against a real database, where they are true.
- The e2e suites buy real stock from one shared database, so they run one file
  at a time: `fileParallelism: false` and Playwright's `workers: 1`. That is
  deliberate, not a leftover.
- `test/app.factory.ts` duplicates `main.ts`. It has to: a test that boots a
  *different* application from the one that ships proves nothing about the one
  that ships. When `main.ts` changes, that file changes.
