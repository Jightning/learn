import test from "node:test";
import assert from "node:assert/strict";
import { questionStimuli, normalizeQuestion } from "../../src/lib/questions.js";
import { parseCourse } from "../../src/lib/parse.js";
import { checkStimulus } from "../../tools/lib/question-stimulus.mjs";
import { shapeNeeds } from "../../tools/lib/author-context.mjs";

const parts = [
  { t: "p", h: "Before" },
  { t: "figure", kind: "graph", spec: { nodes: [{ id: "a", label: "A" }], edges: [] } },
  { t: "code", src: "return 2;" },
  { t: "note", label: "Given", h: "After" },
  { t: "image", src: "assets/a.png", alt: "A diagram" }
];

test("attachments preserve ordered lists and legacy single mappings", () => {
  assert.deepEqual(questionStimuli(parts[0]), [parts[0]]);
  assert.deepEqual(questionStimuli(null), []);
  assert.deepEqual(questionStimuli(normalizeQuestion({ stimulus: parts }).stimulus), parts);
  assert.ok(shapeNeeds({ quiz: [{ stimulus: parts }] }).includes("stimulus:code"));
  assert.ok(shapeNeeds({ quiz: [{ stimulus: parts }] }).includes("figure:graph"));
});

test("stimuli validate all parts and reject malformed or unsupported attachments", () => {
  const errors = [];
  checkStimulus({ stimulus: parts }, "question", errors, () => true);
  assert.deepEqual(errors, []);
  for (const stimulus of [[], [null], [{ t: "code" }], [{ t: "slides" }],
    [{ t: "image", src: "assets/missing.png" }], [{ t: "table", head: ["a"], rows: [[1, 2]] }]]) {
    const errs = [];
    checkStimulus({ stimulus }, "question", errs, () => false);
    assert.ok(errs.length, JSON.stringify(stimulus));
  }
});

test("images in attachment sequences resolve in quiz, practice, and legacy banks", () => {
  const item = { q: "Question", stimulus: parts, response: { kind: "self", model: "Answer" } };
  const files = {
    "course.json": JSON.stringify({ title: "Attachments" }),
    "sections/01-start/_section.json": JSON.stringify({ title: "Start" }),
    "sections/01-start/1-intro.json": JSON.stringify({ title: "Intro", blocks: [], quiz: [item] }),
    "practice/test.json": JSON.stringify({ concept: "test", items: [item] }),
    "drills/test.json": JSON.stringify({ concept: "test", items: [item] }),
    "assets/a.png": "data:image/png;base64,AAAA"
  };
  const { course, errors } = parseCourse(files);
  assert.deepEqual(errors, []);
  for (const bankItem of [course.sections[0].subs[0].quiz[0], course.practice.test.items[0], course.drills.test.items[0]])
    assert.equal(bankItem.stimulus[4].src, files["assets/a.png"]);
  delete files["assets/a.png"];
  assert.equal(parseCourse(files).errors.filter(e => e.includes("missing image asset")).length, 3);
});

test("a canonical bank image resolves once across repeated lesson placements", () => {
  const files = {
    "course.json": JSON.stringify({ title: "Shared image" }),
    "concepts/c.json": JSON.stringify({ term: "Circuit" }),
    "categorize/objectives.json": JSON.stringify([{ id: "o", title: "Calculate voltage" }]),
    "categorize/families.json": JSON.stringify([{ id: "f", title: "Read a circuit" }]),
    "sections/01-start/_section.json": JSON.stringify({ title: "Start" }),
    "sections/01-start/1-intro.json": JSON.stringify({ title: "First", blocks: [], quiz: ["shared"] }),
    "sections/01-start/2-again.json": JSON.stringify({ title: "Again", blocks: [], quiz: ["shared"] }),
    "questions/types.json": JSON.stringify([{ id: "t", task: "Read circuit", concept: "c", objectives: ["o"], families: ["f"] }]),
    "questions/bank.json": JSON.stringify([{ id: "shared", typeId: "t", q: "Find the voltage.",
      stimulus: { t: "image", src: "assets/circuit.png", alt: "Labeled circuit" },
      response: { kind: "number", value: 2 } }]),
    "assets/circuit.png": "data:image/png;base64,AAAA"
  };
  const { course, errors } = parseCourse(files);
  assert.deepEqual(errors, []);
  for (const sub of course.sections[0].subs)
    assert.equal(sub.quiz[0].stimulus.src, files["assets/circuit.png"]);
  assert.equal(course.questionBank.shared.stimulus.src, files["assets/circuit.png"]);
  delete files["assets/circuit.png"];
  assert.ok(parseCourse(files).errors.some(e => e.includes("missing image asset")));
});
