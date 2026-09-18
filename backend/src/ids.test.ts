import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugify,
  randomSuffix,
  buildMemberId,
  buildInviteCode,
  parseInviteCode,
} from "./ids.ts";

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

test("buildMemberId has the firstname-suffix shape", () => {
  assert.match(buildMemberId("Jonas"), /^jonas-[a-z0-9]{4}$/);
});

test("buildMemberId falls back when the name has no usable chars", () => {
  assert.match(buildMemberId("!!!"), /^narys-[a-z0-9]{4}$/);
});

test("buildMemberId is practically unique across calls", () => {
  const ids = new Set(Array.from({ length: 1000 }, () => buildMemberId("Jonas")));
  assert.ok(ids.size > 990, `expected near-unique IDs, got ${ids.size}/1000`);
});

test("invite codes are xxxx-xxxx and parse from loose input", () => {
  const code = buildInviteCode();
  assert.match(code, /^[a-z0-9]{4}-[a-z0-9]{4}$/);
  assert.equal(parseInviteCode(code), code);
  assert.equal(parseInviteCode(" AB12CD34 "), "ab12-cd34");
  assert.equal(parseInviteCode("ab12-cd34"), "ab12-cd34");
  for (const bad of ["", "ab12", "ab12-cd3", "ab12_cd34", 42, null]) {
    assert.equal(parseInviteCode(bad), null, String(bad));
  }
});
