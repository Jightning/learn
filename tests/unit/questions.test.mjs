#!/usr/bin/env node
/* Question data reaches subsection checks, Mixed Practice, and Review through
 * one adapter. These examples protect the authored contract at that seam. */
import assert from "node:assert/strict";
import test from "node:test";

const { normalizeQuestion, gradeQuestion, practiceItems } = await import("../../src/lib/questions.js");
const { legacyQuestionCounts } = await import("../../tools/lib/current-schema.mjs");
const { questionContextWarning } = await import("../../tools/lib/question-context.mjs");

test("numeric answers accept their declared tolerance and reject blank or distant values", () => {
  const response = { kind: "number", value: 12.5, tolerance: 0.2 };
  assert.equal(gradeQuestion(response, "12.7"), true);
  assert.equal(gradeQuestion(response, "12.701"), false);
  assert.equal(gradeQuestion(response, ""), false);
});

test("multi-select answers require the complete set, independent of order", () => {
  const response = { kind: "multi", correct: [1, 3] };
  assert.equal(gradeQuestion(response, [3, 1]), true);
  assert.equal(gradeQuestion(response, [1]), false);
  assert.equal(gradeQuestion(response, [1, 2, 3]), false);
});

test("legacy text questions become self-check cards with a stable subsection id", () => {
  const item = normalizeQuestion({ type: "Recall", q: "Name it", a: "The model", steps: ["First", "Then"] },
    { subId: "s2-3" });
  assert.equal(item.id, "s2-3#recall");
  assert.equal(item.response.kind, "self");
  assert.equal(item.response.model, "The model");
  assert.equal(item.why, "<p>First</p><p>Then</p>");
});

test("practice banks retain current and legacy items under distinct ids", () => {
  const items = practiceItems({
    practice: { algebra: { items: [{ type: "single", q: "Current", response: { kind: "single", correct: 1 } }] } },
    drills: { algebra: { items: [{ type: "Recall", q: "Legacy", a: "Answer" }] } }
  });
  assert.deepEqual(items.map(x => [x.id, x.concept, x.response.kind]), [
    ["algebra:p1", "algebra", "single"],
    ["algebra:d1", "algebra", "self"]
  ]);
});

test("migration inventory counts old quiz, practice, and drill records by course source", () => {
  assert.deepEqual(legacyQuestionCounts({
    sections: [{ subs: [{ quiz: [{ q: "Old", a: "Answer" },
      { q: "Current", response: { kind: "self", model: "Answer" } }] }] }],
    practice: { skill: { items: [{ q: "Old", answer: "Answer" },
      { q: "Current", response: { kind: "self", model: "Answer" } }] } },
    drills: { skill: { items: [{}, {}, {}] } }
  }), { quiz: 1, practice: 1, drills: 3 });
});

test("question context warns on detached references but accepts attached or self-contained stimuli", () => {
  assert.match(questionContextWarning({ q: "In the scatter figure, compare the two lines." }, "s1 question"),
    /attach it, or make the prompt self-contained/);
  assert.ok(questionContextWarning({ q: "In this <b>table</b>, compare the two rows." }, "s1 question"));
  assert.equal(questionContextWarning({ q: "In the scatter figure, compare the two lines.",
    stimulus: { t: "figure" } }, "s1 question"), null);
  assert.equal(questionContextWarning({ q: "The scatterplot shows spaced practice rising twice as fast as massed practice. What does that mean?" },
    "s1 question"), null);
});
