import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // One at a time. These tests buy real stock out of one shared database, so
  // running them in parallel makes them fight each other over the last bag of
  // atta — which looks exactly like a flaky test and is not one.
  workers: 1,
  fullyParallel: false,
  // Fail the build rather than quietly passing a suite with a `.only` left in.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    // Only kept for a failure. Keeping them for passes fills a disk with
    // videos nobody watches.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // A mid-range Android on mobile data is what most customers actually have.
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
