FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

RUN npm ci

COPY packages/shared packages/shared
COPY apps/web apps/web

# Build-time only. Anything prefixed NEXT_PUBLIC_ is baked into the bundle at
# build time, not read at runtime — so it cannot be changed by setting an
# environment variable on the running container, and a secret given this prefix
# is a secret published to every visitor.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build --workspace=packages/shared \
  && npm run build --workspace=apps/web

# ---------------------------------------------------------------- runtime

FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

# `output: "standalone"` in next.config.mjs produces a self-contained server
# with only the dependencies it actually traced — a few hundred megabytes
# smaller than copying node_modules.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static apps/web/.next/static
COPY --from=build /app/apps/web/public apps/web/public

USER node

EXPOSE 3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
