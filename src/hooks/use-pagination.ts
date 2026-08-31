import { useState, useMemo } from "react";

export interface UsePaginationOptions<T> {
  items?: T[];
  itemsPerPage?: number;
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
  const safeLimit = Math.max(1, limit || 10);
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
  const safeCurrentPage = Math.min(Math.max(1, page), totalPages);
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

  const { totalItems, totalPages, safeCurrentPage, paginatedItems } = useMemo(() => {
    return calculatePagination(rawItems, currentPage, itemsPerPage);
  }, [rawItems, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

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
