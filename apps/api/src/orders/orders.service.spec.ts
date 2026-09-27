import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "./orders.service";

/**
 * A unit test with no Nest container in sight.
 *
 * `Test.createTestingModule` exists and is useful when you want the real
 * dependency graph. For one service with two dependencies it is ceremony: a
 * service is a class, so construct it and pass fakes.
 *
 * Worth testing here: the transition rules and the cancellation refusals, which
 * are branches that would each need a whole order set up in a real database.
 * The behaviour that genuinely touches SQL — stock coming back, the slot being
 * freed — is left to the end-to-end tests, where it is actually true rather
 * than mocked. Asserting "we called updateMany" would only test the mock.
 */
describe("OrdersService", () => {
  const orderRow = {
    id: "order-1",
    orderNumber: "KS-20260927-ABCDEF",
    status: "PLACED" as const,
    userId: "user-1",
    items: [],
    slotId: null,
    slotDate: null,
  };

  const updatedRow = {
    ...orderRow,
    status: "PACKED" as const,
    events: [],
    paymentMethod: "CASH_ON_DELIVERY" as const,
    subtotalPaise: 0,
    deliveryPaise: 0,
    totalPaise: 0,
    placedAt: null,
    slotLabel: null,
    deliveryName: "Asha Kulkarni",
    deliveryPhone: "9876543210",
    deliveryLine1: "Flat 402",
    deliveryLine2: null,
    deliveryLandmark: null,
    deliveryCity: "Pune",
    deliveryPincode: "412207",
  };

  let prisma: {
    order: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
    variant: { updateMany: ReturnType<typeof vi.fn> };
    slotBooking: { updateMany: ReturnType<typeof vi.fn> };
  };
  let notifications: { orderStatusChanged: ReturnType<typeof vi.fn> };
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      order: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
      variant: { updateMany: vi.fn() },
      slotBooking: { updateMany: vi.fn() },
    };
    notifications = { orderStatusChanged: vi.fn() };

    service = new OrdersService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe("cancelForUser", () => {
    it("is a 404 when the order is not the user's", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      // Not a 403 — that would confirm the order number is real.
      await expect(service.cancelForUser("user-1", "KS-NOPE")).rejects.toMatchObject({
        status: 404,
      });
    });

    it("refuses once the order has been packed", async () => {
      prisma.order.findFirst.mockResolvedValue({ status: "PACKED" });

      await expect(
        service.cancelForUser("user-1", orderRow.orderNumber),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("tells the customer to ring the shop once it has left", async () => {
      prisma.order.findFirst.mockResolvedValue({ status: "OUT_FOR_DELIVERY" });

      await expect(service.cancelForUser("user-1", orderRow.orderNumber)).rejects.toThrow(
        /ring us/i,
      );
    });

    it("says so when it is already cancelled", async () => {
      prisma.order.findFirst.mockResolvedValue({ status: "CANCELLED" });

      await expect(service.cancelForUser("user-1", orderRow.orderNumber)).rejects.toThrow(
        /already cancelled/i,
      );
    });
  });

  describe("setStatus", () => {
    it("refuses a jump in the state machine", async () => {
      prisma.order.findUnique.mockResolvedValue({ ...orderRow, status: "PLACED" });

      await expect(
        service.setStatus(orderRow.orderNumber, "DELIVERED"),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("refuses moving to the status it is already in", async () => {
      prisma.order.findUnique.mockResolvedValue({ ...orderRow, status: "PACKED" });

      await expect(service.setStatus(orderRow.orderNumber, "PACKED")).rejects.toThrow(
        /already packed/i,
      );
    });

    it("refuses to change a delivered order at all", async () => {
      prisma.order.findUnique.mockResolvedValue({ ...orderRow, status: "DELIVERED" });

      await expect(
        service.setStatus(orderRow.orderNumber, "CANCELLED"),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("is a 404 for an order that does not exist", async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.setStatus("KS-NOPE", "PACKED"),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("notifies only after the transaction has committed", async () => {
      prisma.order.findUnique.mockResolvedValue({ ...orderRow, status: "PLACED" });
      prisma.order.update.mockResolvedValue(updatedRow);

      await service.setStatus(orderRow.orderNumber, "PACKED");

      // An SMS cannot be unsent, so it must not happen inside something that
      // can roll back. Asserting the ordering is the only way to keep that true
      // as the code changes — a comment saying "send after the commit" does not
      // fail when somebody moves the line.
      const [transactionCall] = prisma.$transaction.mock.invocationCallOrder;
      const [notifyCall] = notifications.orderStatusChanged.mock.invocationCallOrder;
      expect(notifyCall).toBeGreaterThan(transactionCall as number);
    });

    it("does not notify at all when the transition is refused", async () => {
      prisma.order.findUnique.mockResolvedValue({ ...orderRow, status: "DELIVERED" });

      await expect(service.setStatus(orderRow.orderNumber, "PACKED")).rejects.toThrow();
      expect(notifications.orderStatusChanged).not.toHaveBeenCalled();
    });
  });
});
