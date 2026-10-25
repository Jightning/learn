import test from "node:test";
import assert from "node:assert/strict";
import { courseFiles } from "../../tools/lib/files.mjs";
import { parseCourse } from "../../src/lib/parse.js";
import { buildIndex } from "../../src/lib/index.js";
import { categoryPool } from "../../src/lib/practice-pool.js";
import { checkCandidates, readiness } from "../../src/lib/assessment.js";
import { M } from "../../src/lib/math.js";
import { checkValue } from "../../src/lib/response-scoring.js";
import { renderBlock } from "../../src/blocks/index.js";
import { questionContextWarning } from "../../tools/lib/question-context.mjs";

const load = () => {
  const files = courseFiles("courses/ece20001", message => { throw new Error(message); });
  const { course, errors } = parseCourse(files);
  assert.deepEqual(errors, []);
  return { course, idx: buildIndex(course) };
};

test("section 6.1 first question renders capacitor voltage and current with subscripts", () => {
  const { course } = load();
  const question = course.sections.flatMap(s => s.subs).find(u => u.id === "s6-1").quiz[0];
  assert.equal(question.id, "e2-st-cap-current");
  for (const field of [question.q, question.why]) {
    const rendered = M(field);
    for (const symbol of ["v", "i"]) {
      assert.match(rendered, new RegExp(`<msub>\\s*<mi>${symbol}</mi>\\s*<mi>C</mi>\\s*</msub>`));
    }
    assert.doesNotMatch(rendered, /katex-error/);
  }
});

test("section 6.1 factor question accepts fractions and ordinary rounding", () => {
  const { course } = load();
  const question = course.sections.flatMap(s => s.subs).find(u => u.id === "s6-1").quiz[3];
  assert.equal(question.id, "e2-st-cap-geometry");
  assert.equal(question.response.tolerance, 0.05);
  for (const answer of ["1/3", "0.3", "0.33"]) assert.equal(checkValue(question.response, answer), true);
  assert.equal(checkValue(question.response, "3"), false);
});

test("section 6.1 electron-count question has one self-contained setup", () => {
  const { course } = load();
  const question = course.sections.flatMap(s => s.subs).find(u => u.id === "s6-1").quiz[2];
  assert.equal(question.id, "e2-st-cap-electrons");
  assert.ok(!question.stimulus || Array.isArray(question.stimulus) && question.stimulus.length === 0);
  for (const given of ["1.6", "0.50", "1.602"]) assert.ok(question.q.includes(given));
});

test("section 6.2 capacitor-energy question states its setup once and retains every given", () => {
  const { course } = load();
  const question = course.sections.flatMap(s => s.subs).find(u => u.id === "s6-2").quiz[7];
  assert.equal(question.id, "e2-st-energy-dc-cap-practice");
  assert.ok(!question.stimulus || Array.isArray(question.stimulus) && question.stimulus.every(s => s.t !== "p"));
  for (const given of ["20 V", "2 kΩ", "8 kΩ", "1.28 mJ"]) assert.ok(question.q.includes(given));
});

test("Exam 2 bank has no detected repeated setup or split-name math", () => {
  const { idx } = load();
  const warnings = Object.values(idx.BANK).map(q => questionContextWarning(q, q.id))
    .filter(w => w && /repeat substantial setup|splits a name/.test(w));
  assert.deepEqual(warnings, []);
});

test("section 6.2 teaches the solenoid quantities and limits before its dependent question", () => {
  const { course } = load();
  const lesson = course.sections.flatMap(s => s.subs).find(u => u.id === "s6-2");
  const definition = lesson.blocks.find(b => b.authorId === "block-6e3ec67e-93b");
  assert.notEqual(definition.optional, true);
  assert.notEqual(definition.tier, "depth");
  const text = renderBlock(definition, {});
  // This protects the reported omission; it does not certify all teaching.
  for (const meaning of [/magnetic field passes through/i, /turns/, /current/, /amperes/,
    /henries per meter/, /cross-sectional/, /square meters/, /axial length/,
    /not the length of wire/, /end effects/, /constant.*?mu/s, /saturation/]) {
    assert.match(text, meaning);
  }
  assert.ok(lesson.quiz.some(q => q.id === "e2-st-ind-solenoid"));
  assert.doesNotMatch(M(text), /katex-error/);
});

test("Exam 2 practice has canonical membership and independent checks without legacy drill leakage", () => {
  const { course, idx } = load();
  const blueprint = idx.BLUEPRINTS.exam2;
  assert.ok(blueprint, "Exam 2 needs an applicable independent-performance standard");
  assert.equal(blueprint.target, 1);
  for (const outcome of Object.values(blueprint.outcomes)) assert.equal(outcome.floor, 1);
  const ordinary = categoryPool([...idx.QALL, ...idx.PALL], idx, "exam2");
  assert.ok(ordinary.length > 0);
  for (const item of ordinary) {
    assert.ok(idx.BANK[item.id], `${item.id} is a legacy drill in the Exam 2 category`);
    assert.equal(item.use, "practice");
  }
  const placed = new Set(course.sections.flatMap(s => s.subs.flatMap(u => u.quiz.map(q => q.id))));
  for (const item of idx.CHECK) assert.ok(!placed.has(item.id), `${item.id} exposes a protected check`);
  const check = checkCandidates(idx, blueprint, []);
  assert.deepEqual(check.missing, [], check.inventoryGaps?.join("\n"));
  const attempts = check.items.map((q, i) => ({ id: `check-${i}`, event: "attempt", itemId: q.id,
    schemaVersion: 2, contentVersion: q.contentVersion, evidenceVersion: q.evidenceVersion,
    skills: q.skills, typeId: q.typeId, group: q.group, demand: q.demand, ts: i + 1,
    context: "check", methodCued: false, firstUnaided: true, gradeSource: "deterministic-checker" }));
  const options = { confirmedVersion: blueprint.version, bank: idx.BANK, now: 1000 };
  assert.equal(readiness(blueprint, attempts, options).ready, true, "perfect independent evidence must meet 100%");
  assert.equal(readiness(blueprint, attempts.map((r, i) => i ? r : { ...r, firstUnaided: false }), options).ready,
    false, "one real miss must still fail the full-performance target");
  for (const family of Object.values(course.families).filter(f => f.assessmentRequired)) {
    assert.equal(family.disposition, "teach");
    for (const id of family.questions) assert.ok(blueprint.types.includes(id), `${id} is outside Exam 2 checks`);
  }
});

test("the Exam 2 rehearsal has ten complete ordinary tasks with a sixty-minute pacing budget", () => {
  const { course } = load();
  const rehearsal = course.sections.flatMap(s => s.subs).find(u => u.id === "s11-4");
  assert.ok(rehearsal);
  assert.equal(rehearsal.quiz.length, 10);
  assert.equal(rehearsal.quiz.reduce((n, q) => n + q.timing.limitSeconds, 0), 3600);
  for (const item of rehearsal.quiz) {
    assert.equal(item.use, "practice");
    assert.equal(item.timing.mode, "pacing");
    assert.notEqual(item.response.kind, "self");
  }
});
