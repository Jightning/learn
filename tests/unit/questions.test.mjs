#!/usr/bin/env node
/* Question data reaches subsection checks, Mixed Practice, and Review through
 * one adapter. These examples protect the authored contract at that seam. */
import assert from "node:assert/strict";
import test from "node:test";

const { normalizeQuestion, gradeQuestion, practiceItems } = await import("../../src/lib/questions.js");
const { legacyQuestionCounts } = await import("../../tools/lib/current-schema.mjs");
const { questionContextWarning } = await import("../../tools/lib/question-context.mjs");
const { checkResponse } = await import("../../tools/lib/question-schema.mjs");

test("numeric answers accept their declared tolerance and reject blank or distant values", () => {
  const response = { kind: "number", value: 12.5, tolerance: 0.2 };
  assert.equal(gradeQuestion(response, "12.7"), true);
  assert.equal(gradeQuestion(response, "12.701"), false);
  assert.equal(gradeQuestion(response, ""), false);
});

test("numeric answers default to zero tolerance when omitted", () => {
  const response = { kind: "number", value: 12.5 };
  const errs = [];
  checkResponse({ response }, "numeric question", errs);
  assert.deepEqual(errs, []);
  assert.equal(gradeQuestion(response, "12.5"), true);
  assert.equal(gradeQuestion(response, "12.6"), false);
});

test("multi-select answers require the complete set, independent of order", () => {
  const response = { kind: "multi", correct: [1, 3] };
  assert.equal(gradeQuestion(response, [3, 1]), true);
  assert.equal(gradeQuestion(response, [1]), false);
  assert.equal(gradeQuestion(response, [1, 2, 3]), false);
});

test("choice responses accept one or many options while checking correct references", () => {
  const choices = n => Array.from({ length: n }, (_, i) => ({
    text: `Option ${i + 1}`, why: `Reason ${i + 1}`
  }));
  for (const response of [
    { kind: "single", correct: 1, choices: choices(1) },
    { kind: "single", correct: 12, choices: choices(12) },
    { kind: "multi", correct: [1], choices: choices(1) },
    { kind: "multi", correct: [1, 12], choices: choices(12) }
  ]) {
    const errs = [];
    checkResponse({ response }, "choice question", errs);
    assert.deepEqual(errs, []);
  }

  const errs = [];
  checkResponse({ response: { kind: "single", correct: 2, choices: choices(1) } },
    "choice question", errs);
  assert.match(errs.join(" "), /correct must name valid 1-based choice numbers/);
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

test("tries default to one and survive quiz and practice normalization", () => {
  assert.equal(normalizeQuestion({ q: "Default", a: "Answer" }).tries, 1);
  assert.equal(normalizeQuestion({ q: "Retry", a: "Answer", tries: 3 }).tries, 3);
  assert.equal(practiceItems({ practice: { skill: { items: [{ q: "Retry", a: "Answer", tries: 2 }] } } })[0].tries, 2);
});

test("tries reject invalid author values including legacy questions", () => {
  for (const tries of [0, -1, 1.5, "3", null, false, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const item = { q: "Retry", a: "Answer", tries };
    const errs = [];
    checkResponse(item, "question", errs);
    assert.match(errs.join(" "), /tries must be a positive integer/);
    assert.throws(() => normalizeQuestion(item), /tries must be a positive integer/);
  }
});

test("attempt signatures preserve default answers and invalidate changed tries", async () => {
  const { questionSignature } = await import("../../src/lib/questions.js");
  const item = normalizeQuestion({ q: "Retry", a: "Answer" });
  assert.equal(questionSignature(item), JSON.stringify([item.prompt, item.response]));
  assert.notEqual(questionSignature({ ...item, tries: 2 }), questionSignature(item));
  assert.notEqual(questionSignature({ ...item, tries: 2 }), questionSignature({ ...item, tries: 3 }));
});

test("context review flags substantial repeated setup across prose and prompt", () => {
  const setup = "A 20 V ideal source feeds node A through 2 kΩ. An 8 kΩ resistor and capacitor are parallel from A to ground. Stored energy at DC is 1.28 mJ.";
  const q = "A 20 V source feeds node A through 2 kΩ. An 8 kΩ resistor and capacitor connect from A to ground. After DC steady state, the capacitor stores 1.28 mJ. Find C.";
  assert.match(questionContextWarning({ q, stimulus: [{ t: "p", h: setup }] }, "item"), /repeat substantial setup/);
  const other = "The warehouse receives twelve crates on Monday and four more on Tuesday. Each crate contains six sealed boxes and each box contains ten identical parts.";
  assert.match(questionContextWarning({ q: `${other} How many parts arrive?`, stimulus: { t: "p", h: other } }, "item"), /repeat substantial setup/);
  assert.equal(questionContextWarning({ q: "Find the capacitor value.", stimulus: { t: "p", h: setup } }, "item"), null);
  assert.equal(questionContextWarning({ q, stimulus: { t: "passage", text: setup } }, "item"), null);
  assert.equal(questionContextWarning({ q, stimulus: { t: "image", alt: setup } }, "item"), null);
  assert.equal(questionContextWarning({ q: "Use the value of R to find the current.", stimulus: { t: "p", h: "R is 10 ohms." } }, "item"), null);
});

test("context review catches a split identifier without guessing its intended meaning", () => {
  for (const item of [{ q: "Later i<m>L=</m>4 A." },
    { q: "Find the current.", stimulus: { t: "p", h: "Later i<m>L=</m>4 A." } },
    { q: "Find the current.", why: "Use i<m>L=</m>4 A." }]) {
    assert.match(questionContextWarning(item, "item"), /splits a name/);
  }
  assert.equal(questionContextWarning({ q: "Later <m>i_L=4\\,\\mathrm{A}</m>." }, "item"), null);
  assert.equal(questionContextWarning({ q: "Find L.", response: { kind: "formula", answer: "iL=4" } }, "item"), null);
  assert.equal(questionContextWarning({ q: "Inspect `<m>L=</m>` and `i<m>L=</m>4` as literal code." }, "item"), null);
});
