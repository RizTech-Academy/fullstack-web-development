import type {
  CategoryOption,
  Paginated,
  ProductDetail,
  ProductSummary,
} from "@kirana/shared";
import { ErrorCode, type ApiErrorBody } from "@kirana/shared";

/**
 * Server-side only. `API_URL` has no NEXT_PUBLIC_ prefix, so it is not in the
 * browser bundle, and inside Docker or on a platform with private networking
 * the API address the server uses is often not the one the browser can reach.
 */
const API_URL = process.env.API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string = ErrorCode.INTERNAL_ERROR,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type GetOptions = {
  /** Seconds. Omit for no caching at all. */
  revalidate?: number;
  /** Cache tags, so a write can invalidate exactly these pages. */
  tags?: string[];
};

async function get<T>(path: string, options: GetOptions = {}): Promise<T> {
  // In Next 15 fetch is not cached unless you ask, which is the right default
  // and the opposite of Next 14. Ask explicitly for the catalogue.
  const response = await fetch(`${API_URL}${path}`, {
    next: {
      revalidate: options.revalidate,
      tags: options.tags,
    },
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      body?.message ?? `Request to ${path} failed with ${response.status}`,
      body?.code,
    );
  }

  return (await response.json()) as T;
}

export type ProductQuery = {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  inStock?: boolean;
};

function toQueryString(query: ProductQuery): string {
  const params = new URLSearchParams();

  // Skipping empty values matters: `?q=` is a real filter as far as the API is
  // concerned, and it also makes two identical pages cache separately.
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.sort) params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.inStock) params.set("inStock", "true");

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export function fetchProducts(
  query: ProductQuery = {},
): Promise<Paginated<ProductSummary>> {
  return get(`/products${toQueryString(query)}`, {
    revalidate: 60,
    tags: ["catalogue"],
  });
}

export function fetchProduct(slug: string): Promise<ProductDetail> {
  return get(`/products/${encodeURIComponent(slug)}`, {
    revalidate: 60,
    tags: ["catalogue", `product:${slug}`],
  });
}

export function fetchCategories(): Promise<CategoryOption[]> {
  return get("/categories", { revalidate: 300, tags: ["catalogue"] });
}
