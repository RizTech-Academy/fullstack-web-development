# Multi-stage, because the image that ships should not contain the toolchain
# that built it. The final image has no TypeScript compiler, no test runner and
# no dev dependencies — a smaller download on every deploy, and a smaller
# surface for anything looking for something to exploit.

FROM node:20-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# The manifests first, on their own. Docker caches each layer, so as long as
# these files have not changed the install below is reused — which turns a
# three-minute build into fifteen seconds for a change that only touches
# source code.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build --workspace=packages/shared \
  && npx prisma generate --schema apps/api/prisma/schema.prisma \
  && npm run build --workspace=apps/api

# Drop everything that was only needed to build.
RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------- runtime

FROM node:20-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/shared/package.json packages/shared/
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/prisma apps/api/prisma

# `node` rather than root. A container process that does not need root should
# not have it — the difference matters the day something else goes wrong.
USER node

EXPOSE 3001

# `node` directly, not `npm start`. npm sits between the signal and the
# process, so a SIGTERM on shutdown reaches npm and not Node, and the platform
# ends up killing a process that never got the chance to close its connections.
CMD ["node", "apps/api/dist/main.js"]
