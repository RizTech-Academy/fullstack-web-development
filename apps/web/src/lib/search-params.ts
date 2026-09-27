/**
 * `searchParams` values are `string | string[] | undefined`, because a URL can
 * repeat a key: `?category=dairy&category=snacks` arrives as an array. Reading
 * one without handling that is the single most common bug in an App Router
 * page — `String(value)` on an array gives "dairy,snacks", which the API then
 * rejects or, worse, silently ignores.
 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

export function readString(
  params: RawSearchParams,
  key: string,
): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

export function readPage(params: RawSearchParams): number {
  const raw = readString(params, "page");
  const page = Number(raw ?? 1);
  // Number("") is 0 and Number("abc") is NaN. A page of 0 or NaN would build a
  // negative skip, so clamp rather than trust.
  return Number.isInteger(page) && page > 0 ? page : 1;
}
