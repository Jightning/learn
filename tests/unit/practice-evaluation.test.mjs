import test from "node:test";
import assert from "node:assert/strict";
import { registerStudy, evaluateStudy } from "../../tools/lib/practice-evaluation.mjs";

const config = { seed: "pilot-1", criteria: "Uncued representative standard", analysis: "Compare within prior-knowledge/course strata with predeclared confidence intervals",
  margins: { timeImprovement: .1, actionImprovement: .1, falseReadiness: .02, essentialGaps: .02, dropout: .02, transfer: .03, retention: .03 } };
const participants = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, course: "equations", priorKnowledge: i < 4 ? "expert" : "recovering" }));

test("registration balances prior knowledge and seals the analysis before outcomes", () => {
  const p = registerStudy(config, participants);
  for (const stratum of ["expert", "recovering"]) {
    const group = p.assignments.filter(x => x.priorKnowledge === stratum);
    assert.equal(group.filter(x => x.arm === "baseline").length, 2);
  }
  assert.deepEqual(p, registerStudy(config, [...participants].reverse()));
  assert.throws(() => registerStudy({ ...config, margins: {} }, participants), /margins/);
  p.config = { ...p.config, analysis: "Change analysis after seeing results" };
  assert.throws(() => evaluateStudy(p, []), /changed/);
});

test("missing delayed evidence and dropout cannot become successful promotion", () => {
  const p = registerStudy(config, participants);
  const rows = p.assignments.slice(0, 7).map(x => ({ id: x.id, completed: true, ready: true, rawActiveSeconds: 120, usableActiveSeconds: 100,
    actions: 10, repairActions: 2, standardScore: .92, essentialScores: [.95, .7] }));
  const r = evaluateStudy(p, rows);
  assert.equal(r.complete, false);
  assert.equal(r.promotion, "pending-review");
  assert.equal(r.arms.baseline.falseReadiness, 1);
  assert.equal(r.arms.adaptive.falseReadiness, 1);
  assert.equal(r.missing.length, 1);
  assert.ok(r.arms.baseline.dropout > 0 || r.arms.adaptive.dropout > 0);
  const dropped = { ...rows[0], completed: false, ready: false, rawActiveSeconds: 300, usableActiveSeconds: 280 };
  const costs = evaluateStudy(p, [dropped]);
  assert.equal(costs.arms[p.assignments[0].arm].rawActiveSeconds, 300);
  assert.equal(costs.arms[p.assignments[0].arm].completedRawActiveSeconds, null);
});

test("completed delayed comparison reports raw/usable cost and rejects duplicate outcomes", () => {
  const p = registerStudy(config, participants);
  const rows = p.assignments.map(x => ({ id: x.id, completed: true, ready: true, rawActiveSeconds: 120, usableActiveSeconds: 100,
    actions: 10, repairActions: 2, standardScore: .95, essentialScores: [.95, .9], transfer: .9, retention: .9, delayDays: 14 }));
  const r = evaluateStudy(p, rows);
  assert.equal(r.complete, true);
  assert.equal(r.arms.baseline.rawActiveSeconds, 120);
  assert.equal(r.arms.baseline.usableActiveSeconds, 100);
  assert.equal(r.promotion, "pending-review");
  assert.throws(() => evaluateStudy(p, [...rows, rows[0]]), /duplicate/);
  assert.throws(() => evaluateStudy(p, [{ ...rows[0], usableActiveSeconds: 130 }]), /exceeds/);
});
