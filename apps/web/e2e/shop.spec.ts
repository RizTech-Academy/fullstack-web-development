import { expect, test } from "@playwright/test";

/**
 * One test that buys something, and a handful that guard the things a broken
 * deployment breaks first.
 *
 * End-to-end tests are the most expensive kind to write and by far the most
 * expensive to keep: they are slow, they need a database and two servers, and
 * when they fail they rarely say why. So there are few of them, and each one
 * covers a path where a failure would mean the shop cannot take money.
 *
 * Everything else — the totals, the state machine, the date handling — is
 * already covered far more cheaply in the unit and API tests.
 */

const CUSTOMER = { email: "asha@example.com", password: "kirana-dev-password" };
const SHOPKEEPER = { email: "shop@example.com", password: "kirana-dev-admin" };

/**
 * Signs in and **waits for it to have happened**.
 *
 * Clicking the button and navigating on the next line is a race: the server
 * action has not finished, so the session cookie is not set, and the next page
 * loads signed out. It fails perhaps one run in three, which is exactly the
 * kind of flake that gets a suite muted.
 *
 * Waiting for something only a signed-in visitor sees is the fix. Never
 * `waitForTimeout` — that is the same race with a longer fuse.
 */
async function signIn(
  page: import("@playwright/test").Page,
  who: { email: string; password: string },
): Promise<void> {
  await page.goto("/account/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test.describe("the storefront", () => {
  test("shows products and lets one be opened", async ({ page }) => {
    await page.goto("/products");

    await expect(page.getByRole("heading", { name: /Toor Dal/ }).first()).toBeVisible();

    await page.getByRole("link", { name: /Toor Dal/ }).first().click();
    await expect(page).toHaveURL(/\/products\/toor-dal/);
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();
  });

  test("searches", async ({ page }) => {
    await page.goto("/products");

    await page.getByLabel("Search products").fill("dal");
    await page.getByRole("button", { name: "Search" }).click();

    // The query is in the URL, which is what makes a search shareable and
    // survivable across a refresh.
    await expect(page).toHaveURL(/q=dal/);
    await expect(page.getByRole("heading", { name: /Toor Dal/ }).first()).toBeVisible();
  });

  test("answers a missing product with a real 404", async ({ page }) => {
    const response = await page.goto("/products/not-a-real-product");

    // Not `toBeVisible` on the message — the status line is the assertion. A
    // page that renders correctly with a 200 is a soft 404, and Google indexes
    // it. See docs/decisions/0012.
    expect(response?.status()).toBe(404);
  });
});

test.describe("buying something", () => {
  test("cart, sign-in and checkout", async ({ page }) => {
    await page.goto("/products/toor-dal");

    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("button", { name: /Added/ })).toBeVisible();

    await page.getByRole("link", { name: /^Cart/ }).click();
    await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();

    // The quantity stepper writes through the server and the page re-renders.
    //
    // `getByText("2")` would be ambiguous — it also matches the ₹230.00 total.
    // The live region is the element that actually announces the quantity, so
    // it is both the precise locator and the accessible one.
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.locator("[aria-live=polite]")).toHaveText("2");

    await page.getByRole("link", { name: "Sign in to check out" }).click();
    await page.getByLabel("Email").fill(CUSTOMER.email);
    await page.getByLabel("Password").fill(CUSTOMER.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // The cart must survive the sign-in. Losing it here is a lost sale.
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText(/Toor Dal/)).toBeVisible();

    await page.getByLabel("Flat, building, street").fill("Flat 402, Sai Residency, Lane 5");
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page).toHaveURL(/\/orders\/KS-/);

    // The order number as a heading, not loose text. `getByText(/Order placed/)`
    // matched five elements on this page — the status badge, the progress step,
    // the history entry and two others — and a locator that vague breaks the
    // day somebody adds a sixth.
    await expect(page.getByRole("heading", { name: /^KS-/ })).toBeVisible();
  });

  test("keeps the cart across a reload", async ({ page }) => {
    await page.goto("/products/tomato");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("button", { name: /Added/ })).toBeVisible();

    await page.reload();
    await page.goto("/cart");

    // The whole point of putting the cart in the database rather than in
    // component state.
    await expect(page.getByText(/Tomato/)).toBeVisible();
  });
});

test.describe("the shop admin", () => {
  test("is not reachable by a customer", async ({ page }) => {
    await signIn(page, CUSTOMER);

    const response = await page.goto("/admin");

    // A 404 rather than a redirect, so a signed-in customer learns nothing
    // about whether an admin area exists.
    //
    // Note that `page.goto` follows redirects and reports the **final**
    // response, so without a completed sign-in this reads 200 — the login page
    // — and looks like the guard is missing when it is not.
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/could not find that/i)).toBeVisible();
  });

  test("lets the shopkeeper advance an order", async ({ page }) => {
    await signIn(page, SHOPKEEPER);

    await page.goto("/admin");
    await expect(page.getByText("Open orders")).toBeVisible();

    const pack = page.getByRole("button", { name: "Mark packed and ready" }).first();

    if (await pack.count()) {
      await pack.click();
      // The buttons come from the state machine, so after packing the next
      // legal move must be the one offered.
      await expect(
        page.getByRole("button", { name: "Mark out for delivery" }).first(),
      ).toBeVisible();
    }
  });
});
