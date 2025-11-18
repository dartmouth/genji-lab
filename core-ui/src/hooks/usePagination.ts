import { useState, useMemo, useEffect } from "react";

interface UsePaginationProps<T> {
  items: T[];
  itemsPerPage: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  paginatedItems: T[];
  startIndex: number;
  endIndex: number;
  handlePageChange: (event: React.ChangeEvent<unknown>, page: number) => void;
}

export function usePagination<T>({
  items,
  itemsPerPage,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when items change
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const { startIndex, endIndex } = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return { startIndex: start, endIndex: end };
  }, [currentPage, itemsPerPage]);

  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
    // Scroll to top of gallery when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    startIndex,
    endIndex,
    handlePageChange,
  };
}
