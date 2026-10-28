import test from "node:test";
import assert from "node:assert/strict";
import { compileMastery, validateMasteryManifest } from "../../src/lib/mastery-schema.js";
import { masteryFixture } from "../fixtures/mastery/root-policy.mjs";

const resolve = (edit = () => {}) => {
  const fixture = masteryFixture(), errors = [];
  edit(fixture.source, fixture.C);
  const before = structuredClone(fixture);
  const index = compileMastery(fixture.C, fixture.source, errors);
  assert.deepEqual(fixture, before, "compilation must not mutate definitions");
  return { index, errors };
};
test("optional extension compiles canonical links, explicit anchors and separate claim requirements", () => {
  const { index, errors } = resolve();
  assert.deepEqual(errors, []);
  assert.equal(compileMastery({}, undefined), null);
  assert.deepEqual(index.skillRoots.a, ["simple"]);
  assert.deepEqual(index.outcomeRoots.o, ["simple", "typical"]);
  assert.deepEqual(index.roots.simple.anchors[3].facets, ["explain"]);
  assert.equal(index.roots.advanced.claimRequirement, "historical-evidence");
  assert.equal(index.roots.simple.anchors[1], undefined, "higher levels do not invent lower evidence");
  assert.deepEqual(index.policies.P67.entails, []);
  assert.equal(index.policies.P67.criteria.correct.critical, true);
  assert.equal(index.rootWeights.simple, .27);
  assert.equal(index.rootWeights.typical, .48);
  assert.equal(index.rootWeights.advanced, .25);
});

const invalid = [
  ["duplicate root", s => s.targets.roots.push(structuredClone(s.targets.roots[0])), "duplicate id simple"],
  ["unknown skill", s => s.targets.roots[0].skills = ["missing"], "unknown native skill"],
  ["unknown objective", s => s.targets.roots[0].scoreFor = "missing", "unknown scoring objective"],
  ["ownership conflict", (s, C) => C.questionSkills.a.scoreFor = "other", "contradictory scoring ownership"],
  ["unassigned ownership", s => delete s.targets.roots[0].scoreFor, "unknown scoring objective"],
  ["duplicate skill", s => s.targets.roots[0].skills.push("a"), "distinct nonempty IDs"],
  ["author responsibility", s => delete s.targets.roots[0].targetOwnerModule, "targetOwnerModule is required"],
  ["rank", s => s.targets.roots[0].requiredAnchor = 0, "requiredAnchor"],
  ["importance", s => s.targets.roots[0].importance = 11, "importance"],
  ["fractional rank", s => s.targets.roots[0].requiredAnchor = 3.5, "requiredAnchor"],
  ["missing target anchor", s => s.targets.roots[0].requiredAnchor = 2, "required anchor is not defined"],
  ["anchor standard", s => s.targets.roots[0].anchors[0].standard = "", "anchor standard"],
  ["duplicate anchor", s => s.targets.roots[0].anchors.push(s.targets.roots[0].anchors[0]), "duplicate anchor"],
  ["dangling facet", s => s.targets.roots[0].anchors[0].facets = ["missing"], "dangling facet/anchor"],
  ["duplicate facet", s => s.targets.roots[0].facets.push(s.targets.roots[0].facets[0]), "duplicate id explain"],
  ["facet skill", s => s.targets.roots[0].facets[0].skills = ["b"], "dangling native skill"],
  ["facet anchor", s => s.targets.roots[0].facets[0].anchors[0].level = 2, "dangling facet/anchor"],
  ["criterion", s => s.targets.roots[0].facets[0].anchors[0].criteria = ["missing"], "unknown policy criterion"],
  ["policy", s => s.targets.roots[0].policy = "missing", "unknown policy"],
  ["policy range", s => s.targets.roots[0].policy = "P67", "policy does not match"],
  ["duplicate policy", s => s.policies.policies.push(s.policies.policies[0]), "duplicate id P3"],
  ["weak groups", s => s.policies.policies[1].minGroups = 2, "minGroups"],
  ["weak sessions", s => s.policies.policies[1].minSessions = 1, "minSessions"],
  ["weak rubric", s => s.policies.policies[0].noncriticalFloor = .7, "noncriticalFloor"],
  ["delay", s => s.policies.policies[0].delayDays = [0], "elapsed-day"],
  ["unordered delay", s => s.policies.policies[0].delayDays = [7, 2], "elapsed-day"],
  ["unfamiliar constraint", s => s.policies.policies[2].unfamiliarConstraint = false, "unfamiliarConstraint"],
  ["critical flag", s => delete s.policies.policies[0].criteria[0].critical, "explicit critical"],
  ["duplicate criterion", s => s.policies.policies[0].criteria.push(s.policies.policies[0].criteria[0]), "duplicate id correct"],
  ["implicit entailment", s => s.policies.policies[0].entails = [{ from: 2, to: 3 }], "entailment must descend"],
  ["invalid entailment", s => s.policies.policies[0].entails = [{ from: 8, to: 3 }], "valid anchors"],
  ["authored achievement", s => s.targets.roots[0].claimStatus = "verified", "unknown key claimStatus"],
  ["claim requirement", s => s.targets.roots[0].claimRequirement = "verified", "claimRequirement"],
  ["semantic version", s => s.targets.roots[0].semanticVersion = "1", "semanticVersion"],
  ["policy version", s => s.policies.policies[0].version = 0, "version"],
  ["target schema", s => s.targets.schemaVersion = 2, "unsupported schemaVersion"],
  ["policy schema", s => s.policies.schemaVersion = 2, "unsupported schemaVersion"],
  ["typo", s => s.targets.roots[0].facets[0].weight = 2, "unknown key weight"],
  ["budget", (s, C) => C.objectives.o.importance = Infinity, "positive finite"],
  ["prototype policy", s => s.policies.policies[0].id = "constructor", "unknown policy"]
];
for (const [name, edit, message] of invalid) test(`fail closed: ${name}`, () => {
  const { index, errors } = resolve(edit);
  assert.equal(index, null);
  assert.ok(errors.some(error => error.includes(message)), errors.join("\n"));
});

test("malformed nested structures report errors without yielding partial indexes", () => {
  for (const value of [null, [], 4, "bad", {}]) {
    for (const edit of [s => s.targets = value, s => s.policies = value, s => s.manifest = value,
      s => s.targets.roots[0].anchors = [value], s => s.targets.roots[0].facets = [value],
      s => s.policies.policies[0].criteria = [value], s => s.policies.policies[0].entails = [value]]) {
      const { index, errors } = resolve(edit); assert.equal(index, null); assert.ok(errors.length);
    }
  }
});

test("versioned required capabilities fail visibly; optional adapter gaps are reported", () => {
  const { source } = masteryFixture();
  for (const edit of [s => s.manifest.schemaVersion = 2, s => delete s.manifest.required["mastery.targets"],
    s => s.manifest.required.runner = 1, s => s.manifest.required["mastery.targets"] = 2,
    s => s.manifest.optional["mastery.targets"] = 1]) {
    const { index, errors } = resolve(edit); assert.equal(index, null); assert.ok(errors.length);
  }
  source.manifest.optional["adapter.audio"] = 1;
  const errors = [], manifest = validateMasteryManifest(source.manifest, errors);
  assert.deepEqual(errors, []); assert.deepEqual(manifest.unavailable, [{ id: "adapter.audio", version: 1 }]);
});

test("fixed outcome/root budgets survive facet expansion and skill reorganization", () => {
  const original = resolve().index;
  const expanded = resolve(s => {
    const root = s.targets.roots[0];
    for (let i = 0; i < 5; i++) {
      const facet = structuredClone(root.facets[0]); facet.id = `part-${i}`;
      root.facets.push(facet); root.anchors[0].facets.push(facet.id);
    }
    root.targetOwnerModule = "another-module";
  }).index;
  assert.deepEqual(expanded.rootWeights, original.rootWeights);
  assert.deepEqual(expanded.outcomeWeights, original.outcomeWeights);
  assert.equal(Object.values(expanded.rootWeights).reduce((a, b) => a + b), 1);
  const moved = resolve(s => s.targets.roots[0].importance = 10).index;
  assert.ok(moved.rootWeights.simple > original.rootWeights.simple);
  assert.equal(moved.outcomeWeights.o, .75); assert.equal(moved.rootWeights.advanced, .25);
});

test("valid explicit descending entailment remains a rule, not earned evidence", () => {
  const { index, errors } = resolve(s => s.policies.policies[2].entails = [{ from: 7, to: 5 }]);
  assert.deepEqual(errors, []); assert.deepEqual(index.policies.P67.entails, [{ from: 7, to: 5 }]);
  assert.equal(index.roots.advanced.anchors[5], undefined);
  assert.equal(index.roots.advanced.achieved, undefined);
});
