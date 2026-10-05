import test from "node:test";
import assert from "node:assert/strict";
import { shadowPractice } from "../../tools/lib/practice-shadow.mjs";
test("shadow replay compares deterministic proposals without leaking reserves or inventing learning effects", () => {
  const idx = { QALL: [{ id: "a", typeId: "advanced", use: "practice" }, { id: "b", typeId: "base", use: "practice" }],
    PALL: [{ id: "reserved", typeId: "advanced", use: "check" }], TYPES: {}, BANK: {}, BLUEPRINTS: {} };
  const rows = [{ id: "e1", ts: 1, event: "attempt", loop: "Q", itemId: "a", typeId: "advanced", firstUnaided: false, correct: false,
    sessionId: "s", group: "g" }, { id: "ex", ts: 2, event: "exposure", itemId: "a", beforeSubmission: false }];
  const copy = structuredClone(rows), report = shadowPractice(idx, rows, 17);
  assert.deepEqual(rows, copy);
  assert.deepEqual(report, shadowPractice(idx, rows, 17));
  assert.equal(report.decisions.length, 1);
  for (const key of ["adaptive", "weightedRandom", "roundRobin"]) assert.notEqual(report.decisions[0][key], "reserved");
  assert.equal(report.promotion, "pending-learner-study");
  assert.equal(report.learningEffect, "unobserved for unchosen actions");
});
