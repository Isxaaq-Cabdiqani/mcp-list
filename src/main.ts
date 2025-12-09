/**
 * MCP Server Directory - Main Application
 */

import type {
  MCPServer,
  SortOption,
  RegistryType,
  PaginationState,
  FilterState,
  SyncState,
} from "../scripts/types.js";
import { searchServers } from "./lib/search.js";
import { sortServersByOption, DEFAULT_SORT, SORT_OPTIONS, getSortOptionIndex } from "./lib/sort.js";
import {
  createPaginationState,
  updatePaginationTotal,
  setPage,
  paginateItems,
  DEFAULT_PAGE_SIZE,
} from "./lib/pagination.js";
import { createSearchBar } from "./components/SearchBar.js";
import { createSortControls } from "./components/SortControls.js";
import { createFilterControls } from "./components/FilterControls.js";
import { renderServerCards } from "./components/ServerCard.js";
import { renderPagination } from "./components/Pagination.js";

// =============================================================================
// Application State
// =============================================================================

interface AppState {
  servers: MCPServer[];
  filteredServers: MCPServer[];
  filter: FilterState;
  sort: SortOption;
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
  syncState: SyncState | null;
}

const state: AppState = {
  servers: [],
  filteredServers: [],
  filter: {
    search: "",
    packageTypes: [],
    hasRemote: null,
    status: ["active"],
  },
  sort: DEFAULT_SORT,
  pagination: createPaginationState(0, DEFAULT_PAGE_SIZE),
  isLoading: true,
  error: null,
  syncState: null,
};

// =============================================================================
// DOM Elements
// =============================================================================

const elements = {
  loading: document.getElementById("loading")!,
  error: document.getElementById("error")!,
  empty: document.getElementById("empty")!,
  serverGrid: document.getElementById("server-grid")!,
  searchContainer: document.getElementById("search-container")!,
  filterContainer: document.getElementById("filter-container")!,
  sortContainer: document.getElementById("sort-container")!,
  paginationContainer: document.getElementById("pagination-container")!,
  resultsCount: document.getElementById("results-count")!,
  themeToggle: document.getElementById("theme-toggle")!,
  lastSync: document.getElementById("last-sync")!,
};

// =============================================================================
// URL State Management
// =============================================================================

function getStateFromURL(): Partial<FilterState & { sort: number; page: number }> {
  const params = new URLSearchParams(window.location.search);

  return {
    search: params.get("q") || "",
    packageTypes: params.get("types")?.split(",").filter(Boolean) as RegistryType[] || [],
    hasRemote: params.has("remote") ? params.get("remote") === "true" : null,
    sort: params.has("sort") ? parseInt(params.get("sort")!, 10) : 0,
    page: params.has("page") ? parseInt(params.get("page")!, 10) : 1,
  };
}

function updateURL(): void {
  const params = new URLSearchParams();

  if (state.filter.search) {
    params.set("q", state.filter.search);
  }

  if (state.filter.packageTypes.length > 0) {
    params.set("types", state.filter.packageTypes.join(","));
  }

  if (state.filter.hasRemote !== null) {
    params.set("remote", state.filter.hasRemote.toString());
  }

  const sortIndex = getSortOptionIndex(state.sort);
  if (sortIndex > 0) {
    params.set("sort", sortIndex.toString());
  }

  if (state.pagination.page > 1) {
    params.set("page", state.pagination.page.toString());
  }

  const queryString = params.toString();
  const newURL = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  window.history.replaceState(null, "", newURL);
}

// =============================================================================
// Data Loading
// =============================================================================

async function loadData(): Promise<void> {
  try {
    state.isLoading = true;
    state.error = null;
    render();

    // Fetch server data
    const serversResponse = await fetch("./data/servers.json");
    if (!serversResponse.ok) {
      throw new Error(`Failed to load servers: ${serversResponse.status}`);
    }
    state.servers = await serversResponse.json();

    // Fetch sync state
    try {
      const syncStateResponse = await fetch("./data/sync-state.json");
      if (syncStateResponse.ok) {
        state.syncState = await syncStateResponse.json();
      }
    } catch {
      // Sync state is optional
    }

    // Apply initial filters from URL
    const urlState = getStateFromURL();
    state.filter.search = urlState.search || "";
    state.filter.packageTypes = urlState.packageTypes || [];
    state.filter.hasRemote = urlState.hasRemote ?? null;
    state.sort = SORT_OPTIONS[urlState.sort ?? 0] || DEFAULT_SORT;

    // Apply filters and sorting
    applyFiltersAndSort();

    // Set initial page from URL
    if (urlState.page && urlState.page > 1) {
      state.pagination = setPage(state.pagination, urlState.page);
    }

    state.isLoading = false;
    render();
  } catch (error) {
    console.error("Failed to load data:", error);
    state.isLoading = false;
    state.error = error instanceof Error ? error.message : "Unknown error";
    render();
  }
}

// =============================================================================
// Filtering and Sorting
// =============================================================================

function applyFiltersAndSort(): void {
  let filtered = [...state.servers];

  // Filter by status (always exclude deleted, show active by default)
  filtered = filtered.filter((s) => s.status !== "deleted");

  // Filter by search query
  if (state.filter.search) {
    filtered = searchServers(filtered, state.filter.search);
  }

  // Filter by package types
  if (state.filter.packageTypes.length > 0) {
    filtered = filtered.filter((s) =>
      state.filter.packageTypes.some((type) =>
        s._computed?.packageTypes?.includes(type)
      )
    );
  }

  // Filter by has remote
  if (state.filter.hasRemote !== null) {
    filtered = filtered.filter(
      (s) => s._computed?.hasRemote === state.filter.hasRemote
    );
  }

  // Sort (skip if search is active - search already sorts by relevance)
  if (!state.filter.search) {
    filtered = sortServersByOption(filtered, state.sort);
  }

  state.filteredServers = filtered;

  // Update pagination
  state.pagination = updatePaginationTotal(state.pagination, filtered.length);
}

// =============================================================================
// Event Handlers
// =============================================================================

function handleSearch(query: string): void {
  state.filter.search = query;
  applyFiltersAndSort();
  state.pagination = setPage(state.pagination, 1);
  updateURL();
  render();
}

function handleSort(option: SortOption): void {
  state.sort = option;
  applyFiltersAndSort();
  state.pagination = setPage(state.pagination, 1);
  updateURL();
  render();
}

function handleFilter(packageTypes: RegistryType[], hasRemote: boolean | null): void {
  state.filter.packageTypes = packageTypes;
  state.filter.hasRemote = hasRemote;
  applyFiltersAndSort();
  state.pagination = setPage(state.pagination, 1);
  updateURL();
  render();
}

function handlePageChange(page: number): void {
  state.pagination = setPage(state.pagination, page);
  updateURL();
  render();

  // Scroll to top of grid
  elements.serverGrid.scrollIntoView({ behavior: "smooth", block: "start" });
}

// =============================================================================
// Theme Management
// =============================================================================

function initTheme(): void {
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (stored === "dark" || (!stored && prefersDark)) {
    document.documentElement.classList.add("dark");
  }

  elements.themeToggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  });
}

// =============================================================================
// Rendering
// =============================================================================

function render(): void {
  // Show/hide states
  elements.loading.classList.toggle("hidden", !state.isLoading);
  elements.error.classList.toggle("hidden", state.isLoading || !state.error);
  elements.empty.classList.toggle(
    "hidden",
    state.isLoading || state.error !== null || state.filteredServers.length > 0
  );
  elements.serverGrid.classList.toggle(
    "hidden",
    state.isLoading || state.error !== null || state.filteredServers.length === 0
  );
  elements.paginationContainer.classList.toggle(
    "hidden",
    state.isLoading || state.error !== null || state.filteredServers.length === 0
  );

  if (state.isLoading || state.error) {
    return;
  }

  // Results count
  elements.resultsCount.textContent = `${state.filteredServers.length} server${state.filteredServers.length !== 1 ? "s" : ""} found`;

  // Server cards
  const pageServers = paginateItems(state.filteredServers, state.pagination);
  renderServerCards(elements.serverGrid, pageServers);

  // Pagination
  renderPagination(
    elements.paginationContainer,
    state.pagination,
    handlePageChange
  );

  // Last sync time
  if (state.syncState?.lastSyncAt) {
    const syncDate = new Date(state.syncState.lastSyncAt);
    elements.lastSync.textContent = `Last updated: ${syncDate.toLocaleString()}`;
  }
}

function initComponents(): void {
  const urlState = getStateFromURL();

  // Search bar
  const searchBar = createSearchBar({
    initialValue: urlState.search || "",
    onSearch: handleSearch,
  });
  elements.searchContainer.appendChild(searchBar);

  // Filter controls
  const filterControls = createFilterControls({
    initialPackageTypes: urlState.packageTypes || [],
    initialHasRemote: urlState.hasRemote ?? null,
    onFilter: handleFilter,
  });
  elements.filterContainer.appendChild(filterControls);

  // Sort controls
  const sortControls = createSortControls({
    initialOption: SORT_OPTIONS[urlState.sort ?? 0] || DEFAULT_SORT,
    onSort: handleSort,
  });
  elements.sortContainer.appendChild(sortControls);
}

// =============================================================================
// Keyboard Navigation
// =============================================================================

function initKeyboardNav(): void {
  document.addEventListener("keydown", (e) => {
    // Focus search on "/" key
    if (e.key === "/" && !isInputFocused()) {
      e.preventDefault();
      const searchInput = elements.searchContainer.querySelector("input");
      searchInput?.focus();
    }

    // Navigate pages with arrow keys when not in input
    if (!isInputFocused()) {
      if (e.key === "ArrowLeft" && state.pagination.page > 1) {
        handlePageChange(state.pagination.page - 1);
      } else if (
        e.key === "ArrowRight" &&
        state.pagination.page < state.pagination.totalPages
      ) {
        handlePageChange(state.pagination.page + 1);
      }
    }
  });
}

function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement
  );
}

// =============================================================================
// Initialize
// =============================================================================

async function init(): Promise<void> {
  initTheme();
  initComponents();
  initKeyboardNav();
  await loadData();
}

// Start the app
init();
