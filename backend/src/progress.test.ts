import { test } from "node:test";
import assert from "node:assert/strict";
import { validateUpdates, MAX_UPDATES } from "./progress.ts";
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
