import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuestion, questionSignature } from "../../src/lib/questions.js";

test("lesson and practice normalization preserve the same bank identity and evidence context", () => {
  const q = { id: "q-stable", typeId: "linear", q: "Solve.", response: { kind: "number", value: 3 },
    concept: "equations", group: "changed-representation", help: "s1-1", scopes: ["s1-1", "s1", "course"], contentVersion: "bank-v1-a" };
  const lesson = normalizeQuestion(q, { subId: "s1-1" }), practice = normalizeQuestion(q);
  assert.equal(lesson.id, practice.id);
  assert.equal(lesson.id, "q-stable");
  assert.equal(lesson.typeId, "linear");
  assert.equal(lesson.group, "changed-representation");
  assert.equal(questionSignature(lesson), questionSignature(practice));
  assert.notEqual(questionSignature(lesson), questionSignature({ ...lesson, contentVersion: "bank-v1-b" }));
});
