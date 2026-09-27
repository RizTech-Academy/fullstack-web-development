import { compare, hash } from "bcryptjs";

/**
 * Cost 12 on purpose.
 *
 * bcrypt is meant to be slow: the whole point is that an attacker with a stolen
 * table cannot try billions of guesses. 12 costs roughly a quarter of a second
 * here, which nobody notices on a login and which makes offline cracking
 * expensive. Do not lower it because your tests feel slow — mock it instead.
 */
const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, COST);
}

export function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}
