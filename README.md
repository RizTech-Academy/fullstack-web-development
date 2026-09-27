# Kirana Store

Reference code for the [Full-Stack Web Development course](https://www.riztechacademy.com/learn/fullstack-web-development)
at RizTech Academy — an online grocery shop for a neighbourhood kirana store,
built with Next.js, NestJS, PostgreSQL and Prisma.

## This is reference code, not a starting point

The course builds this over seven modules. **Build it yourself first.** This
repository is here for when you are stuck and want to compare, or when you want
to see the shape of something before writing it.

Copying it will teach you very little. Typing it will teach you a lot.

## Checkpoints

`main` is linear — one module after another — so each branch is the cumulative
state at the end of that module, and the diff between two is exactly what that
module added.

| Branch | Module | State |
|---|---|---|
| `module-10-planning` | 10 · Planning | scaffold, schema, shared types, decisions |
| `module-11-catalogue` | 11 · Catalogue and search | catalogue API, storefront, product pages, search and filters |
| `module-12-cart` | 12 · Cart and checkout | cart, stock, sign-in, delivery slots, checkout, orders |
| `module-13-orders` | 13 · Orders and admin | the order state machine, history, the shop's admin area, inventory |
| `module-14-payments` | 14 · Payments | intents, signed webhooks, idempotency, refunds, expiring unpaid orders |

Branches are added as the course is written. To see what a module changed:

    https://github.com/RizTech-Academy/fullstack-web-development/compare/module-10-planning...module-11-catalogue

Tags (`module-10-planning-v1`) point at the same commits if you want an
immutable reference. Use the branch if you intend to `git checkout` — a tag
will leave you in a detached HEAD.

## Setup

    git clone https://github.com/RizTech-Academy/fullstack-web-development.git
    cd fullstack-web-development
    npm ci
    cp apps/api/.env.example apps/api/.env
    cp apps/web/.env.example apps/web/.env.local
    docker compose up -d
    npm run db:migrate

Then:

    npm run dev:api     # http://localhost:3001/api
    npm run dev:web     # http://localhost:3000

The seed creates two accounts and prints both when it runs: a customer, and the
shopkeeper, who can reach `/admin`. They are development accounts — the
passwords are in `prisma/seed.ts` in plain sight, which is exactly why the seed
refuses to run with `NODE_ENV=production`.

## Product pictures

`apps/web/public/product-images/` holds a simple illustration for every seeded
product, committed to this repository.

Nothing here loads an image from somebody else's server. A hotlinked image rots
— the host moves the file, rate-limits you, or starts serving something else —
and a shop whose pictures have quietly vanished looks broken with nothing in the
code to explain it. Whatever you use, put it in the repository or in storage you
control.

## Layout

    apps/
        api/        NestJS — catalogue, cart, orders, auth
            src/
                admin/        the shop owner's endpoints
                auth/         registration, sign-in, roles, the session cookie
                cart/         the cart, anonymous and signed in
                checkout/     placing an order
                delivery/     slots and their capacity
                notifications/ where "we told the customer" happens
                orders/       history, the state machine, cancellation
                payments/     the gateway seam, webhooks, refunds
                products/     catalogue endpoints
                categories/
                common/       the one error shape everything returns
                prisma/       one shared PrismaService
            prisma/           schema, migrations, seed
        web/        Next.js — storefront and admin
            src/
                app/          routes: (shop)/products, cart, checkout,
                              account, orders — plus app/actions/
                components/
                lib/          the typed API client
            public/
                product-images/   committed, never hotlinked
    packages/
        shared/     types and constants both halves import
    docs/
        decisions/  why things are the way they are

## Read the decisions first

`docs/decisions/` explains the choices that look odd until you know why:

| Record | Decision |
|---|---|
| [0001](docs/decisions/0001-money-as-integer-paise.md) | Money is an integer count of paise, never a float |
| [0002](docs/decisions/0002-snapshot-product-details-on-orders.md) | Orders snapshot product details rather than referencing them |
| [0003](docs/decisions/0003-cart-in-database-not-cookie.md) | The cart lives in the database, not a cookie |
| [0004](docs/decisions/0004-decrement-stock-at-order-placement.md) | Stock is decremented when an order is placed, not when added to a cart |
| [0006](docs/decisions/0006-soft-delete-products.md) | Products are deactivated, never deleted |
| [0009](docs/decisions/0009-show-current-price-at-checkout.md) | Checkout charges the current price and says so |
| [0011](docs/decisions/0011-no-implicit-conversion-in-validation-pipe.md) | The validation pipe does no implicit conversion |
| [0012](docs/decisions/0012-no-loading-boundary-above-notfound.md) | No loading boundary above a route that can 404 |
| [0013](docs/decisions/0013-conditional-updates-instead-of-read-then-write.md) | Stock and slots are claimed with a conditional UPDATE, never read-then-write |
| [0014](docs/decisions/0014-order-status-is-a-state-machine.md) | An order's status is a state machine, written down once |
| [0015](docs/decisions/0015-only-a-webhook-may-mark-an-order-paid.md) | Only a signed webhook may mark an order paid |

If something here looks like a mistake, check `docs/decisions/` before changing
it. Most of the surprising parts are deliberate.

## Licence

MIT
