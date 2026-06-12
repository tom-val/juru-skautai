// Validation for progress updates sent to the open PUT /members/{id}/progress route.
// Keys follow the frontend's taskKey shape: "<slug>/<level>/<taskId>", e.g.
// "buriavimo/3/t2" or "buriavimo/3/s1". The route is unauthenticated (the member ID
// is the credential), so the payload is strictly bounded.
import { HttpError } from "./http.ts";

// One DynamoDB UpdateExpression carries every key; 100 stays well under the 4KB
// expression limit and far exceeds what one debounced batch of checkbox ticks needs.
export const MAX_UPDATES = 100;

const KEY_RE = /^[a-z0-9]+\/[1-9]\d?\/[ts][1-9]\d?$/;

/**
 * Validate the request's `updates` value: a non-empty map of well-formed progress
 * keys to booleans (true = ticked, false = unticked). Throws HttpError(400) otherwise.
 */
export function validateUpdates(input: unknown): Record<string, boolean> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new HttpError(400, "updates must be an object");
  }
  const entries = Object.entries(input);
  if (entries.length === 0) {
    throw new HttpError(400, "updates must not be empty");
  }
  if (entries.length > MAX_UPDATES) {
    throw new HttpError(400, `updates must contain at most ${MAX_UPDATES} keys`);
  }
  for (const [key, value] of entries) {
    if (!KEY_RE.test(key)) {
      throw new HttpError(400, `invalid progress key: ${key.slice(0, 80)}`);
    }
    if (typeof value !== "boolean") {
      throw new HttpError(400, `progress values must be booleans (${key})`);
    }
  }
  return input as Record<string, boolean>;
}
