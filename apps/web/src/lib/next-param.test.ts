import { describe, expect, it } from "vitest";

import { safeNextParam } from "./next-param";

describe("safeNextParam", () => {
  it("allows a path on this site", () => {
    expect(safeNextParam("/checkout")).toBe("/checkout");
  });

  it.each([
    ["https://evil.example", "absolute URL"],
    ["//evil.example", "protocol-relative URL"],
    ["javascript:alert(1)", "javascript URL"],
    ["", "empty"],
    [undefined, "missing"],
  ])("refuses %s (%s)", (value, _why) => {
    // An open redirect right after somebody has typed a password is the
    // classic phishing setup.
    expect(safeNextParam(value)).toBe("/products");
  });

  it("takes the first of a repeated key", () => {
    expect(safeNextParam(["/cart", "https://evil.example"])).toBe("/cart");
  });
});
