/**
 * Fetch utilities with retry logic and timeout handling
 */

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error should be retried
 * Only retry on network/timeout errors, not on legitimate HTTP errors
 */
export function isRetriableError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const err = error as any;

    // Timeout errors
    if (
      err.code === "UND_ERR_CONNECT_TIMEOUT" ||
      err.code === "ETIMEDOUT" ||
      err.code === "ECONNREFUSED" ||
      err.code === "ECONNRESET"
    ) {
      return true;
    }

    // Abort errors (from our timeout)
    if (err.name === "AbortError") {
      return true;
    }

    // Generic fetch failures
    if (err.message?.includes("fetch failed")) {
      return true;
    }

    // Network errors
    if (err.cause?.code === "UND_ERR_CONNECT_TIMEOUT") {
      return true;
    }
  }

  return false;
}

/**
 * Fetch with automatic retry on timeout/network errors
 *
 * Features:
 * - Progressive timeout (increases with each retry)
 * - Exponential backoff between retries
 * - Only retries on network/timeout errors
 * - Drop-in replacement for native fetch
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseTimeout - Base timeout in milliseconds (default: 10000)
 * @returns Fetch response
 * @throws Error after all retries exhausted
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  baseTimeout: number = 10000
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Progressive timeout: increases with each attempt
    const timeout = baseTimeout * attempt;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      // Check if we should retry
      const shouldRetry = isRetriableError(error);

      if (!shouldRetry || attempt === maxRetries) {
        // Don't retry on non-retriable errors or if we've exhausted retries
        if (attempt === maxRetries && shouldRetry) {
          console.warn(
            `[Fetch] Max retries (${maxRetries}) exceeded for ${url}`
          );
        }
        throw error;
      }

      // Log retry attempt
      console.log(
        `[Fetch] Retry ${attempt}/${maxRetries} after ${timeout}ms timeout for ${url.substring(0, 100)}...`
      );

      // Exponential backoff: wait longer between each retry
      await sleep(1000 * attempt);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error("Max retries exceeded");
}
