import test from "node:test";
import assert from "node:assert/strict";
import { validateAdapterRequest, validateAdapterResult } from "../../src/lib/activity-adapters.js";
import { activityFixture } from "../fixtures/mastery/activities.mjs";
function fixture(n = 0) {
  const activity = activityFixture().activities.activities[n];
  const request = { schemaVersion: 1, adapter: { ...activity.adapter }, courseId: "synthetic", activityId: activity.id,
    attemptId: "attempt-1", nonce: "nonce-1", submissionHash: "a".repeat(64), contentVersion: 1, evidenceVersion: 1, rubricVersion: 1,
    input: { text: "Committed reasoning before feedback" } };
  const { input, ...binding } = request;
  const result = { ...binding, status: "complete", criteria: [{ ...activity.tests[0], criterion: "correct", outcome: "pass" }],
    provenance: { kind: "reviewer-claim", reviewerId: "human", issuedAt: 1000 } };
  delete result.criteria[0].criteria;
  return { activity, request, result };
}
test("every adapter shares identity/version envelopes; claimed human review is untrusted", () => {
  for (const n of [0, 1, 2, 5, 6]) {
    const { activity, request, result } = fixture(n), errors = [];
    if (n === 5) request.input.artifacts = [{ id: "audio", url: "https://example.invalid/voice.ogg", sha256: "b".repeat(64), bytes: 100, mediaType: "audio/ogg" }];
    const before = structuredClone({ request, result });
    assert.ok(validateAdapterRequest(request, activity, errors));
    assert.equal(validateAdapterResult(result, request, activity, errors)?.trust, "untrusted");
    assert.deepEqual(errors, []);
    assert.deepEqual({ request, result }, before);
  }
});
const edits = [
  ["identity", (q, r) => r.attemptId = "another"],
  ["nonce", (q, r) => r.nonce = "another"],
  ["hash", (q, r) => r.submissionHash = "b".repeat(64)],
  ["semantic version", (q, r) => r.contentVersion = 2],
  ["evidence version", (q, r) => r.evidenceVersion = 2],
  ["rubric version", (q, r) => r.rubricVersion = 2],
  ["adapter", (q, r) => r.adapter.version = 2],
  ["forged trust", (q, r) => r.trust = "authenticated"],
  ["forged provenance", (q, r) => r.provenance.kind = "authenticated"],
  ["criterion scope", (q, r) => r.criteria[0].skill = "c"],
  ["duplicate result", (q, r) => r.criteria.push(r.criteria[0])],
  ["too many results", (q, r) => r.criteria = Array(65).fill(r.criteria[0])],
  ["execution error credit", (q, r) => r.status = "execution-error"],
  ["infrastructure failure", (q, r) => { r.status = "unavailable"; r.criteria[0].outcome = "fail"; }],
  ["oversized receipt", (q, r) => r.receipt = "x".repeat(16385)],
  ["oversized input", q => q.input.text = "x".repeat(32769)],
  ["malformed input", q => q.input.text = 5],
  ["empty input", q => q.input = {}],
  ["input trust", q => q.grader = "human"],
  ["bad input hash", q => q.submissionHash = "bad"],
  ["input version", q => q.evidenceVersion = 2],
  ["malformed artifact", q => q.input.artifacts = [null]],
  ["oversized references", q => q.input.artifacts = Array(9).fill({})],
  ["unsafe reference", q => q.input.artifacts = [{ id: "x", url: "javascript:alert(1)", sha256: "a".repeat(64), bytes: 1, mediaType: "text/plain" }]],
];
for (const [name, edit] of edits) test(`reject adapter ${name}`, () => {
  const { activity, request, result } = fixture();
  edit(request, result);
  const errors = [];
  assert.equal(validateAdapterResult(result, request, activity, errors), null);
  assert.ok(errors.length);
});
test("infrastructure status carries only unobserved criteria; opaque receipt never authenticates", () => {
  const { activity, request, result } = fixture();
  for (const status of ["execution-error", "unavailable", "incomplete"]) {
    result.status = status; result.criteria[0].outcome = "unobserved"; result.receipt = "claimed-signed-receipt";
    const errors = [], normalized = validateAdapterResult(result, request, activity, errors);
    assert.deepEqual(errors, []);
    assert.equal(normalized.trust, "untrusted");
  }
});
test("audio transcript alone cannot stand for audio evidence", () => {
  const { activity, request } = fixture(5), errors = [];
  assert.equal(validateAdapterRequest(request, activity, errors), null);
  assert.match(errors.join("\n"), /audio requires an artifact/);
});
