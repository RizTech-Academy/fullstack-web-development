export interface Paginated<T> {
  items: T[];
  /** The page actually served, which may differ from the one requested. */
  page: number;
  /** The limit actually applied, after clamping. */
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
