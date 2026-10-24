import test from "node:test";
import assert from "node:assert/strict";
import { courseFiles } from "../../tools/lib/files.mjs";
import { parseCourse } from "../../src/lib/parse.js";
import { buildIndex } from "../../src/lib/index.js";
import { categoryPool } from "../../src/lib/practice-pool.js";
import { checkCandidates, readiness } from "../../src/lib/assessment.js";

const load = () => {
  const files = courseFiles("courses/ece20001", message => { throw new Error(message); });
  const { course, errors } = parseCourse(files);
  assert.deepEqual(errors, []);
  return { course, idx: buildIndex(course) };
};

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
