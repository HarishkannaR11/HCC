/**
 * A `fetch` that retries transient network failures.
 *
 * Supabase-js takes a custom fetch, so passing this covers every call the data
 * scripts make. Bulk loading opens a lot of connections in a short window and
 * an occasional socket failure is normal; without this the whole load aborts
 * partway and leaves the tables half-populated.
 *
 * Only connection-level failures and 5xx/429 responses are retried. A 4xx is a
 * real error -- a bad payload or a constraint violation -- and retrying it
 * would just hide the problem.
 */
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const retryFetch: typeof fetch = async (input, init) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.status < 500 && response.status !== 429) return response;
      if (attempt === MAX_ATTEMPTS) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) break;
    }
    // Exponential backoff: 0.5s, 1s, 2s, 4s.
    await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
  }

  throw new Error(
    `Request failed after ${MAX_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
    { cause: lastError },
  );
};
