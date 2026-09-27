import { cookies } from "next/headers";
import { ErrorCode, type ApiErrorBody } from "@kirana/shared";

import { ApiError } from "./api";

const API_URL = process.env.API_URL ?? "http://localhost:3001/api";

/**
 * A request to the API **as the current visitor**.
 *
 * The browser's cookies do not travel on a fetch made by the Next server —
 * that fetch is a fresh connection from a different machine as far as the API
 * is concerned. So the session and cart cookies are copied onto the outgoing
 * request by hand, and any cookie the API sets in reply is copied back onto the
 * response to the browser.
 *
 * Doing it this way means the browser never talks to the API directly. The
 * session cookie can stay httpOnly, no CORS credentials are involved, and the
 * API's address is never in the bundle.
 */
export async function apiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const store = await cookies();

  const outgoing = store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const response = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      ...(outgoing ? { cookie: outgoing } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    // Never cached. A cart cached for one visitor and served to another is the
    // worst bug in this file's neighbourhood.
    cache: "no-store",
  });

  await adoptCookies(response, store);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      body?.message ?? `Request to ${path} failed with ${response.status}`,
      body?.code ?? ErrorCode.INTERNAL_ERROR,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/**
 * Re-issues the API's Set-Cookie headers to the browser.
 *
 * `getSetCookie()` rather than `get("set-cookie")`: a response can set several
 * cookies, and `get` joins them into one string that cannot be split again
 * reliably, because an Expires value contains a comma.
 *
 * Only writable during a server action or route handler. During a page render
 * the store is read-only and `set` throws, which is why the throw is swallowed:
 * a page that reads the cart does not need to mint a cart cookie.
 */
async function adoptCookies(response: Response, store: CookieStore): Promise<void> {
  for (const header of response.headers.getSetCookie()) {
    const parsed = parseSetCookie(header);
    if (!parsed) continue;

    try {
      store.set(parsed.name, parsed.value, parsed.options);
    } catch {
      // Read-only context. Nothing to do and nothing broken.
      return;
    }
  }
}

function parseSetCookie(header: string) {
  const [pair, ...attributes] = header.split(";");
  const separator = pair?.indexOf("=") ?? -1;
  if (!pair || separator < 1) return null;

  const options: {
    path?: string;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  } = {};

  for (const attribute of attributes) {
    const [rawKey, ...rest] = attribute.trim().split("=");
    const key = rawKey?.toLowerCase();
    const value = rest.join("=");

    if (key === "path") options.path = value;
    else if (key === "max-age") options.maxAge = Number(value);
    else if (key === "httponly") options.httpOnly = true;
    else if (key === "secure") options.secure = true;
    else if (key === "samesite") {
      const lowered = value.toLowerCase();
      if (lowered === "lax" || lowered === "strict" || lowered === "none") {
        options.sameSite = lowered;
      }
    }
  }

  return {
    name: pair.slice(0, separator),
    value: decodeURIComponent(pair.slice(separator + 1)),
    options,
  };
}
