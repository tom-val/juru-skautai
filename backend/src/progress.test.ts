import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateUpdates,
  MAX_UPDATES,
  normaliseProgress,
  planMemberUpdates,
  planLeadUpdates,
  isEmptyPlan,
} from "./progress.ts";
import { HttpError } from "./http.ts";

test("accepts well-formed key/boolean maps", () => {
  const updates = { "buriavimo/3/t2": true, "buriavimo/3/s1": false, "zygiu/10/t12": true };
  assert.deepEqual(validateUpdates(updates), updates);
});

test("rejects non-objects, arrays and empty maps", () => {
  for (const bad of [null, undefined, "x", 5, [], {}]) {
    assert.throws(() => validateUpdates(bad), HttpError);
  }
});

test("rejects malformed keys", () => {
  const badKeys = [
    "buriavimo/0/t1", // level 0
    "buriavimo/3/x1", // unknown item type
    "buriavimo/3/t0", // ids start at 1
    "Buriavimo/3/t1", // uppercase
    "buriavimo/3", // missing item
    "a/1/t1/extra", // extra segment
    "../../etc/1/t1", // path-ish garbage
  ];
  for (const key of badKeys) {
    assert.throws(() => validateUpdates({ [key]: true }), HttpError, key);
  }
});

test("rejects non-boolean values", () => {
  for (const bad of [1, "true", null, {}, []]) {
    assert.throws(() => validateUpdates({ "buriavimo/1/t1": bad }), HttpError);
  }
});

test("rejects more than MAX_UPDATES keys", () => {
  const big: Record<string, boolean> = {};
  for (let i = 1; i <= MAX_UPDATES + 1; i++) big[`slug/1/t${i}`] = true;
  assert.throws(() => validateUpdates(big), HttpError);
});

test("normaliseProgress reads legacy true as done and drops junk", () => {
  const raw = { "a/1/t1": true, "a/1/t2": "done", "a/1/t3": "pending", "a/1/t4": false, "a/1/t5": "x" };
  assert.deepEqual(normaliseProgress(raw), {
    "a/1/t1": "done",
    "a/1/t2": "done",
    "a/1/t3": "pending",
  });
  assert.deepEqual(normaliseProgress(null), {});
});

test("planMemberUpdates: claims become pending, confirmed items are untouchable", () => {
  const current = { "a/1/t1": "done", "a/1/t2": "pending" } as const;
  const plan = planMemberUpdates(current, {
    "a/1/t1": false, // cannot retract a confirmed item
    "a/1/t2": false, // retract own pending claim
    "a/1/t3": true, // new claim
    "a/1/t2b": true, // (re)claim of a pending key is a no-op — see below
  });
  assert.deepEqual(plan, {
    sets: { "a/1/t3": "pending", "a/1/t2b": "pending" },
    removes: ["a/1/t2"],
  });
  // Ticking an already-confirmed or already-pending key changes nothing.
  assert.deepEqual(planMemberUpdates(current, { "a/1/t1": true, "a/1/t2": true }), {
    sets: {},
    removes: [],
  });
});

test("planLeadUpdates: true confirms, false removes", () => {
  assert.deepEqual(planLeadUpdates({ "a/1/t1": true, "a/1/t2": false }), {
    sets: { "a/1/t1": "done" },
    removes: ["a/1/t2"],
  });
  assert.equal(isEmptyPlan({ sets: {}, removes: [] }), true);
  assert.equal(isEmptyPlan({ sets: { x: "done" }, removes: [] }), false);
});
