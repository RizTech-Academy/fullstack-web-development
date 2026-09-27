/**
 * Where to go after signing in, checked before it is used anywhere.
 *
 * Handing a `next` parameter straight to a redirect is an open redirect: a link
 * to /account/login?next=https://evil.example sends the customer to a copy of
 * the shop immediately after they have typed a password. This allows one leading
 * slash and nothing else, which rules out both absolute URLs and the
 * protocol-relative "//evil.example".
 *
 * The same check runs again in the server action. Belt and braces, because this
 * one is about what the page renders and that one is about where it sends
 * somebody.
 */
export function safeNextParam(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^\/(?!\/)/.test(value) ? value : "/products";
}
