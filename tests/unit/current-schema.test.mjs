import test from "node:test";
import assert from "node:assert/strict";
import { resolveQuestionBank } from "../../src/lib/question-bank.js";
import { legacyQuestionCounts, strictCurrentIssues } from "../../tools/lib/current-schema.mjs";

test("strict publication accepts compiled bank placements with absent or typed steps", () => {
  const C = { concepts: { c: {} }, objectives: { o: {} }, families: { f: {} },
    sections: [{ id: "s1", subs: [{ id: "s1-1", quiz: ["plain", "stepped"] }] }] };
  const errors = [];
  resolveQuestionBank(C, {
    types: [{ id: "t", task: "Calculate", concept: "c", objectives: ["o"], families: ["f"] }],
    items: [
      { id: "plain", typeId: "t", q: "Calculate 2 + 3.", response: { kind: "number", value: 5 } },
      { id: "stepped", skills: ["t"], q: "Calculate (2 + 3) × 2.", response: { kind: "number", value: 10 },
        steps: [{ id: "sum", skills: ["t"], q: "Calculate 2 + 3.", response: { kind: "number", value: 5 } }] }
    ]
  }, errors);
  assert.deepEqual(errors, []);
  assert.deepEqual(strictCurrentIssues(C), []);
  assert.equal(legacyQuestionCounts(C).quiz, 0);
});

test("strict publication still rejects legacy inline answer steps", () => {
  const C = { sections: [{ subs: [{ id: "s1-1", quiz: [
    { q: "Calculate.", response: { kind: "number", value: 5 }, steps: ["Add the numbers."] }
  ] }] }] };
  assert.match(strictCurrentIssues(C).join("\n"), /remove legacy field steps/);
  assert.equal(legacyQuestionCounts(C).quiz, 1);
});
