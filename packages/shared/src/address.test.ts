import { describe, expect, it } from "vitest";

import { PINCODE_PATTERN, normalisePhone } from "./address";

describe("normalisePhone", () => {
  it.each([
    ["9876543210", "9876543210"],
    ["+91 98765 43210", "9876543210"],
    ["098765 43210", "9876543210"],
    ["98765-43210", "9876543210"],
    ["+919876543210", "9876543210"],
  ])("normalises %s", (input, expected) => {
    // One number, five spellings. Storing what was typed means never being able
    // to match two records.
    expect(normalisePhone(input)).toBe(expected);
  });

  it.each([
    ["12345", "too short"],
    ["1234567890", "does not start 6-9"],
    ["5876543210", "does not start 6-9"],
    ["", "empty"],
    ["not a number", "no digits"],
  ])("rejects %s (%s)", (input, _why) => {
    expect(normalisePhone(input)).toBeNull();
  });
});

describe("PINCODE_PATTERN", () => {
  it.each(["412207", "411014", "110001"])("accepts %s", (pincode) => {
    expect(PINCODE_PATTERN.test(pincode)).toBe(true);
  });

  it.each([
    ["012345", "starts with zero"],
    ["41220", "five digits"],
    ["4122077", "seven digits"],
    ["41220a", "not all digits"],
  ])("rejects %s (%s)", (pincode, _why) => {
    expect(PINCODE_PATTERN.test(pincode)).toBe(false);
  });
});
