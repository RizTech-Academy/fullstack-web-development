import { describe, expect, it } from "vitest";

import {
  ORDER_STATUS_FLOW,
  canTransition,
  customerCanCancel,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "./order";

describe("canTransition", () => {
  it("allows the happy path", () => {
    expect(canTransition("PLACED", "PACKED")).toBe(true);
    expect(canTransition("PACKED", "OUT_FOR_DELIVERY")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
  });

  it("refuses a jump", () => {
    expect(canTransition("PLACED", "DELIVERED")).toBe(false);
  });

  it("refuses going backwards", () => {
    expect(canTransition("PACKED", "PLACED")).toBe(false);
  });

  it("treats DELIVERED and CANCELLED as terminal", () => {
    // Not "has no valid next status" written out by hand — the empty array in
    // the table is the implementation, and this asserts it.
    expect(ORDER_STATUS_FLOW.DELIVERED).toHaveLength(0);
    expect(ORDER_STATUS_FLOW.CANCELLED).toHaveLength(0);
  });

  it("refuses a status transitioning to itself", () => {
    for (const status of Object.keys(ORDER_STATUS_FLOW) as OrderStatus[]) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("allows cancelling from anything that is not terminal", () => {
    const open: OrderStatus[] = ["PENDING_PAYMENT", "PLACED", "PACKED", "OUT_FOR_DELIVERY"];
    for (const status of open) {
      expect(canTransition(status, "CANCELLED")).toBe(true);
    }
  });
});

describe("customerCanCancel", () => {
  it("lets a customer cancel before the shop has packed it", () => {
    expect(customerCanCancel("PENDING_PAYMENT")).toBe(true);
    expect(customerCanCancel("PLACED")).toBe(true);
  });

  it("stops once it is packed", () => {
    // A rule about the shop, not about the data. Once somebody has bagged it,
    // cancelling costs them work — so it is a phone call.
    expect(customerCanCancel("PACKED")).toBe(false);
    expect(customerCanCancel("OUT_FOR_DELIVERY")).toBe(false);
    expect(customerCanCancel("DELIVERED")).toBe(false);
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("has a human label for every status", () => {
    for (const status of Object.keys(ORDER_STATUS_FLOW) as OrderStatus[]) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
      // No enum values leaking into the interface.
      expect(ORDER_STATUS_LABELS[status]).not.toMatch(/_/);
    }
  });
});
