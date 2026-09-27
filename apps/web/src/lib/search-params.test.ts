import { describe, expect, it } from "vitest";

import { readPage, readString } from "./search-params";

describe("readString", () => {
  it("reads a plain value", () => {
    expect(readString({ q: "dal" }, "q")).toBe("dal");
  });

  it("takes the first of a repeated key", () => {
    // ?category=dairy&category=snacks arrives as an array. String() on it
    // would give "dairy,snacks", which the API then rejects — or worse,
    // silently ignores.
    expect(readString({ category: ["dairy", "snacks"] }, "category")).toBe("dairy");
  });

  it("treats whitespace as absent", () => {
    // An empty q is a filter that matches everything, which works by accident
    // until it does not.
    expect(readString({ q: "   " }, "q")).toBeUndefined();
    expect(readString({ q: "" }, "q")).toBeUndefined();
  });

  it("trims what it returns", () => {
    expect(readString({ q: "  dal  " }, "q")).toBe("dal");
  });

  it("is undefined for a missing key", () => {
    expect(readString({}, "q")).toBeUndefined();
  });
});

describe("readPage", () => {
  it("defaults to the first page", () => {
    expect(readPage({})).toBe(1);
  });

  it("reads a valid page", () => {
    expect(readPage({ page: "3" })).toBe(3);
  });

  it.each(["0", "-1", "abc", "", "1.5"])("falls back to 1 for %s", (page) => {
    // Number("") is 0 and Number("abc") is NaN, and either would build a
    // negative or nonsensical skip.
    expect(readPage({ page })).toBe(1);
  });
});
