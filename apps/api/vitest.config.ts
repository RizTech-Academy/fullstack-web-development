import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    // Vitest transforms with esbuild, which does not implement
    // `emitDecoratorMetadata` — and Nest's dependency injection is built on
    // exactly that metadata. Without this plugin, anything constructed through
    // Nest's container fails with "Nest can't resolve dependencies", and the
    // error blames your providers rather than the compiler.
    //
    // Plain unit tests do not need it, because a service is a class you can
    // construct yourself. The end-to-end tests boot the real application, and
    // they do.
    swc.vite({ module: { type: "es6" } }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    // The end-to-end tests share one database, so files must not run at the
    // same time as each other.
    fileParallelism: false,
    // bcrypt at cost 12 is deliberately slow, and the e2e suite talks to
    // PostgreSQL. The default 5s is not enough for either.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      // The sources, not the build, so a change in the shared package does not
      // need a rebuild before the tests see it.
      "@kirana/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
});
