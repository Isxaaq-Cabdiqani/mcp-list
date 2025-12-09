/**
 * Sort Controls Component
 * Provides dropdown for sort options
 */

import type { SortOption } from "../../scripts/types.js";
import { SORT_OPTIONS, getSortOptionIndex } from "../lib/sort.js";

export interface SortControlsOptions {
  initialOption?: SortOption;
  onSort: (option: SortOption) => void;
}

/**
 * Create sort controls component
 */
export function createSortControls(options: SortControlsOptions): HTMLElement {
  const { initialOption = SORT_OPTIONS[0], onSort } = options;

  const container = document.createElement("div");
  container.className = "flex items-center gap-2";

  // Label
  const label = document.createElement("label");
  label.className = "text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap";
  label.textContent = "Sort by:";
  label.htmlFor = "sort-select";

  // Select
  const select = document.createElement("select");
  select.id = "sort-select";
  select.className = "form-select flex-1";
  select.setAttribute("aria-label", "Sort servers");

  // Add options
  SORT_OPTIONS.forEach((opt, index) => {
    const option = document.createElement("option");
    option.value = index.toString();
    option.textContent = opt.label;
    option.selected = opt.field === initialOption.field && opt.direction === initialOption.direction;
    select.appendChild(option);
  });

  // Handle change
  select.addEventListener("change", () => {
    const index = parseInt(select.value, 10);
    const option = SORT_OPTIONS[index];
    if (option) {
      onSort(option);
    }
  });

  container.appendChild(label);
  container.appendChild(select);

  return container;
}

/**
 * Update sort controls value programmatically
 */
export function updateSortControlsValue(
  container: HTMLElement,
  option: SortOption
): void {
  const select = container.querySelector("select");
  if (select) {
    select.value = getSortOptionIndex(option).toString();
  }
}
