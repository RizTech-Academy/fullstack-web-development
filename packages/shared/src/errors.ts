/**
 * Stable machine-readable error codes.
 *
 * Messages get reworded and translated; these do not, so a client can switch
 * on them safely.
 */
export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CART_EMPTY: "CART_EMPTY",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  PRICE_CHANGED: "PRICE_CHANGED",
  ORDER_NOT_CANCELLABLE: "ORDER_NOT_CANCELLABLE",
  OUTSIDE_DELIVERY_AREA: "OUTSIDE_DELIVERY_AREA",
  SLOT_FULL: "SLOT_FULL",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
