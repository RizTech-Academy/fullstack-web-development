import { randomBytes } from "node:crypto";

// No I, O, 0 or 1. Somebody will read this number down a phone line.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * KS-20260927-7F3K2A
 *
 * Deliberately not sequential. A sequential number needs a counter, and a
 * counter is either a race or a lock on every order. It also tells anybody who
 * places two orders exactly how much business the shop did in between, which is
 * not information to hand out.
 *
 * The date prefix is for humans: the shop can find an order from a phone call.
 */
export function generateOrderNumber(now = new Date()): string {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const random = Array.from(randomBytes(6))
    .map((byte) => ALPHABET[byte % ALPHABET.length])
    .join("");

  return `KS-${date}-${random}`;
}
