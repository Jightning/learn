import test from "node:test";
import assert from "node:assert/strict";
import { activityInputHash, activityEventCompatibility, validateActivityEvents, ACTIVITY_EVENT_LIMITS } from "../../src/lib/activity-events.js";
import { activityFixture } from "../fixtures/mastery/activities.mjs";
import { compileMastery } from "../../src/lib/mastery-schema.js";
import { compileActivities } from "../../src/lib/activity-schema.js";
import { masterySignatures } from "../../src/lib/mastery-versions.js";

async function fixture() {
  const { C, source, activities } = activityFixture(), errors = [];
  C.code = "synthetic";
  C.sections = [{ id: "s1", subs: [{ id: "s1-1" }] }];
  C.mastery = compileMastery(C, source, errors);
  C.activityIndex = compileActivities(C, C.mastery, activities, errors);
  assert.deepEqual(errors, []);
  masterySignatures(C);
  const activity = C.activityIndex.activities.lab;
  const base = (id, event, ts) => ({ schemaVersion: 1, id, event, course: C.code, ts, sessionId: "session-1" });
  const input = { text: "Independent cost ledger implementation before feedback", artifacts: [{ id: "code", url: "https://example.invalid/code.py", sha256: "b".repeat(64), bytes: 200, mediaType: "text/plain" }] };
  const request = { schemaVersion: 1, courseId: C.code, activityId: activity.id, attemptId: "attempt-1", nonce: "nonce-1",
    adapter: { ...activity.adapter }, contentVersion: 1, evidenceVersion: 1, rubricVersion: 1, submissionHash: await activityInputHash(input), input };
  const submission = { ...base("s", "activity-submission", 100), request, compatibility: await activityEventCompatibility(C, activity.id),
    assistance: { sources: [], answerExposed: false }, timing: { activeMs: 20, setupMs: 10, wallMs: 40, source: "external-report", interrupted: false },
    environment: { description: "Python 3 standard library", fixture: "cost-ledger@1", seed: "42" } };
  const { input: unused, ...binding } = request;
  const { criteria: unusedCriteria, ...target } = activity.tests[0];
  const evaluation = { ...base("e", "activity-evaluation", 200), submissionId: "s", result: { ...binding, status: "complete",
    criteria: [{ ...target, criterion: "correct", outcome: "fail" }], provenance: { kind: "reviewer-claim", reviewerId: "human", issuedAt: 150 } } };
  const feedback = { ...base("f", "activity-feedback", 300), evaluationId: "e" };
  const correction = { ...structuredClone(evaluation), id: "c", ts: 400, supersedes: "e", reason: "Self-reported criterion correction" };
  correction.result.criteria[0].outcome = "pass";
  correction.result.provenance = { kind: "self-report", reviewerId: "learner", issuedAt: 350 };
  return { C, submission, evaluation, feedback, correction, rows: [submission, evaluation, feedback, correction] };
}
async function reject(edit, pattern) {
  const f = await fixture();
  await edit(f);
  const errors = [];
  assert.equal(await validateActivityEvents(f.rows, f.C, errors), null);
  assert.ok(errors.length);
  if (pattern) assert.match(errors.join("\n"), pattern);
}

test("commit, explicit attribution, feedback and immutable corrections preserve first work/result", async () => {
  const { C, rows } = await fixture(), before = structuredClone(rows), errors = [];
  const result = await validateActivityEvents(rows.toReversed(), C, errors);
  assert.deepEqual(errors, []);
  assert.deepEqual(rows, before);
  assert.equal(result[0].request.input.text, rows[0].request.input.text);
  assert.equal(result[1].result.criteria[0].outcome, "fail");
  assert.equal(result[3].result.criteria[0].outcome, "pass");
  assert.ok(result.every(row => row.trust === "untrusted"));
  assert.equal(result[1].result.trust, "untrusted");
  assert.equal(result[1].result.criteria.length, 1, "unobserved criteria never gain inferred credit");
  assert.throws(() => result[0].request.input.text = "changed", TypeError);
  assert.throws(() => result[1].result.criteria.push({}), TypeError);
  assert.deepEqual(await validateActivityEvents(result, C), result, "normalized JSON round trips");
});
test("canonical input hash binds text, artifact hash, size, media and reference; key order is irrelevant", async () => {
  assert.equal(await activityInputHash({ text: "x", artifacts: [] }), await activityInputHash({ artifacts: [], text: "x" }));
  const { submission } = await fixture();
  for (const edit of [x => x.text += "!", x => x.artifacts[0].sha256 = "c".repeat(64), x => x.artifacts[0].bytes++, x => x.artifacts[0].mediaType = "text/python", x => x.artifacts[0].url += "?v=2"]) {
    const input = structuredClone(submission.request.input); edit(input);
    assert.notEqual(await activityInputHash(input), submission.request.submissionHash);
  }
});
test("identical imports deduplicate; conflicting event IDs and attempt/nonce reuse fail", async () => {
  const { C, rows } = await fixture();
  assert.equal((await validateActivityEvents([...rows, ...structuredClone(rows)], C)).length, 4);
  const normalized = await validateActivityEvents(rows, C);
  assert.equal((await validateActivityEvents([...rows, ...normalized], C)).length, 4);
  await reject(f => { f.rows.push({ ...f.submission, ts: 101 }); }, /conflicting duplicate/);
  await reject(f => { f.rows.push({ ...f.submission, id: "s2", ts: 110 }); }, /duplicate committed attempt/);
  await reject(f => { const s = structuredClone(f.submission); s.id = "s2"; s.ts++; s.request.attemptId = "new"; f.rows.push(s); }, /duplicate committed attempt\/nonce/);
});
const invalid = [
  ["text tampering", f => f.submission.request.input.text += "edited", /hash mismatch/],
  ["artifact tampering", f => f.submission.request.input.artifacts[0].sha256 = "c".repeat(64), /hash mismatch/],
  ["cross course", f => f.submission.request.courseId = "other", /course mismatch/],
  ["forged reviewer label", f => f.evaluation.result.provenance.kind = "authenticated", /provenance/],
  ["forged trust", f => f.evaluation.trust = "authenticated", /trusted provenance/],
  ["forged nested trust", f => f.evaluation.result.trust = "authenticated", /unknown key trust/],
  ["forged grader", f => f.evaluation.grader = "human", /unknown key/],
  ["policy change", f => f.submission.compatibility.policies.P3++, /compatibility/],
  ["semantic signature", f => f.C.activityIndex.activities.lab.contentSignature += "changed", /compatibility/],
  ["evidence signature", f => f.C.activityIndex.activities.lab.evidenceSignature += "changed", /compatibility/],
  ["rubric signature", f => f.C.activityIndex.activities.lab.rubricSignature += "changed", /compatibility/],
  ["task version", f => f.evaluation.result.contentVersion++, /contentVersion/],
  ["result hash", f => f.evaluation.result.submissionHash = "c".repeat(64), /submissionHash/],
  ["result nonce", f => f.evaluation.result.nonce = "another", /nonce/],
  ["result adapter version", f => f.evaluation.result.adapter.version++, /version/],
  ["unattributed skill", f => f.evaluation.result.criteria[0].skill = "c", /attribution/],
  ["duplicate criterion", f => f.evaluation.result.criteria.push(f.evaluation.result.criteria[0]), /duplicate criterion/],
  ["evaluation before commit", f => f.evaluation.ts = 50, /missing or later/],
  ["issued before commit", f => f.evaluation.result.provenance.issuedAt = 99, /issuance/],
  ["issued after record", f => f.evaluation.result.provenance.issuedAt = 201, /issuance/],
  ["feedback before evaluation", f => f.feedback.ts = 150, /missing or later/],
  ["missing correction", f => f.correction.supersedes = "unknown", /missing or later/],
  ["missing correction reason", f => delete f.correction.reason, /reason/],
  ["wrong correction submission", f => f.correction.submissionId = "unknown", /missing or later/],
  ["empty assistance", f => f.submission.assistance = {}, /actual assistance/],
  ["malformed assistance", f => f.submission.assistance.sources = {}, /actual assistance/],
  ["duplicate assistance", f => f.submission.assistance.sources = ["ai", "ai"], /assistance/],
  ["solution without exposure", f => f.submission.assistance.sources = ["solution"], /exposure/],
  ["negative timing", f => f.submission.timing.activeMs = -1, /timing/],
  ["wall time contradiction", f => f.submission.timing.wallMs = 1, /wall time/],
  ["missing timing", f => delete f.submission.timing.activeMs, /timing/],
  ["invalid feedback timing", f => f.feedback.timing = { activeMs: -1 }, /timing/],
  ["invalid repair method", f => f.feedback.repair = "invented-test", /repair/],
  ["infinite time", f => f.submission.timing.activeMs = Infinity, /JSON/],
  ["invalid timestamp", f => f.submission.ts = -1, /time/],
  ["unknown event", f => f.submission.event = "attempt", /identity/],
  ["prototype activity", f => f.submission.request.activityId = "__proto__", /unknown activity/],
  ["null record", f => f.rows.push(null), /mapping/],
  ["cyclic record", f => f.submission.environment.seed = f.submission, /JSON/],
  ["oversized multibyte input", f => f.submission.request.input.text = "界".repeat(6000), /bounded JSON/],
  ["oversized notes", f => f.submission.assistance.notes = "x".repeat(2049), /assistance/],
  ["oversized receipt", f => f.evaluation.result.receipt = "x".repeat(16385), /bounded JSON/],
];
for (const [name, edit, pattern] of invalid) test(`reject activity event ${name}`, () => reject(edit, pattern));

test("infrastructure errors carry no skill success/failure, receipts cannot establish trust", async () => {
  for (const status of ["execution-error", "unavailable", "incomplete"]) {
    for (const outcome of ["fail", "pass"]) await reject(f => { f.evaluation.result.status = status; f.evaluation.result.criteria[0].outcome = outcome; }, /cannot imply/);
    const { C, rows, evaluation } = await fixture();
    evaluation.result.status = status; evaluation.result.criteria = []; evaluation.result.receipt = "claimed signed verdict";
    assert.equal((await validateActivityEvents(rows, C))[1].result.trust, "untrusted");
  }
});
test("actual assistance/context corrections append without rewriting committed context", async () => {
  const { C, rows, submission } = await fixture();
  rows.push({ schemaVersion: 1, event: "activity-context-revision", id: "context", course: C.code, ts: 500, sessionId: "session-2", submissionId: "s",
    assistance: { sources: ["ai", "solution"], answerExposed: true, notes: "Disclosed after submission" },
    timing: { activeMs: null, setupMs: null, wallMs: null, interrupted: true, source: "external-report" }, reason: "Corrected assistance disclosure" });
  const result = await validateActivityEvents(rows, C);
  assert.deepEqual(result[0].assistance.sources, []);
  assert.deepEqual(result.at(-1).assistance.sources, ["ai", "solution"]);
  assert.equal(result.at(-1).timing.activeMs, null);
  assert.deepEqual(submission.assistance.sources, []);
  await reject(f => { f.rows.push({ ...rows.at(-1), reason: "" }); }, /reason/);
});
test("historical claims retain sources and uncertainty separately from technical evaluations", async () => {
  const { C, rows } = await fixture();
  C.mastery.roots.simple.claimRequirement = "historical-evidence";
  const claim = { schemaVersion: 1, event: "activity-claim", id: "claim", course: C.code, ts: 500, sessionId: "session-1", root: "simple", semanticVersion: 1,
    status: "submitted", sources: ["https://example.invalid/report"], uncertainty: "Historical metric not independently established", provenance: { kind: "reviewer-claim", reviewerId: "human", issuedAt: 450 } };
  rows.push(claim, { ...claim, id: "claim2", ts: 600, status: "withdrawn", supersedes: "claim", reason: "Source qualification changed" });
  const result = await validateActivityEvents(rows, C);
  assert.equal(result.at(-1).trust, "untrusted");
  assert.equal(result.at(-2).status, "submitted");
  for (const edit of [c => c.status = "verified", c => c.uncertainty = "", c => c.sources = [], c => c.sources = ["file:///private/report"], c => c.semanticVersion++, c => c.provenance.kind = "authenticated"]) {
    const changed = structuredClone(rows); edit(changed[4]);
    assert.equal(await validateActivityEvents(changed, C), null);
  }
});
test("organization edits preserve identities; rubric edits reject mismatched records", async () => {
  const { C, rows } = await fixture();
  C.activityIndex.activities.lab.lesson = "s2-1"; C.mastery.roots.simple.importance++;
  masterySignatures(C);
  assert.ok(await validateActivityEvents(rows, C));
  C.mastery.policies.P3.version++;
  masterySignatures(C);
  assert.equal(await validateActivityEvents(rows, C), null);
});
test("fail closed on malformed batches/preconditions and retain existing diagnostic entries", async () => {
  const { C, rows } = await fixture();
  for (const value of [null, {}, Array(ACTIVITY_EVENT_LIMITS.batch + 1).fill(rows[0])]) assert.equal(await validateActivityEvents(value, C), null);
  await assert.rejects(validateActivityEvents(rows, {}), /Resolved mastery/);
  const errors = ["previous diagnostic"];
  assert.ok(await validateActivityEvents(rows, C, errors));
  assert.deepEqual(errors, ["previous diagnostic"]);
});

test("malformed nested values fail with diagnostics rather than crashing validation", async () => {
  const values = [null, false, 2, "text", [], {}, { unexpected: true }];
  const paths = [["request"], ["request", "adapter"], ["request", "input"], ["request", "input", "artifacts"], ["compatibility"], ["environment"], ["assistance"], ["assistance", "sources"], ["timing"]];
  for (const path of paths) for (const value of values) {
    if (path.join(".") === "assistance.sources" && Array.isArray(value)) continue; // Empty assistance is valid.
    const f = await fixture();
    let target = f.submission;
    for (const key of path.slice(0, -1)) target = target[key];
    target[path.at(-1)] = value;
    assert.equal(await validateActivityEvents(f.rows, f.C), null, path.join("."));
  }
  for (const field of ["result", "result.adapter", "result.provenance", "result.criteria"]) for (const value of values) {
    const f = await fixture(), path = field.split(".");
    let target = f.evaluation;
    for (const key of path.slice(0, -1)) target = target[key];
    target[path.at(-1)] = value;
    assert.equal(await validateActivityEvents(f.rows, f.C), null, field);
  }
  for (const event of ["__proto__", "constructor", "toString"]) await reject(f => f.submission.event = event, /identity/);
});
test("corrections cannot point to a different submission or historical root", async () => {
  const { C, rows, submission, correction } = await fixture();
  const other = structuredClone(submission);
  other.id = "s-other"; other.ts = 110; other.request.attemptId = "another-attempt"; other.request.nonce = "another-nonce";
  correction.submissionId = other.id;
  correction.result.attemptId = other.request.attemptId; correction.result.nonce = other.request.nonce;
  rows.push(other);
  const errors = [];
  assert.equal(await validateActivityEvents(rows, C, errors), null);
  assert.match(errors.join("\n"), /retain original submission/);
});
test("whole normalized record bound accounts for trust metadata and JSON overhead", async () => {
  const { C, submission } = await fixture();
  submission.trust = "untrusted";
  const size = row => new TextEncoder().encode(JSON.stringify(row)).length;
  const initial = size(submission);
  submission.request.input.text += "x".repeat(ACTIVITY_EVENT_LIMITS.bytes - initial);
  submission.request.submissionHash = await activityInputHash(submission.request.input);
  assert.equal(size(submission), ACTIVITY_EVENT_LIMITS.bytes);
  assert.ok(await validateActivityEvents([submission], C));
  delete submission.trust;
  submission.request.input.text += "x";
  submission.request.submissionHash = await activityInputHash(submission.request.input);
  assert.ok(size(submission) < ACTIVITY_EVENT_LIMITS.bytes);
  const errors = [];
  assert.equal(await validateActivityEvents([submission], C, errors), null);
  assert.match(errors.join("\n"), /normalized record exceeds/);
});
