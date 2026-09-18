// Progress model + validation for the tracker.
//
// A member's progress is a map of task key → state:
//   "pending" — the member ticked it and is waiting for a lead to confirm
//   "done"    — a lead confirmed it (only these count towards levels)
// Legacy records store `true`, which reads as "done" (see normaliseProgress).
//
// Keys follow the frontend's taskKey shape: "<slug>/<level>/<taskId>", e.g.
// "buriavimo/3/t2" or "buriavimo/3/s1". The member route is unauthenticated (the
// member ID is the credential), so the payload is strictly bounded.
import { HttpError } from "./http.ts";

export type ProgressState = "done" | "pending";
export type Progress = Record<string, ProgressState>;

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

/** Stored map → clean Progress. `true` (pre-confirmation records) reads as "done". */
export function normaliseProgress(raw: unknown): Progress {
  const out: Progress = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === true || value === "done") out[key] = "done";
    else if (value === "pending") out[key] = "pending";
  }
  return out;
}

export interface UpdatePlan {
  sets: Record<string, ProgressState>;
  removes: string[];
}

/**
 * What a *member's* tick/untick may change, given the current map:
 *   true  → claim: mark "pending", unless the key is already pending or confirmed
 *   false → retract: remove a pending claim; a confirmed item stays put
 * Members can never confirm their own work — only a lead sets "done".
 */
export function planMemberUpdates(
  current: Progress,
  updates: Record<string, boolean>,
): UpdatePlan {
  const plan: UpdatePlan = { sets: {}, removes: [] };
  for (const [key, ticked] of Object.entries(updates)) {
    const state = current[key];
    if (ticked && state === undefined) plan.sets[key] = "pending";
    if (!ticked && state === "pending") plan.removes.push(key);
  }
  return plan;
}

/**
 * What a *lead's* tick/untick changes: true → "done" (confirms a pending claim or
 * ticks directly), false → removed (rejects a claim or reverts a confirmation).
 */
export function planLeadUpdates(updates: Record<string, boolean>): UpdatePlan {
  const plan: UpdatePlan = { sets: {}, removes: [] };
  for (const [key, ticked] of Object.entries(updates)) {
    if (ticked) plan.sets[key] = "done";
    else plan.removes.push(key);
  }
  return plan;
}

export const isEmptyPlan = (plan: UpdatePlan) =>
  Object.keys(plan.sets).length === 0 && plan.removes.length === 0;
