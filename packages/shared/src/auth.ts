export type Role = "CUSTOMER" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
}

/** The cookie the API sets. Named here so both halves cannot disagree. */
export const SESSION_COOKIE = "kirana_session";

/** Identifies an anonymous cart before anybody logs in. */
export const CART_COOKIE = "kirana_cart";

export const PASSWORD_MIN_LENGTH = 10;
