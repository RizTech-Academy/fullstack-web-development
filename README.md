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

## Layout

    apps/
        api/        NestJS — catalogue, cart, orders, auth
            src/
                products/     catalogue endpoints
                categories/
                prisma/       one shared PrismaService
            prisma/           schema, migrations, seed
        web/        Next.js — storefront and admin
            src/
                app/          routes: (storefront), products/[slug]
                components/
                lib/          the typed API client
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

If something here looks like a mistake, check `docs/decisions/` before changing
it. Most of the surprising parts are deliberate.

## Licence

MIT
