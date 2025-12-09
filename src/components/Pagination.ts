/**
 * Pagination Component
 * Provides pagination controls
 */

import type { PaginationState } from "../../scripts/types.js";
import {
  getPageNumbers,
  getPaginationInfo,
  canGoPrev,
  canGoNext,
} from "../lib/pagination.js";

export interface PaginationOptions {
  state: PaginationState;
  onPageChange: (page: number) => void;
}

/**
 * Left arrow icon SVG
 */
const leftArrowIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
</svg>`;

/**
 * Right arrow icon SVG
 */
const rightArrowIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>`;

/**
 * Create pagination component
 */
export function createPagination(options: PaginationOptions): HTMLElement {
  const { state, onPageChange } = options;

  const container = document.createElement("nav");
  container.className = "flex flex-col sm:flex-row items-center justify-between gap-4";
  container.setAttribute("aria-label", "Pagination");

  // Info text
  const info = getPaginationInfo(state);
  const infoText = document.createElement("p");
  infoText.className = "text-sm text-gray-600 dark:text-gray-400";
  infoText.textContent = `Showing ${info.start} - ${info.end} of ${info.total} servers`;

  // Navigation buttons container
  const nav = document.createElement("div");
  nav.className = "flex items-center gap-1";

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "pagination-btn";
  prevBtn.innerHTML = leftArrowIcon;
  prevBtn.disabled = !canGoPrev(state);
  prevBtn.setAttribute("aria-label", "Previous page");
  prevBtn.addEventListener("click", () => {
    if (canGoPrev(state)) {
      onPageChange(state.page - 1);
    }
  });
  nav.appendChild(prevBtn);

  // Page number buttons
  const pageNumbers = getPageNumbers(state);
  pageNumbers.forEach((pageNum) => {
    if (pageNum === "...") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "px-2 text-gray-500 dark:text-gray-400";
      ellipsis.textContent = "...";
      nav.appendChild(ellipsis);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        pageNum === state.page ? "pagination-btn-active" : "pagination-btn";
      btn.textContent = pageNum.toString();
      btn.setAttribute("aria-label", `Page ${pageNum}`);
      btn.setAttribute("aria-current", pageNum === state.page ? "page" : "false");
      btn.addEventListener("click", () => onPageChange(pageNum));
      nav.appendChild(btn);
    }
  });

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "pagination-btn";
  nextBtn.innerHTML = rightArrowIcon;
  nextBtn.disabled = !canGoNext(state);
  nextBtn.setAttribute("aria-label", "Next page");
  nextBtn.addEventListener("click", () => {
    if (canGoNext(state)) {
      onPageChange(state.page + 1);
    }
  });
  nav.appendChild(nextBtn);

  container.appendChild(infoText);
  container.appendChild(nav);

  return container;
}

/**
 * Render pagination into container
 */
export function renderPagination(
  container: HTMLElement,
  state: PaginationState,
  onPageChange: (page: number) => void
): void {
  container.innerHTML = "";

  if (state.totalPages <= 1) {
    return;
  }

  const pagination = createPagination({ state, onPageChange });
  container.appendChild(pagination);
}
