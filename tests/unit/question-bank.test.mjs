import test from "node:test";
import assert from "node:assert/strict";
import { parseCourse } from "../../src/lib/parse.js";
import { buildIndex } from "../../src/lib/index.js";
import { resolveQuestionBank, checkBankPublication } from "../../src/lib/question-bank.js";
const course = () => ({ concepts: { c: {} }, objectives: { o: {}, o2: {} }, families: { f: {} }, sections: [{ id: "s1", num: 1, title: "One", subs: [{ id: "s1-1", title: "Lesson", blocks: [], quiz: ["a"] }, { id: "s1-2", title: "Other", blocks: [], quiz: [] }] }] });
const type = (id = "t", overrides = {}) => ({ id, task: "Solve", concept: "c", objectives: ["o"], families: ["f"], ...overrides });
const item = (id, overrides = {}) => ({ id, typeId: "t", q: "Solve", response: { kind: "number", value: 2 }, why: "Subtract", verified: true, ...overrides });
const source = () => ({ types: [type()], items: [item("a"), item("b"), item("fresh", { use: "check" })], assessments: [{ scope: "s1", criteria: "Select and solve" }] });
test("resolve ordered placements, inherited metadata, conservative groups and reserved pools", () => {
  const C = course(), errors = []; resolveQuestionBank(C, source(), errors);
  assert.deepEqual(errors, []);
  assert.equal(C.sections[0].subs[0].quiz[0].id, "a");
  assert.deepEqual(C.questionTypes.t.scopes, ["s1-1", "s1", "course"]);
  assert.equal(C.questionBank.b.help, "s1-1");
  assert.equal(C.questionBank.b.group, "t:default");
  const I = buildIndex(C);
  assert.deepEqual(I.QALL.map(q => q.id), ["a"]);
  assert.deepEqual(I.PALL.map(q => q.id), ["b"]);
  assert.deepEqual(I.CHECK.map(q => q.id), ["fresh"]);
  assert.equal(I.QALL[0].typeId, "t");
});
test("sparse assessment defaults include omitted outcomes and weight per outcome", () => {
  const C = course(), s = source();
  s.types.push(type("u", { objectives: ["o2"], teach: ["s1-1"] }));
  s.items.push(item("u1", { typeId: "u" }));
  s.assessments[0].outcomes = { o: { weight: 2 } };
  resolveQuestionBank(C, s, []);
  const b = C.assessmentBlueprints.s1;
  assert.equal(b.target, .9); assert.equal(b.outcomes.o2.floor, .8);
  assert.equal(b.typeWeights.t, 2 / 3); assert.equal(b.typeWeights.u, 1 / 3);
  const version = b.version; s.items[1].group = "changed-representation";
  const C2 = course(); resolveQuestionBank(C2, s, []);
  assert.notEqual(C2.assessmentBlueprints.s1.version, version);
});
test("section-only scope does not imply every subsection", () => {
  const C = course(); C.sections[0].subs[0].quiz = [];
  resolveQuestionBank(C, { types: [type("t", { scope: ["s1"], teach: [] })], items: [item("a")] }, []);
  assert.deepEqual(C.questionTypes.t.scopes, ["s1", "course"]);
});
test("strict references, cycles, leakage, scoring and numeric metadata fail", () => {
  const C = course(), s = source(), errors = [];
  s.types[0].requires = ["u"]; s.types[0].objectives = ["o", "o2"];
  s.types.push(type("u", { requires: ["t"], teach: ["missing"] }));
  s.items[0].use = "check"; s.items[1].concept = "c";
  s.items[1].response.tolerance = -1;
  s.assessments[0].outcomes = { unknown: { weight: 0 } };
  resolveQuestionBank(C, s, errors);
  for (const text of ["scoreFor", "unknown teaching", "cycle", "reserved check", "inherited", "nonnegative tolerance", "unknown or unassessed"])
    assert.ok(errors.some(e => e.includes(text)), text);
});
test("browser loader reads bank files and retains legacy courses", () => {
  const files = { "course.yaml": "code: test\nconcepts: {c: {term: Concept}}", "sections/01-one/1-lesson.yaml": "title: Lesson\nblocks: []\nquiz: [a]", "categorize/objectives.yaml": "- {id: o, title: Outcome}", "categorize/families.yaml": "- {id: f, title: Family}", "questions/types.json": JSON.stringify([type()]), "questions/bank.json": JSON.stringify(source().items), "questions/assessment.json": JSON.stringify(source().assessments) };
  const result = parseCourse(files);
  assert.deepEqual(result.errors, []);
  assert.equal(result.course.questionBank.a.help, "s1-1");
  delete files["questions/types.json"]; delete files["questions/bank.json"]; delete files["questions/assessment.json"];
  files["sections/01-one/1-lesson.yaml"] = "title: Lesson\nquiz:\n  - {type: Explain, q: Why, a: Because, why: Reason}";
  assert.deepEqual(parseCourse(files).errors, []);
});
test("imported IDs cannot resolve inherited dictionary properties", () => {
  const C = course(), s = source(), errors = [];
  s.types[0].concept = "constructor"; s.types[0].objectives = ["toString"];
  s.types[0].teach = ["constructor"];
  resolveQuestionBank(C, s, errors);
  assert.ok(errors.some(e => e.includes("unknown concept constructor")));
  assert.ok(errors.some(e => e.includes("unknown objective toString")));
  assert.ok(errors.some(e => e.includes("unknown teaching anchor constructor")));
  const safe = course(), data = source();
  data.types[0].id = "__proto__";
  data.items.forEach(q => { q.typeId = "__proto__"; });
  const result = resolveQuestionBank(safe, data, []);
  assert.deepEqual(result.errors, []);
  assert.ok(Object.hasOwn(safe.questionTypes, "__proto__"));
});
test("migration aliases and author aliases are distinct validated stable references", () => {
  const C = course(), s = source(); s.items[0].authorId = "writer-handle";
  s.aliases = { "s1-1:Explain": "a" };
  const result = resolveQuestionBank(C, s, []);
  assert.deepEqual(result.errors, []);
  assert.equal(C.questionAliases["writer-handle"], "a");
  assert.equal(C.legacyQuestionAliases["s1-1:Explain"], "a");
  s.aliases.missing = "absent";
  const errors = []; resolveQuestionBank(course(), s, errors);
  assert.ok(errors.some(e => e.includes("unknown bank target absent")));
});
test("edited type semantics invalidate item interpretation and malformed stimuli fail", () => {
  const C = course(), s = source(); resolveQuestionBank(C, s, []);
  s.types[0].task = "A changed method";
  const C2 = course(); resolveQuestionBank(C2, s, []);
  assert.notEqual(C.questionBank.a.contentVersion, C2.questionBank.a.contentVersion);
  s.items[0].stimulus = { t: "table", head: ["x"], rows: [[1, 2]] };
  s.assessments[0].outcomes = { o: { typo: 1 } };
  s.items[1].response.typo = true;
  const errors = []; resolveQuestionBank(course(), s, errors);
  for (const text of ["table needs head and matching rows", "unknown outcome override", "unknown response key"])
    assert.ok(errors.some(e => e.includes(text)), text);
});
test("the same item can be placed in two lessons while the global pool stays unique", () => {
  const C = course(); C.sections[0].subs[1].quiz = ["a"];
  const s = source(); resolveQuestionBank(C, s, []);
  assert.equal(C.sections[0].subs[1].quiz[0].id, "a");
  assert.deepEqual(C.questionTypes.t.teach, ["s1-1", "s1-2"]);
  assert.equal(buildIndex(C).QALL.filter(q => q.id === "a").length, 1);
});

test("structural drafts keep practice while publication requires reviewed teaching exceptions", () => {
  const C = course(), s = source(); C.sections[0].subs[0].quiz = [];
  s.types[0].scope = ["course"]; s.assessments[0].scope = "course";
  const result = resolveQuestionBank(C, s, []);
  assert.deepEqual(result.errors, []);
  assert.equal(C.questionTypes.t.teachingStatus, "unreviewed-exception");
  assert.ok(checkBankPublication(C, []).some(e => e.includes("current reviewed exception")));
  s.reviewExceptions = { t: { kind: "external-teaching", reason: "This scope presumes the separately reviewed algebra course." } };
  const reviewed = course(); reviewed.sections[0].subs[0].quiz = [];
  resolveQuestionBank(reviewed, s, []);
  assert.deepEqual(checkBankPublication(reviewed, []), []);
  assert.equal(reviewed.questionBank.a.help, null);
  assert.equal(reviewed.questionTypes.t.teachingStatus, "reviewed-exception");
});
test("assessed inventory without usable items remains structurally readable but cannot publish", () => {
  const C = course(); C.sections[0].subs[0].quiz = [];
  const s = source(); s.types[0].teach = ["s1-1"]; s.items = [];
  const result = resolveQuestionBank(C, s, []);
  assert.deepEqual(result.errors, []);
  assert.ok(checkBankPublication(C, []).some(e => e.includes("no usable ordinary or check items")));
});
