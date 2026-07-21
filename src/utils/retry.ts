import { logger } from "./logging.js";

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

interface OctokitLikeError {
  status: number;
  message: string;
  response?: { headers?: Record<string, string> };
}

export function isRateLimitError(error: unknown): error is OctokitLikeError {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }
  const err = error as OctokitLikeError;
  if (err.status !== 403 && err.status !== 429) {
    return false;
  }
  const remaining = err.response?.headers?.["x-ratelimit-remaining"];
  return remaining === "0" || /rate limit/i.test(err.message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reintenta `fn` con backoff exponencial únicamente cuando el error es un
 * rate limit de GitHub. Cualquier otro error se propaga de inmediato.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= maxRetries) {
        throw error;
      }
      const delayMs = baseDelayMs * 2 ** attempt;
      logger.warn("Rate limit alcanzado, reintentando", {
        attempt: attempt + 1,
        maxRetries,
        delayMs,
      });
      await sleep(delayMs);
      attempt++;
    }
  }
}
