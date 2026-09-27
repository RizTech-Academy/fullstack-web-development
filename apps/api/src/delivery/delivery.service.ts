import { Injectable } from "@nestjs/common";
import {
  DELIVERY_DAYS_AHEAD,
  parseIsoDate,
  slotIsBookable,
  toIsoDate,
  utcIsoDate,
  type DeliveryDay,
  type DeliverySlotOption,
} from "@kirana/shared";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Today plus DELIVERY_DAYS_AHEAD, with the slots that are still bookable.
   *
   * `now` is a parameter so the whole thing can be tested at any hour without
   * mocking the clock. The controller passes `new Date()`; a test passes 8pm
   * and asserts that today has no slots left.
   */
  async availableDays(now = new Date()): Promise<DeliveryDay[]> {
    const slots = await this.prisma.deliverySlot.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { startHour: "asc" }],
    });

    const dates = Array.from({ length: DELIVERY_DAYS_AHEAD + 1 }, (_, offset) => {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      return date;
    });

    // One query for every slot and date in the window, rather than one per
    // slot per day. Four days times four slots is sixteen round trips the
    // obvious loop would have made.
    const isoDates = dates.map(toIsoDate);

    const bookings = await this.prisma.slotBooking.findMany({
      where: {
        slotId: { in: slots.map((slot) => slot.id) },
        // Bounds as calendar dates at UTC midnight, matching how they were
        // written. Building them from `now` with local hours would shift the
        // range by a day — see parseIsoDate.
        date: {
          gte: parseIsoDate(isoDates[0] ?? toIsoDate(now)),
          lte: parseIsoDate(isoDates.at(-1) ?? toIsoDate(now)),
        },
      },
    });

    const bookedFor = new Map(
      bookings.map((booking) => [
        `${booking.slotId}|${utcIsoDate(booking.date)}`,
        booking.booked,
      ]),
    );

    return dates.map((date) => {
      const iso = toIsoDate(date);

      const options: DeliverySlotOption[] = slots.map((slot) => ({
        id: slot.id,
        label: slot.label,
        startHour: slot.startHour,
        endHour: slot.endHour,
        date: iso,
        remaining: slot.capacity - (bookedFor.get(`${slot.id}|${iso}`) ?? 0),
      }));

      return {
        date: iso,
        label: dayLabel(date, now),
        slots: options.filter((slot) => slotIsBookable(slot, now)),
      };
      // Days with nothing left are still returned, with an empty list, so the
      // interface can say "nothing left today" instead of silently skipping it.
    });
  }
}

function dayLabel(date: Date, now: Date): string {
  const today = toIsoDate(now);
  const iso = toIsoDate(date);

  if (iso === today) return "Today";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === toIsoDate(tomorrow)) return "Tomorrow";

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
