import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { loadCourse } from "../../tools/lib/load.mjs";
import { parseCourse } from "../../src/lib/parse.js";
import { readAuthorBank, bankMatrix, resolveAuthorQuiz } from "../../tools/lib/author-bank.mjs";
const files = {
  "course.json": JSON.stringify({ code: "new-skills", concepts: { c: { term: "Concept" } } }),
  "categorize/objectives.json": JSON.stringify([{ id: "o", families: ["f"] }]),
  "categorize/families.json": JSON.stringify([{ id: "f", concept: "c", teach: ["s1-1"] }]),
  "sections/01-one/1-lesson.json": JSON.stringify({ title: "Lesson", blocks: [], quiz: ["q"] }),
  "questions/skills.json": JSON.stringify([{ id: "t", task: "Compute", standard: "Compute independently", family: "f" }]),
  "questions/bank.json": JSON.stringify([{ id: "q", skills: ["t"], q: "Compute", response: { kind: "number", value: 2 }, why: "Use the definition", verified: true }]),
  "questions/assessment.json": JSON.stringify([{ scope: "course", criteria: "Compute correctly" }]),
};
test("disk, browser and author packets share derived skills without duplicating creator metadata", () => {
  const dir = mkdtempSync(join(tmpdir(), "skills-bank-"));
  try {
    for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), text); }
    const disk = loadCourse(dir), browser = parseCourse(files);
    assert.deepEqual(disk.errors, []); assert.deepEqual(browser.errors, []);
    assert.deepEqual(disk.course.questionBank, browser.course.questionBank);
    const bank = readAuthorBank(dir);
    assert.equal(bank.types.length, 1); assert.equal(bank.items.length, 1);
    assert.equal(bank.types[0].content.concept, "c"); assert.equal(bank.types[0].rawContent.concept, undefined);
    const matrix = bankMatrix(bank, [{ id: "f" }]);
    assert.deepEqual(matrix.missingFamilies, []); assert.deepEqual(matrix.rows[0].practice, ["q"]);
    assert.equal(matrix.rows[0].contributions.course, 1);
    assert.equal(matrix.rows[0].context.standard, "Compute independently");
    assert.equal(resolveAuthorQuiz(dir, { quiz: ["q"] }, bank).quiz[0].typeId, "t");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("review expansion follows every joint skill and inherited family teaching", async () => {
  const { fullItems, affectedItems } = await import("../../tools/lib/author-review.mjs");
  const entry = (id, kind, content, extra = {}) => ({ id, kind, content, file: "fixture.yaml", ...extra });
  const index = { entries: [
    entry("joint", "bank", { skills: ["a", "b"] }),
    entry("type-a", "question-type", { id: "a", family: "fa" }),
    entry("type-b", "question-type", { id: "b", family: "fb" }),
    entry("fa", "family", { teach: ["s1-1"] }),
    entry("fb", "family", { teach: ["s1-2"] }),
    entry("sibling", "bank", { skills: ["b"] }),
    entry("explanation", "block", { body: "Explanation" }, { sub: "s1-2" }),
  ] };
  const expanded = fullItems(index, ["joint"]).map(e => e.id);
  for (const id of ["type-a", "type-b", "sibling", "explanation"]) assert.ok(expanded.includes(id), id);
  const affected = affectedItems(index, ["type-b"]).map(e => e.id);
  assert.ok(affected.includes("joint")); assert.ok(affected.includes("sibling"));
});
