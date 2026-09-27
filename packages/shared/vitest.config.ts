import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node, not jsdom. Nothing in this package touches a browser, and a fake
    // DOM would only slow the suite down.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
