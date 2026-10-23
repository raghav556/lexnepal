import { useState, useMemo, useCallback } from "react";

export interface UsePaginationOptions<T> {
  items?: T[];
  itemsPerPage?: number;
  /** Optional collection/filter identity. A change returns to the first page. */
  resetKey?: string;
}

export interface UsePaginationResult<T> {
  currentPage: number;
  totalPages: number;
  paginatedItems: T[];
  totalItems: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setItemsPerPage: (num: number) => void;
  itemsPerPage: number;
  resetPagination: () => void;
}

export function calculatePagination<T>(rawItems: T[] | undefined, page: number, limit: number) {
  const safeItems = Array.isArray(rawItems) ? rawItems : [];
  const totalItems = safeItems.length;
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit) || 10) : 10;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
  const safeCurrentPage = Math.min(
    Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1),
    totalPages,
  );
  const startIndex = (safeCurrentPage - 1) * safeLimit;
  const paginatedItems = safeItems.slice(startIndex, startIndex + safeLimit);

  return {
    safeItems,
    totalItems,
    totalPages,
    safeCurrentPage,
    paginatedItems,
  };
}

/**
 * Flexible pagination hook that supports both signatures:
 * 1. `usePagination(items, defaultItemsPerPage)`
 * 2. `usePagination({ items, itemsPerPage })`
 */
export function usePagination<T>(
  itemsOrOptions?: T[] | UsePaginationOptions<T>,
  defaultItemsPerPage: number = 10,
): UsePaginationResult<T> {
  const isOptionsObject =
    itemsOrOptions !== null &&
    typeof itemsOrOptions === "object" &&
    !Array.isArray(itemsOrOptions) &&
    ("items" in itemsOrOptions || "itemsPerPage" in itemsOrOptions);

  const rawItems = isOptionsObject
    ? (itemsOrOptions as UsePaginationOptions<T>).items
    : (itemsOrOptions as T[] | undefined);

  const initialLimit = isOptionsObject
    ? ((itemsOrOptions as UsePaginationOptions<T>).itemsPerPage ?? defaultItemsPerPage)
    : defaultItemsPerPage;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit);
  const resetKey = isOptionsObject
    ? (itemsOrOptions as UsePaginationOptions<T>).resetKey
    : undefined;
  const [seenResetKey, setSeenResetKey] = useState(resetKey);

  const { totalItems, totalPages, safeCurrentPage, paginatedItems } = useMemo(() => {
    return calculatePagination(rawItems, currentPage, itemsPerPage);
  }, [rawItems, currentPage, itemsPerPage]);

  // Persist the clamp. Otherwise Previous can appear inert after deletion, and
  // a later refresh can resurrect a page that was no longer valid.
  if (currentPage !== safeCurrentPage) setCurrentPage(safeCurrentPage);
  if (seenResetKey !== resetKey) {
    setSeenResetKey(resetKey);
    setCurrentPage(1);
  }

  const goToPage = useCallback(
    (page: number) => {
      const pageNumber = Math.max(
        1,
        Math.min(Number.isFinite(page) ? Math.floor(page) : 1, totalPages),
      );
      setCurrentPage(pageNumber);
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(Math.min(prev, totalPages) - 1, 1));
  }, [totalPages]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage: safeCurrentPage,
    totalPages,
    paginatedItems,
    totalItems,
    goToPage,
    nextPage,
    prevPage,
    itemsPerPage,
    setItemsPerPage,
    resetPagination,
  };
}
