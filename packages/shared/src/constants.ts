import type { Paise } from "./money";

/** Both halves must agree: the front end promises it, the API enforces it. */
export const FREE_DELIVERY_THRESHOLD_PAISE: Paise = 50_000;
export const DELIVERY_CHARGE_PAISE: Paise = 4_000;
export const MAX_CART_QUANTITY = 50;
export const DELIVERY_PINCODES = ["412207", "411014", "411028"] as const;
