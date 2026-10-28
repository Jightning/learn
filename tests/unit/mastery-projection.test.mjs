import test from "node:test";
import assert from "node:assert/strict";
import { projectMastery } from "../../src/lib/mastery-projection.js";
import { compileMastery } from "../../src/lib/mastery-schema.js";
import { compileActivities } from "../../src/lib/activity-schema.js";
import { masterySignatures } from "../../src/lib/mastery-versions.js";
import { activityInputHash, activityEventCompatibility } from "../../src/lib/activity-events.js";
import { activityFixture } from "../fixtures/mastery/activities.mjs";

const DAY = 864e5;
function fixture(edit = () => {}) {
  const f = activityFixture();
  f.source.targets.roots = [f.source.targets.roots[0]];
  f.source.policies.policies[0].delayDays = [2];
  f.activities.activities = Array.from({ length: 24 }, (_, i) => ({
    ...structuredClone(f.activities.activities[2]), id: `task-${i}`, after: [], group: `group-${i}`, support: "none"
  }));
  edit(f);
  const { C } = f, errors = [];
  C.code = "synthetic"; C.sections = [{ id: "s1", subs: [{ id: "s1-1" }] }];
  C.mastery = compileMastery(C, f.source, errors);
  C.activityIndex = compileActivities(C, C.mastery, f.activities, errors);
  assert.deepEqual(errors, []);
  masterySignatures(C);
  return { C, rows: [], verified: new Set() };
}
async function attempt(f, i, ts, { outcomes = {}, session = `session-${i}`, verified = true, input, activityId = `task-${i}`, assistance, status = "complete" } = {}) {
  const activity = f.C.activityIndex.activities[activityId];
  const base = { schemaVersion: 1, course: f.C.code, sessionId: session };
  const submitted = input ?? { text: `Committed independent solution ${i}` };
  const request = { schemaVersion: 1, adapter: { ...activity.adapter }, courseId: f.C.code, activityId,
    attemptId: `attempt-${i}`, nonce: `nonce-${i}`, contentVersion: 1, evidenceVersion: 1, rubricVersion: 1,
    input: submitted, submissionHash: await activityInputHash(submitted) };
  const submission = { ...base, id: `s-${i}`, event: "activity-submission", ts, request,
    compatibility: await activityEventCompatibility(f.C, activityId), assistance: assistance ?? { sources: [], answerExposed: false },
    timing: { activeMs: null, setupMs: null, wallMs: null, source: "external-report", interrupted: false }, environment: { description: "Synthetic environment" } };
  const { input: unused, ...binding } = request;
  const criteria = activity.tests.flatMap(t => t.criteria.map(criterion => ({ root: t.root, facet: t.facet, skill: t.skill, anchor: t.anchor,
    criterion, outcome: outcomes[`${t.facet}:${criterion}`] ?? outcomes[criterion] ?? (status === "complete" ? "pass" : "unobserved") })));
  const evaluation = { ...base, id: `e-${i}`, event: "activity-evaluation", ts: ts + 1, submissionId: submission.id,
    result: { ...binding, status, criteria, provenance: { kind: "reviewer-claim", reviewerId: "human", issuedAt: ts + 1 } } };
  f.rows.push(submission, evaluation);
  if (verified) f.verified.add(evaluation.id);
  return { submission, evaluation };
}
const run = (f, now = 100 * DAY) => projectMastery(f.C, f.rows, { now, verifiedEvaluationIds: f.verified });
const facet = (p, name = "explain", level = 3) => p.roots.simple.anchors[level].facets[name];
async function achieved(f) {
  await attempt(f, 0, 10);
  await attempt(f, 1, 20);
  await attempt(f, 2, 20 + 2 * DAY + 1);
}

test("opt-in, explicit time, invalid records and caller-owned verification fail closed", async () => {
  assert.equal(await projectMastery({}, [], {}), null);
  const f = fixture();
  await assert.rejects(projectMastery(f.C, []), /Explicit/);
  await assert.rejects(projectMastery(f.C, [], { now: 1, verifiedEvaluationIds: [] }), /verification/);
  await attempt(f, 0, 10); f.rows[0].trust = "verified";
  const errors = [];
  assert.equal(await projectMastery(f.C, f.rows, { now: 100 }, errors), null);
  assert.ok(errors.length);
});
test("unknown A stays null; percentages, claimed human provenance and receipts cannot certify", async () => {
  const f = fixture();
  assert.equal((await run(f)).roots.simple.anchor, null);
  await achieved(f); f.verified.clear();
  f.rows[1].result.receipt = "unverified receipt";
  const p = await run(f);
  assert.equal(p.roots.simple.anchor, null);
  assert.equal(p.complete, false);
  assert.equal(p.provisional.simple.anchor, 3);
});
test("verified direct checks and a fresh elapsed delayed check satisfy a root without mutating input", async () => {
  const f = fixture(); await achieved(f);
  const before = structuredClone(f.rows);
  const p = await run(f);
  assert.equal(p.roots.simple.anchor, 3);
  assert.equal(p.complete, true);
  assert.equal(p.roots.simple.historicalAnchor, 3);
  assert.deepEqual(f.rows, before);
  assert.deepEqual(await projectMastery(f.C, f.rows.toReversed().concat(f.rows), { now: 100 * DAY, verifiedEvaluationIds: f.verified }), p);
});
test("clock advance and late evaluation cannot manufacture elapsed evidence", async () => {
  const f = fixture(); await attempt(f, 0, 10); await attempt(f, 1, 20);
  const { evaluation } = await attempt(f, 2, 30);
  evaluation.ts = 10 * DAY; evaluation.result.provenance.issuedAt = 10 * DAY;
  assert.equal((await run(f)).complete, false);
  assert.equal(facet(await run(f)).delayed.length, 0);
  assert.equal((await run(f, 15)).roots.simple.anchor, null);
});
test("delay boundary uses exact elapsed milliseconds and another session", async () => {
  for (const [offset, session, complete] of [[-1, "other", false], [0, "other", true], [0, "session-1", false]]) {
    const f = fixture(); await attempt(f, 0, 10); await attempt(f, 1, 20);
    await attempt(f, 2, 21 + 2 * DAY + offset, { session });
    assert.equal((await run(f)).complete, complete);
  }
});
for (const mode of ["same activity", "same group", "same input", "same question", "guided", "assisted", "answer exposed", "unobserved"]) {
  test(`${mode} cannot supply independent anchored credit`, async () => {
    const f = fixture(g => {
      if (mode === "same group") g.activities.activities.forEach(a => a.group = "same");
      if (mode === "same question") g.activities.activities.forEach(a => { a.kind = "question"; a.adapter.id = "question"; a.question = "ledger-total"; });
      if (mode === "guided") g.activities.activities.forEach(a => a.support = "guided");
    });
    for (const i of [0, 1, 2]) await attempt(f, i, 10 + i * 3 * DAY, {
      ...(mode === "same activity" ? { activityId: "task-0" } : {}),
      ...(mode === "same input" ? { input: { text: "same committed solution" } } : {}),
      ...(mode === "assisted" ? { assistance: { sources: ["ai"], answerExposed: false } } : {}),
      ...(mode === "answer exposed" ? { assistance: { sources: [], answerExposed: true } } : {}),
      ...(mode === "unobserved" ? { outcomes: { reason: "unobserved" } } : {})
    });
    assert.equal((await run(f)).complete, false);
  });
}
test("late disclosures retract credit; a later clean revision cannot erase exposure", async () => {
  const f = fixture(); await achieved(f);
  const submission = f.rows[0];
  const revision = { schemaVersion: 1, course: f.C.code, sessionId: "late", event: "activity-context-revision", id: "revision", ts: 5 * DAY,
    submissionId: submission.id, assistance: { sources: ["solution"], answerExposed: true }, timing: submission.timing, reason: "Late disclosure" };
  f.rows.push(revision, { ...revision, id: "revision2", ts: 6 * DAY, assistance: { sources: [], answerExposed: false }, reason: "Claimed clean context" });
  assert.equal((await run(f, 4 * DAY)).complete, true);
  assert.equal((await run(f)).complete, false);
});
test("P45/P67 enforce group/session minima and explicit unfamiliar demand", async () => {
  for (const [policy, level, n] of [["P45", 5, 3], ["P67", 7, 4]]) {
    const f = fixture(g => {
      const root = g.source.targets.roots[0];
      root.policy = policy; root.requiredAnchor = level; root.anchors[0].level = level; root.facets[0].anchors[0].level = level;
      g.source.policies.policies.find(p => p.id === policy).delayDays = [2];
      g.activities.activities.forEach(a => { a.tests[0].anchor = level; });
      if (policy === "P67") g.activities.activities[n].tests[0].unfamiliarConstraint = true;
    });
    for (let i = 0; i < n; i++) await attempt(f, i, 10 + i, { session: "one" });
    assert.equal((await run(f)).roots.simple.anchors[level].facets.explain.baseline, null);
    await attempt(f, n, 100, { session: "two" });
    assert.equal((await run(f)).roots.simple.anchors[level].facets.explain.baseline, 101);
    await attempt(f, n + 1, 101 + 2 * DAY, { session: "three" });
    assert.equal((await run(f)).complete, true);
  }
});
test("P67 stays unknown without an unfamiliar constraint despite ample passing work", async () => {
  const f = fixture(g => {
    const r = g.source.targets.roots[0]; r.policy = "P67"; r.requiredAnchor = 7; r.anchors[0].level = 7; r.facets[0].anchors[0].level = 7;
    g.activities.activities.forEach(a => a.tests[0].anchor = 7);
  });
  for (let i = 0; i < 8; i++) await attempt(f, i, 10 + i * 22 * DAY);
  assert.equal((await run(f, 200 * DAY)).complete, false);
});
test("critical failures reopen only the observed facet, preserving historical achievement", async () => {
  const f = fixture(g => {
    const r = g.source.targets.roots[0];
    r.facets.push({ ...structuredClone(r.facets[0]), id: "build" }); r.anchors[0].facets.push("build");
    g.activities.activities.forEach(a => a.tests.push({ ...structuredClone(a.tests[0]), facet: "build" }));
  });
  await achieved(f);
  assert.equal((await run(f)).complete, true);
  await attempt(f, 3, 3 * DAY, { outcomes: { "explain:correct": "fail", "build:correct": "unobserved", "build:reason": "unobserved" } });
  let p = await run(f);
  assert.equal(p.roots.simple.anchor, null);
  assert.equal(p.roots.simple.historicalAnchor, 3);
  assert.equal(facet(p, "build").complete, true);
  assert.equal(facet(p).historical, true);
  assert.deepEqual(facet(p).contradictions, ["e-3"]);
  await attempt(f, 4, 4 * DAY); await attempt(f, 5, 5 * DAY);
  assert.equal((await run(f)).complete, false);
  await attempt(f, 6, 7 * DAY + 1);
  p = await run(f);
  assert.equal(p.complete, true);
  assert.deepEqual(facet(p).contradictions, []);
});
test("re-evaluations are not fresh attempts and self corrections cannot grant verified recovery", async () => {
  const f = fixture(); await achieved(f);
  const { evaluation } = await attempt(f, 3, 3 * DAY, { outcomes: { correct: "fail" } });
  const correction = structuredClone(evaluation); correction.id = "correction"; correction.ts = 4 * DAY;
  correction.supersedes = evaluation.id; correction.reason = "Claimed correction";
  correction.result.provenance.issuedAt = correction.ts;
  correction.result.criteria.forEach(c => c.outcome = "pass"); f.rows.push(correction);
  assert.equal((await run(f)).complete, false);
  f.verified.add(correction.id);
  assert.equal(facet(await run(f)).groups, 0, "even verified review of failed work is not fresh repair");
});
for (const status of ["execution-error", "unavailable", "incomplete"]) test(`${status} cannot reopen or certify a facet`, async () => {
  const f = fixture(); await achieved(f); await attempt(f, 3, 3 * DAY, { status });
  assert.equal((await run(f)).complete, true);
});
test("all critical and at least 80% noncritical; empty noncritical is explicitly satisfied", async () => {
  for (const [noncritical, failures, complete] of [[0, 0, true], [5, 1, true], [5, 2, false]]) {
    const f = fixture(g => {
      const p = g.source.policies.policies[0]; p.criteria = [p.criteria[0], ...Array.from({ length: noncritical }, (_, i) => ({ id: `n${i}`, standard: "Observed detail", critical: false }))];
      const ids = p.criteria.map(c => c.id); g.source.targets.roots[0].facets[0].anchors[0].criteria = ids;
      g.activities.activities.forEach(a => a.tests[0].criteria = ids);
    });
    const outcomes = Object.fromEntries(Array.from({ length: failures }, (_, i) => [`n${i}`, "fail"]));
    await attempt(f, 0, 10, { outcomes }); await attempt(f, 1, 20, { outcomes }); await attempt(f, 2, 21 + 2 * DAY, { outcomes });
    assert.equal((await run(f)).complete, complete);
  }
});
test("policy delay opportunities need separate fresh observations, not one late check", async () => {
  const f = fixture(g => g.source.policies.policies[0].delayDays = [2, 7, 21]);
  await attempt(f, 0, 10); await attempt(f, 1, 20); await attempt(f, 2, 22 * DAY);
  assert.deepEqual(facet(await run(f)).missingDelayDays, [7, 21]);
  await attempt(f, 3, 23 * DAY); await attempt(f, 4, 24 * DAY);
  assert.equal((await run(f)).complete, true);
});
test("anchor demand is exact unless explicit descending entailment exists; highest satisfied wins", async () => {
  for (const explicit of [false, true]) {
    const f = fixture(g => {
      const r = g.source.targets.roots[0];
      r.anchors.push({ ...structuredClone(r.anchors[0]), level: 2 });
      r.facets[0].anchors.push({ ...structuredClone(r.facets[0].anchors[0]), level: 2 });
      if (explicit) g.source.policies.policies[0].entails = [{ from: 3, to: 2 }];
    });
    await achieved(f);
    const p = await run(f);
    assert.equal(p.roots.simple.anchor, 3);
    assert.equal(p.roots.simple.anchors[2].complete, explicit);
  }
});
test("all-root completion never becomes an average and historical claims never grant technical credit", async () => {
  const f = fixture(g => {
    const other = structuredClone(g.source.targets.roots[0]); other.id = "other"; other.claimRequirement = "historical-evidence";
    g.source.targets.roots.push(other);
  });
  await achieved(f);
  const claim = { schemaVersion: 1, course: f.C.code, sessionId: "claim", event: "activity-claim", id: "claim", ts: 10 * DAY,
    root: "other", semanticVersion: 1, status: "submitted", sources: ["https://example.invalid/report"], uncertainty: "Unverified historical metric",
    provenance: { kind: "reviewer-claim", reviewerId: "human", issuedAt: 10 * DAY } };
  f.rows.push(claim);
  const p = await run(f);
  assert.equal(p.roots.simple.complete, true); assert.equal(p.roots.other.anchor, null); assert.equal(p.complete, false);
  assert.equal(p.claims.other.status, "submitted"); assert.equal(p.claims.other.verified, false); assert.equal(p.historicalClaimsComplete, false);
});
test("incompatible records fail rather than being relabelled current; organization edits preserve evidence", async () => {
  const f = fixture(); await achieved(f);
  f.C.mastery.roots.simple.importance++; masterySignatures(f.C);
  assert.equal((await run(f)).complete, true);
  f.C.mastery.policies.P3.version++; masterySignatures(f.C);
  assert.equal(await run(f), null);
});

test("verified superseding withdrawal removes stale credit without inventing failed criteria", async () => {
  const f = fixture(); await achieved(f);
  const correction = structuredClone(f.rows[1]);
  correction.id = "withdrawal"; correction.ts = 4 * DAY; correction.supersedes = f.rows[1].id; correction.reason = "Observation was unsupported";
  correction.result.provenance.issuedAt = correction.ts; correction.result.criteria.forEach(c => c.outcome = "unobserved");
  f.rows.push(correction); f.verified.add(correction.id);
  const p = await run(f);
  assert.equal(p.complete, false); assert.equal(p.roots.simple.historicalAnchor, 3);
  assert.deepEqual(facet(p).contradictions, ["withdrawal"]);
});
test("multiple reviews of one response never satisfy group or delay minima", async () => {
  const f = fixture(); const { evaluation } = await attempt(f, 0, 10);
  for (let i = 0; i < 5; i++) {
    const review = structuredClone(evaluation); review.id = `review-${i}`; review.ts = (i + 1) * 3 * DAY;
    review.result.provenance.issuedAt = review.ts; f.rows.push(review); f.verified.add(review.id);
  }
  assert.equal(facet(await run(f)).groups, 1);
  assert.equal((await run(f)).complete, false);
});
test("untrusted contradiction cannot retract verified credit; future failures wait for their timestamp", async () => {
  const f = fixture(); await achieved(f);
  const { evaluation } = await attempt(f, 3, 3 * DAY, { verified: false, outcomes: { correct: "fail" } });
  assert.equal((await run(f)).complete, true);
  assert.equal((await run(f)).provisional.simple.complete, false);
  f.verified.add(evaluation.id);
  assert.equal((await run(f, 3 * DAY)).complete, true);
  assert.equal((await run(f, 3 * DAY + 1)).complete, false);
});
test("partial attribution from separate native skills cannot be stitched into one passing check", async () => {
  const f = fixture(g => {
    const r = g.source.targets.roots[0]; r.skills.push("b"); r.facets[0].skills.push("b");
    g.activities.activities.forEach(a => a.tests.push({ ...structuredClone(a.tests[0]), skill: "b" }));
  });
  await achieved(f);
  for (const row of f.rows.filter(r => r.event === "activity-evaluation")) for (const c of row.result.criteria)
    if (c.skill === "a" && c.criterion === "reason" || c.skill === "b" && c.criterion === "correct") c.outcome = "unobserved";
  assert.equal((await run(f)).complete, false);
});
test("only applicable facets gate an anchor; historical requirements remain separate after technical completion", async () => {
  const f = fixture(g => {
    const r = g.source.targets.roots[0]; r.claimRequirement = "historical-evidence";
    r.anchors.push({ level: 2, standard: "Build at level two", facets: ["build"] });
    r.facets.push({ id: "build", standard: "Build independently", skills: ["a"], anchors: [{ level: 2, standard: "Working artifact", criteria: ["correct"] }] });
  });
  await achieved(f);
  const p = await run(f);
  assert.equal(p.complete, true); assert.equal(p.historicalClaimsComplete, false);
  assert.equal(p.roots.simple.anchors[2].complete, false);
});
test("organization-only delay scheduling edits do not reinterpret evidence gates", async () => {
  const f = fixture(); await achieved(f);
  f.C.activityIndex.activities["task-2"].delay = { activity: "task-0", root: "simple", days: 21, after: "qualifying-evidence-or-repair" };
  masterySignatures(f.C);
  assert.equal((await run(f)).complete, true);
});

test("a failure at higher demand does not negate a satisfied lower anchor", async () => {
  const f = fixture(g => {
    const r = g.source.targets.roots[0];
    r.anchors.push({ ...structuredClone(r.anchors[0]), level: 2 });
    r.facets[0].anchors.push({ ...structuredClone(r.facets[0].anchors[0]), level: 2 });
    g.source.policies.policies[0].entails = [{ from: 3, to: 2 }];
  });
  await achieved(f); await attempt(f, 3, 3 * DAY, { outcomes: { correct: "fail" } });
  const p = await run(f);
  assert.equal(p.roots.simple.anchor, 2);
  assert.equal(p.roots.simple.complete, false);
  assert.equal(p.roots.simple.historicalAnchor, 3);
});
test("unfamiliar demand edits change compatibility and cannot relabel old observations", async () => {
  const f = fixture(); await achieved(f);
  f.C.activityIndex.activities["task-0"].tests[0].unfamiliarConstraint = true;
  masterySignatures(f.C);
  assert.equal(await run(f), null);
});
