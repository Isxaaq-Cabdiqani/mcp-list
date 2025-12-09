/**
 * Filter Controls Component
 * Provides multi-select filtering for package types
 */

import type { RegistryType } from "../../scripts/types.js";

export interface FilterControlsOptions {
  initialPackageTypes?: RegistryType[];
  initialHasRemote?: boolean | null;
  onFilter: (packageTypes: RegistryType[], hasRemote: boolean | null) => void;
}

/**
 * Package type options with labels
 */
const PACKAGE_TYPE_OPTIONS: Array<{ type: RegistryType; label: string }> = [
  { type: "npm", label: "npm" },
  { type: "pypi", label: "PyPI" },
  { type: "nuget", label: "NuGet" },
  { type: "oci", label: "Docker" },
  { type: "mcpb", label: "MCPB" },
];

/**
 * Create filter chip element
 */
function createFilterChip(
  label: string,
  isActive: boolean,
  onClick: () => void
): HTMLElement {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = isActive ? "filter-chip-active" : "filter-chip-inactive";
  chip.textContent = label;
  chip.addEventListener("click", onClick);
  return chip;
}

/**
 * Create filter controls component
 */
export function createFilterControls(options: FilterControlsOptions): HTMLElement {
  const {
    initialPackageTypes = [],
    initialHasRemote = null,
    onFilter,
  } = options;

  let selectedTypes = new Set<RegistryType>(initialPackageTypes);
  let hasRemote: boolean | null = initialHasRemote;

  const container = document.createElement("div");
  container.className = "space-y-3";

  // Package type filters
  const packageTypeContainer = document.createElement("div");
  packageTypeContainer.className = "flex flex-wrap items-center gap-2";

  const packageTypeLabel = document.createElement("span");
  packageTypeLabel.className = "text-sm font-medium text-gray-700 dark:text-gray-300";
  packageTypeLabel.textContent = "Package:";
  packageTypeContainer.appendChild(packageTypeLabel);

  const packageTypeChips = document.createElement("div");
  packageTypeChips.className = "flex flex-wrap gap-2";

  function renderPackageTypeChips() {
    packageTypeChips.innerHTML = "";

    PACKAGE_TYPE_OPTIONS.forEach(({ type, label }) => {
      const isActive = selectedTypes.has(type);
      const chip = createFilterChip(label, isActive, () => {
        if (isActive) {
          selectedTypes.delete(type);
        } else {
          selectedTypes.add(type);
        }
        renderPackageTypeChips();
        onFilter(Array.from(selectedTypes), hasRemote);
      });
      packageTypeChips.appendChild(chip);
    });
  }

  packageTypeContainer.appendChild(packageTypeChips);
  container.appendChild(packageTypeContainer);

  // Remote filter
  const remoteContainer = document.createElement("div");
  remoteContainer.className = "flex items-center gap-2";

  const remoteLabel = document.createElement("span");
  remoteLabel.className = "text-sm font-medium text-gray-700 dark:text-gray-300";
  remoteLabel.textContent = "Remote:";
  remoteContainer.appendChild(remoteLabel);

  const remoteChips = document.createElement("div");
  remoteChips.className = "flex gap-2";

  function renderRemoteChips() {
    remoteChips.innerHTML = "";

    // "All" chip
    const allChip = createFilterChip("All", hasRemote === null, () => {
      hasRemote = null;
      renderRemoteChips();
      onFilter(Array.from(selectedTypes), hasRemote);
    });
    remoteChips.appendChild(allChip);

    // "Yes" chip
    const yesChip = createFilterChip("Yes", hasRemote === true, () => {
      hasRemote = true;
      renderRemoteChips();
      onFilter(Array.from(selectedTypes), hasRemote);
    });
    remoteChips.appendChild(yesChip);

    // "No" chip
    const noChip = createFilterChip("No", hasRemote === false, () => {
      hasRemote = false;
      renderRemoteChips();
      onFilter(Array.from(selectedTypes), hasRemote);
    });
    remoteChips.appendChild(noChip);
  }

  remoteContainer.appendChild(remoteChips);
  container.appendChild(remoteContainer);

  // Clear all button
  const clearContainer = document.createElement("div");
  clearContainer.className = "flex justify-end";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300";
  clearBtn.textContent = "Clear filters";
  clearBtn.addEventListener("click", () => {
    selectedTypes.clear();
    hasRemote = null;
    renderPackageTypeChips();
    renderRemoteChips();
    onFilter([], null);
  });
  clearContainer.appendChild(clearBtn);
  container.appendChild(clearContainer);

  // Initial render
  renderPackageTypeChips();
  renderRemoteChips();

  return container;
}


