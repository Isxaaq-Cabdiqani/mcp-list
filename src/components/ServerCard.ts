/**
 * Server Card Component
 * Displays a single MCP server as a card
 */

import type { MCPServer, RegistryType } from "../../scripts/types.js";

/**
 * Format a number with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format a date as relative time or absolute
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Get badge class for package type
 */
function getBadgeClass(type: RegistryType): string {
  const classes: Record<RegistryType, string> = {
    npm: "badge-npm",
    pypi: "badge-pypi",
    nuget: "badge-nuget",
    oci: "badge-oci",
    mcpb: "badge-mcpb",
  };
  return classes[type] || "badge-npm";
}

/**
 * Get display name for package type
 */
function getPackageTypeName(type: RegistryType): string {
  const names: Record<RegistryType, string> = {
    npm: "npm",
    pypi: "PyPI",
    nuget: "NuGet",
    oci: "Docker",
    mcpb: "MCPB",
  };
  return names[type] || type;
}

/**
 * Star icon SVG
 */
const starIcon = `<svg class="stat-icon" fill="currentColor" viewBox="0 0 20 20">
  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
</svg>`;

/**
 * Download icon SVG
 */
const downloadIcon = `<svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
</svg>`;

/**
 * Clock icon SVG
 */
const clockIcon = `<svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>`;

/**
 * External link icon SVG
 */
const externalLinkIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
</svg>`;

/**
 * Create a server card element
 */
export function createServerCard(server: MCPServer): HTMLElement {
  const card = document.createElement("article");
  card.className = "server-card animate-fade-in";
  card.setAttribute("data-server", server.name);

  // Build card HTML
  card.innerHTML = `
    <div class="server-card-header">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate" title="${escapeHtml(server.name)}">
            ${escapeHtml(server._computed?.serverName || server.name)}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 truncate" title="${escapeHtml(server._computed?.organization || "")}">
            ${escapeHtml(server._computed?.organization || "")}
          </p>
        </div>
        ${server.enrichment?.github?.owner?.avatar ? `
          <img
            src="${escapeHtml(server.enrichment.github.owner.avatar)}"
            alt="${escapeHtml(server.enrichment.github.owner.login)}"
            class="w-10 h-10 rounded-full flex-shrink-0"
            loading="lazy"
          />
        ` : ""}
      </div>
    </div>

    <div class="server-card-body space-y-3">
      <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
        ${escapeHtml(server.description || "No description available")}
      </p>

      <!-- Package Types -->
      <div class="flex flex-wrap gap-1.5">
        ${(server._computed?.packageTypes || [])
          .map(
            (type) =>
              `<span class="badge ${getBadgeClass(type)}">${getPackageTypeName(type)}</span>`
          )
          .join("")}
        ${server._computed?.hasRemote ? '<span class="badge badge-remote">Remote</span>' : ""}
        ${server.status === "deprecated" ? '<span class="badge badge-deprecated">Deprecated</span>' : ""}
      </div>

      <!-- Stats -->
      <div class="flex flex-wrap gap-4 pt-1">
        ${server._computed?.stars ? `
          <span class="stat" title="GitHub stars">
            ${starIcon}
            <span>${formatNumber(server._computed.stars)}</span>
          </span>
        ` : ""}
        ${server._computed?.totalDownloads ? `
          <span class="stat" title="Total downloads">
            ${downloadIcon}
            <span>${formatNumber(server._computed.totalDownloads)}</span>
          </span>
        ` : ""}
        <span class="stat" title="Last updated">
          ${clockIcon}
          <span>${formatDate(server.updatedAt)}</span>
        </span>
      </div>

      <!-- Topics/Keywords -->
      ${renderTopics(server)}
    </div>

    <div class="server-card-footer">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
          v${escapeHtml(server.version)}
        </span>
        <div class="flex items-center gap-2">
          ${server.repository?.url ? `
            <a
              href="${escapeHtml(server.repository.url)}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              title="View repository"
            >
              ${externalLinkIcon}
            </a>
          ` : ""}
        </div>
      </div>
    </div>
  `;

  return card;
}

/**
 * Render topics/keywords section
 */
function renderTopics(server: MCPServer): string {
  const topics = new Set<string>();

  // Collect topics from various sources
  server.enrichment?.github?.topics?.forEach((t) => topics.add(t));
  server.enrichment?.npm?.keywords?.slice(0, 5).forEach((k) => topics.add(k));
  server.enrichment?.pypi?.keywords?.slice(0, 5).forEach((k) => topics.add(k));

  if (topics.size === 0) return "";

  const topicArray = Array.from(topics).slice(0, 5);

  return `
    <div class="flex flex-wrap gap-1 pt-1">
      ${topicArray
        .map(
          (topic) =>
            `<span class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">${escapeHtml(topic)}</span>`
        )
        .join("")}
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create multiple server cards
 */
export function createServerCards(servers: MCPServer[]): HTMLElement[] {
  return servers.map(createServerCard);
}

/**
 * Render server cards into a container
 */
export function renderServerCards(
  container: HTMLElement,
  servers: MCPServer[]
): void {
  container.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const cards = createServerCards(servers);

  cards.forEach((card) => fragment.appendChild(card));
  container.appendChild(fragment);
}
