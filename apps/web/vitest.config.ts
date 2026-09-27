import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom, because these tests query rendered output. The API's tests use
    // node — pick the environment per package, not per project.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    // Playwright specs live in e2e/ and are run by Playwright, not by Vitest.
    exclude: ["node_modules", "e2e"],
  },
  // Next's postcss.config.mjs names its plugin as a string, which is Next's own
  // shorthand and not something Vite understands. These tests assert rendered
  // markup, not styling, so PostCSS is switched off rather than configured.
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@kirana/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
});
