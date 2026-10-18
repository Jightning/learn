import test from "node:test";
import assert from "node:assert/strict";
import { resolveQuestionBank, readQuestionCollections } from "../../src/lib/question-bank.js";
const course = () => ({ concepts: { c: {} }, objectives: { o: { families: ["f"], importance: 3 } }, families: { f: { concept: "c", teach: ["s1-1"] } }, sections: [{ id: "s1", subs: [{ id: "s1-1", quiz: [] }, { id: "s1-2", quiz: [] }] }] });
const source = () => ({ skills: [{ id: "a", task: "Solve", standard: "Solve without supplied method", family: "f", importance: 3 }, { id: "b", task: "Check", standard: "Check independently", family: "f", importance: 1 }], items: [{ id: "q", skills: ["a", "b"], q: "Solve and check", response: { kind: "number", value: 2 } }], assessments: [{ scope: "course", criteria: "Perform independently" }] });
const resolve = s => { const C = course(), errors = []; resolveQuestionBank(C, s, errors); return { C, errors }; };
test("minimal skills inherit canonical links and objective budgets; combined items remain joint", () => {
  const { C, errors } = resolve(source()); assert.deepEqual(errors, []);
  assert.deepEqual(C.questionTypes.a.objectives, ["o"]);
  assert.deepEqual(C.questionTypes.a.teach, ["s1-1"]);
  assert.deepEqual(C.questionBank.q.skills, ["a", "b"]);
  assert.equal(C.questionBank.q.typeId, "a"); assert.equal(C.questionBank.q.schemaVersion, 2);
  assert.equal(C.questionBank.q.independence, "unknown");
  assert.equal(C.assessmentBlueprints.course.typeWeights.a, .75);
});
test("compiler rejects competing catalogs and ambiguous inheritance", () => {
  const s = source(); s.types = [{ id: "old" }];
  assert.ok(resolve(s).errors.some(e => e.includes("competing catalogs")));
  const C = course(); C.objectives.other = { families: ["f"] }; const errors = [];
  resolveQuestionBank(C, source(), errors); assert.ok(errors.some(e => e.includes("ambiguous objective")));
  const errors2 = []; readQuestionCollections({ "questions/skills.json": "", "questions/types.yaml": "" }, () => [], errors2);
  assert.ok(errors2.some(e => e.includes("one skills")));
});
test("practice placement supplies membership without inventing teaching", () => {
  const C = course(); C.families.f.teach = []; C.sections[0].subs[0].quiz = ["q"];
  const errors = []; resolveQuestionBank(C, source(), errors); assert.deepEqual(errors, []);
  assert.deepEqual(C.questionTypes.a.teach, []); assert.equal(C.questionTypes.a.teachingStatus, "unreviewed-exception");
  assert.ok(C.questionTypes.b.scopes.includes("s1-1"));
});
test("organizational edits preserve observations while substantive changes revise interpretation", () => {
  const s = source(), original = resolve(s).C.questionBank.q;
  s.skills[0].importance = 8; s.skills[0].teach = ["s1-2"];
  const moved = resolve(s).C.questionBank.q;
  assert.equal(moved.contentVersion, original.contentVersion); assert.equal(moved.evidenceVersion, original.evidenceVersion);
  assert.notEqual(moved.organizationVersion, original.organizationVersion);
  s.items[0].demand = "foundation"; const demand = resolve(s).C.questionBank.q;
  assert.equal(demand.contentVersion, original.contentVersion); assert.notEqual(demand.evidenceVersion, original.evidenceVersion);
  s.skills[0].standard = "A materially different capability";
  assert.notEqual(resolve(s).C.questionBank.q.contentVersion, original.contentVersion);
});
test("routes and separately observed steps validate explicit evidence and strict fields", () => {
  const s = source(); Object.assign(s.items[0], { routes: [["a"], ["b"]], support: ["supplied-method"], representation: "equation", steps: [{ id: "first", skills: ["a"], q: "Compute", response: { kind: "number", value: 1 } }], errors: [{ id: "sign", description: "Possible sign error", match: "-2" }] });
  s.assessments[0].requirements = { representations: { a: ["equation"] }, integrations: [["a", "b"]] };
  assert.deepEqual(resolve(s).errors, []);
  s.items[0].steps.push({ id: "first", skills: ["missing"], q: "Compute", response: { kind: "number", value: 1, typo: true } });
  s.items[0].typo = 1; s.items[0].support = ["easy"]; s.items[0].routes = [["a"], ["a"]];
  const { errors } = resolve(s);
  for (const text of ["distinct stable id", "known skills", "unknown step response", "unknown item key", "support must", "duplicate alternative route"])
    assert.ok(errors.some(e => e.includes(text)), text);
});
test("sparse assessment overrides replace skill importance without changing the outcome budget", () => {
  const s = source(); s.assessments[0].skillWeights = { b: 3 };
  const { C, errors } = resolve(s); assert.deepEqual(errors, []); assert.equal(C.assessmentBlueprints.course.typeWeights.a, .5);
});

test("unsupported skill essential fails; item quarantine is explicit and cannot satisfy publication inventory", async () => {
  const { checkBankPublication } = await import("../../src/lib/question-bank.js");
  const s = source(); s.skills[0].essential = true;
  assert.ok(resolve(s).errors.some(e => e.includes("unknown skill key essential")));
  delete s.skills[0].essential; s.items[0].quarantined = true;
  const { C, errors } = resolve(s); assert.deepEqual(errors, []);
  assert.equal(C.questionBank.q.quarantined, true);
  assert.ok(checkBankPublication(C).some(e => e.includes("no usable")));
  s.items[0].quarantined = "yes";
  assert.ok(resolve(s).errors.some(e => e.includes("quarantined must be boolean")));
});
