import test from "node:test";
import assert from "node:assert/strict";
import { compileMastery } from "../../src/lib/mastery-schema.js";
import { compileActivities } from "../../src/lib/activity-schema.js";
import { activityFixture } from "../fixtures/mastery/activities.mjs";

function compile(edit = () => {}) {
  const f = activityFixture(), errors = [];
  edit(f.activities, f.C, f.source);
  const before = structuredClone(f), m = compileMastery(f.C, f.source, errors);
  const index = compileActivities(f.C, m, f.activities, errors);
  assert.deepEqual(f, before);
  return { index, errors };
}
test("future pilot compiles without inventing adapter availability or achievement", () => {
  const { index, errors } = compile();
  assert.deepEqual(errors, []);
  assert.equal(index.activities.lab.availability, "available");
  assert.equal(index.activities["future-audio"].availability, "unavailable");
  assert.deepEqual(index.manifest.unavailable, [{ id: "adapter.audio", version: 1 }, { id: "adapter.trusted-evaluation", version: 1 }]);
  assert.equal(index.rootActivities.simple.length, 7);
  assert.equal(index.activities.delayed.delay.after, "qualifying-evidence-or-repair");
  assert.equal(compileActivities({}, null, undefined), null);
});
test("sparse definitions omit timing, prerequisites, environment and artifact", () => {
  const { index, errors } = compile(s => { s.activities = [s.activities[0]]; });
  assert.deepEqual(errors, []);
  assert.equal(index.activities.ordinary.timing, undefined);
  assert.deepEqual(index.activities.ordinary.prerequisites, []);
});
const invalid = [
  ["collection version", s => s.schemaVersion = 2, "unsupported schemaVersion"],
  ["required capability", s => s.manifest.required["future.engine"] = 2, "unsupported required capability"],
  ["required future adapter", s => s.activities[5].required = true, "unsupported required adapter"],
  ["adapter version", s => s.activities[0].adapter.version = 2, "adapter must be declared"],
  ["adapter kind", s => s.activities[0].adapter.id = "written-defense", "must match activity kind"],
  ["missing declaration", s => delete s.manifest.required["mastery.activities"], "declare mastery.activities"],
  ["duplicate id", s => s.activities.push(s.activities[0]), "duplicate activity id"],
  ["unknown lesson", s => s.activities[0].lesson = "absent", "unknown lesson"],
  ["unknown question", s => s.activities[0].question = "absent", "question reference"],
  ["unknown native skill", s => s.activities[0].tests[0].skill = "b", "unknown tested"],
  ["qualified root", s => s.activities[0].tests[0].root = "absent", "unknown tested"],
  ["qualified facet", s => s.activities[0].tests[0].facet = "absent", "unknown tested"],
  ["anchor demand", s => s.activities[0].tests[0].anchor = 2, "unknown tested"],
  ["qualified criterion", s => s.activities[0].tests[0].criteria = ["absent"], "unknown qualified criterion"],
  ["duplicate attribution", s => s.activities[0].tests.push(s.activities[0].tests[0]), "duplicate tested"],
  ["prerequisite", s => s.activities[1].prerequisites[0].root = "advanced", "unknown prerequisite"],
  ["prerequisite anchor", s => s.activities[1].prerequisites[0].minAnchor = 2, "unknown prerequisite"],
  ["dependency", s => s.activities[0].after = ["absent"], "unknown activity reference"],
  ["cycle", s => s.activities[0].after = ["delayed"], "dependency cycle"],
  ["fallback cycle", s => s.activities[2].fallback = "future-audio", "dependency cycle"],
  ["delay cycle", s => s.activities[3].delay = { ...s.activities[4].delay, activity: "delayed" }, "dependency cycle"],
  ["delay interval", s => s.activities[4].delay.days = 1, "policy interval"],
  ["delay baseline", s => s.activities[4].delay.after = "course-open", "qualifying evidence"],
  ["delay attribution", s => s.activities[4].delay.root = "advanced", "source must test"],
  ["fallback", s => s.activities[5].fallback = "absent", "unknown activity reference"],
  ["time range", s => s.activities[1].timing.active = [10, 1], "seconds range"],
  ["package URL", s => s.activities[1].lab.url = "file:///tmp/code.zip", "public package"],
  ["package hash", s => s.activities[1].lab.sha256 = "bad", "public package"],
  ["private payload", s => s.activities[1].lab.privateTests = "secret", "unknown key"],
  ["authored achievement", s => s.activities[0].passed = true, "unknown key"],
  ["version", s => s.activities[0].evidenceVersion = 0, "positive integer"],
  ["support", s => s.activities[0].support = "anything", "allowed support"],
  ["artifact bound", s => s.activities[1].artifact.maxBytes = Infinity, "bounded reference"],
  ["malformed tests", s => s.activities[3].tests = {}, "tests needs"],
  ["malformed prerequisites", s => s.activities[1].prerequisites = {}, "prerequisites must"],
];
for (const [name, edit, message] of invalid) test(`reject ${name}`, () => {
  const { index, errors } = compile(edit);
  assert.equal(index, null);
  assert.ok(errors.some(e => e.includes(message)), errors.join("\n"));
});
test("same local facet/criterion IDs across owners require separate observed attribution", () => {
  const { index, errors } = compile(s => s.activities[0].tests.push({ root: "advanced", facet: "explain", skill: "c", anchor: 7, criteria: ["correct"] }));
  assert.deepEqual(errors, []);
  assert.deepEqual(index.rootActivities.advanced, ["ordinary"]);
  assert.deepEqual(index.skillActivities.c, ["ordinary"]);
});

test("unfamiliar constraints are explicit boolean qualified demand, never authored achievement", () => {
  const { index, errors } = compile(s => s.activities[0].tests[0].unfamiliarConstraint = true);
  assert.deepEqual(errors, []);
  assert.equal(index.activities.ordinary.tests[0].unfamiliarConstraint, true);
  for (const value of [null, "yes", 1, [], {}]) {
    const result = compile(s => s.activities[0].tests[0].unfamiliarConstraint = value);
    assert.equal(result.index, null);
    assert.ok(result.errors.some(e => e.includes("unfamiliarConstraint must be boolean")));
  }
});
