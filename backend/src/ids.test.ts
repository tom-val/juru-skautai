import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, randomSuffix, buildMemberId } from "./ids.ts";

test("slugify strips Lithuanian diacritics and non-alnum", () => {
  assert.equal(slugify("Žygimantas"), "zygimantas");
  assert.equal(slugify("Ąžuolas-Šarūnas"), "azuolassarunas");
  assert.equal(slugify("  Jonas  "), "jonas");
  assert.equal(slugify("O'Brien"), "obrien");
});

test("randomSuffix is 4 lowercase alphanumerics by default", () => {
  for (let i = 0; i < 100; i++) {
    assert.match(randomSuffix(), /^[a-z0-9]{4}$/);
  }
});

test("buildMemberId has the firstname+lastname-suffix shape", () => {
  assert.match(buildMemberId("Jonas", "Jonaitis"), /^jonasjonaitis-[a-z0-9]{4}$/);
});

test("buildMemberId falls back when names have no usable chars", () => {
  assert.match(buildMemberId("!!!", "???"), /^narys-[a-z0-9]{4}$/);
});

test("buildMemberId is practically unique across calls", () => {
  const ids = new Set(Array.from({ length: 1000 }, () => buildMemberId("Jonas", "Jonaitis")));
  assert.ok(ids.size > 990, `expected near-unique IDs, got ${ids.size}/1000`);
});
