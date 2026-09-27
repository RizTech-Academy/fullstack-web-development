/** Slots are offered for today plus this many days. */
export const DELIVERY_DAYS_AHEAD = 3;

export interface DeliverySlotOption {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
  /** ISO date, no time: "2026-09-28". The slot's hours supply the time. */
  date: string;
  remaining: number;
}

export interface DeliveryDay {
  date: string;
  /** "Today", "Tomorrow", or "Wed 30 Sep". */
  label: string;
  slots: DeliverySlotOption[];
}

/**
 * A slot on today's date has already gone if its window has started.
 *
 * Takes `now` as an argument rather than calling `new Date()` inside, so the
 * same function can be unit tested at 9am and at 8pm without mocking the clock.
 */
export function slotIsBookable(
  slot: { date: string; startHour: number; remaining: number },
  now: Date,
): boolean {
  if (slot.remaining <= 0) return false;

  const today = toIsoDate(now);
  if (slot.date > today) return true;
  if (slot.date < today) return false;

  // An hour of notice, so the shop is not packing an order that is already late.
  return slot.startHour > now.getHours() + 1;
}

/**
 * The **local** calendar date as YYYY-MM-DD.
 *
 * Use this to ask "what day is it for the customer?". `toISOString().slice(0,10)`
 * would answer in UTC, so at 2am in Pune it names yesterday.
 */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * A calendar date, as the instant of UTC midnight on that date.
 *
 * This is the only safe way to put a date into a `DATE` column from JavaScript,
 * and getting it wrong cost a day of deliveries the first time round. The
 * tempting version:
 *
 *     const date = new Date("2026-09-30");
 *     date.setHours(0, 0, 0, 0);
 *
 * `new Date("2026-09-30")` is **UTC** midnight. `setHours` then moves it to
 * local midnight — which in IST is 18:30 UTC on the 29th. PostgreSQL casts that
 * to a DATE by taking its UTC day, and stores 2026-09-29. Every delivery was
 * scheduled one day early, and nothing anywhere threw.
 *
 * A calendar date has no timezone. Pinning it to UTC midnight at both ends
 * means it cannot drift, whatever the server or the customer is set to.
 */
export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Reads a DATE column back out. The counterpart to `parseIsoDate`. */
export function utcIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
