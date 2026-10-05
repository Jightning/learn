import test from "node:test";
import assert from "node:assert/strict";
import { legacyQuestionAliases, migrateLegacyRows } from "../../src/lib/question-aliases.js";

const raw = { type: "Normalize", q: "Normalize 4y' + 8y = 12.", response: { kind: "number", value: 2 }, tries: 1 };
const previous = { concepts: {}, practice: {}, drills: {}, sections: [{ id: "s1", num: 1, subs: [{ id: "s1-1", title: "Normalize", blocks: [], quiz: [raw] }] }] };
const current = { ...previous, sections: [{ ...previous.sections[0], subs: [{ ...previous.sections[0].subs[0], quiz: [{ ...raw, id: "q-normalize", typeId: "normalization", use: "practice" }] }] }] };
test("unchanged legacy identity migrates without inventing first-attempt evidence", () => {
  const result = legacyQuestionAliases(previous, current);
  assert.equal(result.missing.length, 0);
  const oldId = Object.keys(result.aliases)[0];
  assert.equal(result.aliases[oldId], "q-normalize");
  const old = { id: "event-1", loop: "Q", itemId: oldId, correct: true };
  const [next] = migrateLegacyRows([old], result.aliases);
  assert.equal(next.itemId, "q-normalize");
  assert.equal(next.firstUnaided, null);
  assert.equal(next.typeId, undefined);
  assert.equal(old.itemId, oldId);
});
test("changed or ambiguous content cannot be silently matched by position", () => {
  const changed = structuredClone(current);
  changed.sections[0].subs[0].quiz[0].response.value = 3;
  assert.equal(legacyQuestionAliases(previous, changed).missing[0].reason, "no unchanged bank match");
  const ambiguous = structuredClone(current);
  ambiguous.sections[0].subs[0].quiz.push({ ...ambiguous.sections[0].subs[0].quiz[0], id: "q-other" });
  const result = legacyQuestionAliases(previous, ambiguous);
  assert.equal(result.missing[0].reason, "ambiguous unchanged matches");
  const oldId = result.missing[0].id;
  assert.equal(legacyQuestionAliases(previous, ambiguous, { [oldId]: "q-other" }).aliases[oldId], "q-other");
});
