/**
 * Search Bar Component
 * Provides search input with debouncing
 */

/**
 * Search icon SVG
 */
const searchIcon = `<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
</svg>`;

/**
 * Clear icon SVG
 */
const clearIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
</svg>`;

export interface SearchBarOptions {
  placeholder?: string;
  debounceMs?: number;
  initialValue?: string;
  onSearch: (query: string) => void;
}

/**
 * Create search bar component
 */
export function createSearchBar(options: SearchBarOptions): HTMLElement {
  const {
    placeholder = "Search servers by name, description, or keywords...",
    debounceMs = 300,
    initialValue = "",
    onSearch,
  } = options;

  const container = document.createElement("div");
  container.className = "relative";

  // Create input
  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-input pl-10 pr-10";
  input.placeholder = placeholder;
  input.value = initialValue;
  input.setAttribute("aria-label", "Search servers");

  // Create search icon
  const iconContainer = document.createElement("div");
  iconContainer.innerHTML = searchIcon;

  // Create clear button
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = `absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${initialValue ? "" : "hidden"}`;
  clearBtn.innerHTML = clearIcon;
  clearBtn.setAttribute("aria-label", "Clear search");

  // Assemble
  container.appendChild(iconContainer.firstElementChild!);
  container.appendChild(input);
  container.appendChild(clearBtn);

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout>;

  // Handle input
  input.addEventListener("input", () => {
    const value = input.value.trim();

    // Show/hide clear button
    clearBtn.classList.toggle("hidden", !value);

    // Debounce the search
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);
  });

  // Handle clear button
  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.classList.add("hidden");
    onSearch("");
    input.focus();
  });

  // Handle keyboard shortcuts
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) {
      e.preventDefault();
      input.value = "";
      clearBtn.classList.add("hidden");
      onSearch("");
    }
  });

  return container;
}

/**
 * Update search bar value programmatically
 */
export function updateSearchBarValue(
  container: HTMLElement,
  value: string
): void {
  const input = container.querySelector("input");
  const clearBtn = container.querySelector("button");

  if (input) {
    input.value = value;
  }

  if (clearBtn) {
    clearBtn.classList.toggle("hidden", !value);
  }
}
