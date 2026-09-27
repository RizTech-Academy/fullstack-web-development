/**
 * Money is an integer count of paise, everywhere.
 *
 * See docs/decisions/0001-money-as-integer-paise.md. Every JavaScript number
 * is a float, so 0.1 + 0.2 is 0.30000000000000004 here exactly as it is in
 * Python. The field name carries the unit so nobody has to guess.
 */
export type Paise = number;

/** Format paise as rupees with Indian digit grouping: ₹12,34,567.89 */
export function formatPaise(paise: Paise): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

/** Convert rupees entered by a human into paise. Rounds, never truncates. */
export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}
