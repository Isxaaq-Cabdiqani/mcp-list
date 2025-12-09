/**
 * Pagination functionality for MCP servers
 */

import type { PaginationState } from "../../scripts/types.js";

/**
 * Default page size options
 */
export const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

/**
 * Default page size
 */
export const DEFAULT_PAGE_SIZE = 24;

/**
 * Create initial pagination state
 */
export function createPaginationState(
  totalItems: number,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginationState {
  return {
    page: 1,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}

/**
 * Update pagination state with new total items
 */
export function updatePaginationTotal(
  state: PaginationState,
  totalItems: number
): PaginationState {
  const totalPages = Math.ceil(totalItems / state.pageSize);

  return {
    ...state,
    totalItems,
    totalPages,
    // Reset to page 1 if current page is now invalid
    page: state.page > totalPages ? 1 : state.page,
  };
}

/**
 * Change page
 */
export function setPage(
  state: PaginationState,
  page: number
): PaginationState {
  const clampedPage = Math.max(1, Math.min(page, state.totalPages));
  return { ...state, page: clampedPage };
}

/**
 * Go to next page
 */
export function nextPage(state: PaginationState): PaginationState {
  return setPage(state, state.page + 1);
}

/**
 * Go to previous page
 */
export function prevPage(state: PaginationState): PaginationState {
  return setPage(state, state.page - 1);
}

/**
 * Change page size
 */
export function setPageSize(
  state: PaginationState,
  pageSize: number
): PaginationState {
  const totalPages = Math.ceil(state.totalItems / pageSize);

  // Calculate which page to go to based on the first item of the current page
  const firstItemIndex = (state.page - 1) * state.pageSize;
  const newPage = Math.floor(firstItemIndex / pageSize) + 1;

  return {
    ...state,
    pageSize,
    totalPages,
    page: Math.min(newPage, totalPages),
  };
}

/**
 * Get the slice of items for the current page
 */
export function paginateItems<T>(items: T[], state: PaginationState): T[] {
  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  return items.slice(start, end);
}

/**
 * Get pagination info for display
 */
export function getPaginationInfo(state: PaginationState): {
  start: number;
  end: number;
  total: number;
} {
  const start = (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.page * state.pageSize, state.totalItems);

  return {
    start,
    end,
    total: state.totalItems,
  };
}

/**
 * Get page numbers to display in pagination UI
 * Shows current page plus surrounding pages, with ellipsis for gaps
 */
export function getPageNumbers(
  state: PaginationState,
  maxVisible: number = 7
): (number | "...")[] {
  const { page, totalPages } = state;

  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  const sidePages = Math.floor((maxVisible - 3) / 2);

  // Always show first page
  pages.push(1);

  // Calculate range around current page
  let rangeStart = Math.max(2, page - sidePages);
  let rangeEnd = Math.min(totalPages - 1, page + sidePages);

  // Adjust range if at edges
  if (page <= sidePages + 2) {
    rangeEnd = maxVisible - 2;
  } else if (page >= totalPages - sidePages - 1) {
    rangeStart = totalPages - maxVisible + 3;
  }

  // Add ellipsis before range if needed
  if (rangeStart > 2) {
    pages.push("...");
  }

  // Add pages in range
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Add ellipsis after range if needed
  if (rangeEnd < totalPages - 1) {
    pages.push("...");
  }

  // Always show last page
  pages.push(totalPages);

  return pages;
}

/**
 * Check if can go to previous page
 */
export function canGoPrev(state: PaginationState): boolean {
  return state.page > 1;
}

/**
 * Check if can go to next page
 */
export function canGoNext(state: PaginationState): boolean {
  return state.page < state.totalPages;
}
