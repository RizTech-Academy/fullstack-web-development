import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { CART_COOKIE } from "@kirana/shared";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * An anonymous cart is identified by a random token in a cookie, and the token
 * is stored in `Cart.sessionId`.
 *
 * The cart's own id would be simpler and is a mistake: ids appear in URLs, logs
 * and error reports, and anybody who learns one could read and change that
 * cart. The token is a bearer credential, so it is httpOnly and nothing else
 * ever displays it.
 */
export function newCartToken(): string {
  return randomBytes(24).toString("base64url");
}

export function readCartCookie(request: Request): string | undefined {
  const value = request.cookies?.[CART_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function setCartCookie(response: Response, token: string): void {
  response.cookie(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Thirty days, because people fill a basket and come back at the weekend.
    maxAge: THIRTY_DAYS_MS,
  });
}

export function clearCartCookie(response: Response): void {
  response.clearCookie(CART_COOKIE, { path: "/" });
}
