import { useState, useMemo } from "react";

interface UsePaginationResult<T> {
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

export function usePagination<T>(items: T[] | undefined, defaultItemsPerPage: number = 10): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

  const safeItems = items || [];
  const totalItems = safeItems.length;
  
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Ensure current page doesn't exceed total pages if list shrinks
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return safeItems.slice(startIndex, startIndex + itemsPerPage);
  }, [safeItems, safeCurrentPage, itemsPerPage]);

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
    resetPagination
  };
}
