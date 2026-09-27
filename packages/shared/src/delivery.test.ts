import { describe, expect, it } from "vitest";

import { parseIsoDate, slotIsBookable, toIsoDate, utcIsoDate } from "./delivery";

/**
 * The date functions are tested hardest because they were wrong once, in a way
 * that returned 201 and showed the right day on the confirmation page while
 * storing the wrong one. See the module 12 lesson.
 */
describe("parseIsoDate and utcIsoDate", () => {
  it("round-trips a calendar date", () => {
    expect(utcIsoDate(parseIsoDate("2026-09-30"))).toBe("2026-09-30");
  });

  it("pins the date to UTC midnight", () => {
    expect(parseIsoDate("2026-09-30").toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });

  it("does not shift across a month boundary", () => {
    expect(utcIsoDate(parseIsoDate("2026-10-01"))).toBe("2026-10-01");
    expect(utcIsoDate(parseIsoDate("2026-12-31"))).toBe("2026-12-31");
  });

  it("does not shift across a leap day", () => {
    expect(utcIsoDate(parseIsoDate("2028-02-29"))).toBe("2028-02-29");
  });
});

describe("toIsoDate", () => {
  it("reports the local calendar date", () => {
    // Constructed from local parts, so this is the local day whatever the
    // machine's timezone is — which is exactly what it is for.
    const date = new Date(2026, 8, 30, 23, 45);
    expect(toIsoDate(date)).toBe("2026-09-30");
  });

  it("pads single-digit months and days", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("slotIsBookable", () => {
  const now = new Date(2026, 8, 27, 14, 0); // 2pm on the 27th, local

  it("allows a slot on a future day", () => {
    expect(slotIsBookable({ date: "2026-09-28", startHour: 7, remaining: 5 }, now)).toBe(true);
  });

  it("refuses a slot on a past day", () => {
    expect(slotIsBookable({ date: "2026-09-26", startHour: 19, remaining: 5 }, now)).toBe(false);
  });

  it("allows a slot later today", () => {
    expect(slotIsBookable({ date: "2026-09-27", startHour: 19, remaining: 5 }, now)).toBe(true);
  });

  it("refuses a slot that has already started", () => {
    expect(slotIsBookable({ date: "2026-09-27", startHour: 10, remaining: 5 }, now)).toBe(false);
  });

  it("refuses a slot starting within the hour of notice", () => {
    // 3pm at 2pm is exactly one hour away, which is not enough notice.
    expect(slotIsBookable({ date: "2026-09-27", startHour: 15, remaining: 5 }, now)).toBe(false);
    expect(slotIsBookable({ date: "2026-09-27", startHour: 16, remaining: 5 }, now)).toBe(true);
  });

  it("refuses a full slot whatever the time", () => {
    expect(slotIsBookable({ date: "2026-09-29", startHour: 7, remaining: 0 }, now)).toBe(false);
  });
});
