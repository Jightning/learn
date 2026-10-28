import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { recordActivityEvent, saveActivityDraft, rebuildActivityState, activityBackup, restoreActivityBackup } from '../../src/lib/mastery-state.js';
import { rebuildMastery } from '../../src/lib/replay.js';
import { persistenceCourse, submissionFields, evaluationFields } from '../fixtures/mastery/history.mjs';
import { logRows, clearLog, keys, removeItem, setItem, getItem, appendRow, markSent } from '../../src/lib/store.js';
import { fromJSON, toJSON } from '../../src/lib/log.js';
import { masterySignatures } from '../../src/lib/mastery-versions.js';
import { masterySnapshot, snapshotIdentity, resolveMasterySnapshot } from '../../src/lib/mastery-snapshot.js';
import { projectMastery } from '../../src/lib/mastery-projection.js';
import { mine } from '../../src/lib/prefs.js';

const cid = 'folder', DAY = 864e5, now = 10 * DAY;
const wipe = () => { clearLog(); for (const k of keys()) removeItem(k); };
beforeEach(wipe);
async function achieved(C = persistenceCourse()) {
  const verifiedEvaluationIds = new Set();
  for (const [i, ts] of [[0, 10], [1, 20], [2, 21 + 2 * DAY]]) {
    const sub = await recordActivityEvent(cid, C, await submissionFields(C, i), { now: ts, sessionId: `s-${i}` });
    const e = await recordActivityEvent(cid, C, evaluationFields(C, sub, ts + 1), { now: ts + 1, sessionId: `s-${i}` });
    verifiedEvaluationIds.add(e.id);
  }
  return { C, verifiedEvaluationIds };
}
const run = (C, verifiedEvaluationIds = new Set()) => rebuildMastery(cid, C, { now, verifiedEvaluationIds });

test('definition snapshots recompile without accepting imported indexes', async () => {
  const C = persistenceCourse(), snapshot = masterySnapshot(C);
  const restored = resolveMasterySnapshot(snapshot);
  assert.deepEqual(restored.mastery, C.mastery);
  assert.deepEqual(restored.activityIndex, C.activityIndex);
  assert.match(await snapshotIdentity(snapshot), /^[a-f0-9]{64}$/);
  snapshot.source.policies.policies[0].noncriticalFloor = 0;
  assert.throws(() => resolveMasterySnapshot(snapshot), /Invalid mastery definition/);
});

test('live append and fresh export/restore replay agree; folder ownership differs from bound course code', async () => {
  const { C, verifiedEvaluationIds } = await achieved();
  await saveActivityDraft(cid, C, 'task-3', { text: 'Unfinished response' }, { now: 100 });
  const live = await run(C, verifiedEvaluationIds);
  assert.equal(live.projection.complete, true);
  assert.equal(live.projection.provisional.simple.anchor, 3);
  assert.ok(logRows().every(r => r.course === cid && r.courseCode === C.code && r.id.startsWith(getItem('device:id') + ':')));
  setItem('cloud:secret', 'must not export');
  const backup = toJSON();
  assert.ok(!backup.includes('must not export'));
  const normalizedRows = logRows().map(({ definitionId, courseCode, sent, ...row }) => ({ ...row, course: courseCode }));
  assert.deepEqual(live.projection, await projectMastery(C, normalizedRows, { now, verifiedEvaluationIds }));
  wipe();
  assert.equal((await fromJSON(backup)).merged, 6);
  assert.equal(getItem('device:id'), null);
  assert.deepEqual(await run(C, verifiedEvaluationIds), live);
  assert.equal((await run(C)).projection.complete, false, 'imported human labels cannot restore authority');
  assert.equal((await fromJSON(backup)).merged, 0);
  assert.deepEqual(await run(C, verifiedEvaluationIds), live);
});

test('out-of-order imports and bookkeeping converge; duplicate conflicts fail before mutation', async () => {
  const { C } = await achieved(), baseline = await run(C);
  const backup = JSON.parse(toJSON());
  backup.rows = backup.rows.toReversed().concat(backup.rows);
  wipe(); await fromJSON(JSON.stringify(backup));
  assert.deepEqual(await run(C), baseline);
  markSent(logRows().map(r => r.id));
  assert.equal((await fromJSON(JSON.stringify(backup))).merged, 0);
  const before = toJSON();
  backup.rows[0].sessionId = 'tampered';
  await assert.rejects(fromJSON(JSON.stringify(backup)), /Conflicting duplicate/);
  assert.equal(toJSON(), before);
});

for (const change of ['content', 'evidence', 'rubric']) test(`${change} edits retain history and only remove affected current eligibility`, async () => {
  const { C, verifiedEvaluationIds } = await achieved();
  const edited = structuredClone(C);
  const a = edited.activityIndex.activities['task-0'];
  a[`${change}Version`]++;
  masterySignatures(edited);
  const p = await run(edited, verifiedEvaluationIds);
  assert.equal(p.projection.complete, false);
  assert.equal(p.historical.length, 1);
  assert.equal(p.historical[0].projection.complete, true);
  assert.equal(p.projection.provisional.simple.anchors[3].facets.explain.groups, 2);
  assert.equal(logRows().length, 6);
});

test('organization changes preserve unchanged observations', async () => {
  const { C, verifiedEvaluationIds } = await achieved();
  C.mastery.roots.simple.importance = 10;
  C.activityIndex.activities['task-0'].lesson = 's1-1';
  C.activityIndex.activities['task-0'].timing = { active: [5, 10] };
  masterySignatures(C);
  const p = await run(C, verifiedEvaluationIds);
  assert.equal(p.projection.complete, true); assert.deepEqual(p.historical, []);
});

test('drafts are bounded independent keys; tombstones, incompatible versions and restored references stay honest', async () => {
  const C = persistenceCourse(), input = { text: 'Explanation', artifacts: [{ id: 'artifact', url: 'https://example.invalid/private.txt', sha256: 'b'.repeat(64), bytes: 123, mediaType: 'text/plain' }] };
  await recordActivityEvent(cid, C, await submissionFields(C, 0, input), { now: 10, sessionId: 's' });
  await saveActivityDraft(cid, C, 'task-1', input, { now: 30 });
  await saveActivityDraft(cid, C, 'task-2', { text: 'Other response' }, { now: 40 });
  await saveActivityDraft(cid, C, 'task-2', null, { now: 50 });
  const backup = toJSON(); wipe(); await fromJSON(backup);
  let p = await run(C);
  assert.equal(p.drafts.length, 1); assert.equal(p.drafts[0].compatible, true);
  assert.equal(p.artifacts[0].availability, 'unavailable'); assert.equal(p.artifacts[0].bytesRestored, false);
  C.activityIndex.activities['task-1'].contentVersion++; masterySignatures(C);
  p = await run(C); assert.equal(p.drafts[0].compatible, false);
  assert.ok(!mine().some(p => p.k.includes('activity-draft')), 'S07 owns remote draft exposure');
  const before = toJSON();
  await assert.rejects(saveActivityDraft(cid, C, 'task-3', { text: 'x'.repeat(20000) }, { now: 60 }), /16 KiB|bounded/);
  assert.equal(toJSON(), before);
});

test('reset and void suppress submissions and all dependants without resurrection by older backup', async () => {
  const { C, verifiedEvaluationIds } = await achieved();
  const backup = toJSON();
  appendRow({ id: 'void', event: 'attempt-void', attemptId: 'attempt-0', course: cid, ts: 4 * DAY });
  assert.equal((await run(C, verifiedEvaluationIds)).projection.complete, false);
  setItem(`reset:${cid}`, String(5 * DAY));
  assert.equal((await run(C, verifiedEvaluationIds)).projection.provisional.simple.anchor, null);
  const resetBackup = toJSON();
  await fromJSON(backup);
  assert.equal((await run(C, verifiedEvaluationIds)).projection.provisional.simple.anchor, null);
  wipe(); await fromJSON(resetBackup); await fromJSON(backup);
  assert.equal(getItem(`reset:${cid}`), String(5 * DAY));
  assert.equal((await run(C)).artifacts.length, 0);
});

test('late corrections and assistance use immutable original responses across restart', async () => {
  const { C, verifiedEvaluationIds } = await achieved();
  const sub = logRows().find(r => r.event === 'activity-submission');
  await recordActivityEvent(cid, C, { event: 'activity-context-revision', submissionId: sub.id,
    assistance: { sources: ['ai'], answerExposed: false }, timing: sub.timing, reason: 'Late disclosure' }, { now: 4 * DAY, sessionId: 'late' });
  assert.equal((await run(C, verifiedEvaluationIds)).projection.complete, false);
  const backup = toJSON(); wipe(); await fromJSON(backup);
  assert.equal((await run(C, verifiedEvaluationIds)).projection.complete, false);
  assert.equal(logRows().find(r => r.id === sub.id).request.input.text, sub.request.input.text);
});

test('missing/tampered definitions and trust fail atomically; legacy array export stays compatible', async () => {
  const { C } = await achieved(), backup = JSON.parse(toJSON());
  wipe();
  const bad = structuredClone(backup); bad.mastery.definitions[0].value.source.targets.roots[0].label += 'tampered';
  await assert.rejects(fromJSON(JSON.stringify(bad)), /checksum/);
  assert.equal(logRows().length, 0); assert.equal(keys().length, 0);
  bad.mastery = { ...backup.mastery, definitions: [] };
  await assert.rejects(fromJSON(JSON.stringify(bad)), /Missing/);
  bad.mastery = backup.mastery; bad.rows[0].trust = 'verified';
  await assert.rejects(fromJSON(JSON.stringify(bad)), /trusted provenance/);
  assert.equal(logRows().length, 0);
  assert.throws(() => fromJSON(JSON.stringify(backup.rows)), /versioned/);
  const legacy = [{ id: 'old', course: cid, ts: 20, correct: true }];
  assert.equal(fromJSON(JSON.stringify(legacy)).merged, 1);
  assert.ok(Array.isArray(JSON.parse(toJSON())));
  assert.equal(await rebuildActivityState(cid, {}, { now }), null);
  await assert.rejects(run(C, []), /verification/);
});

test('concurrent commits cannot reuse an attempt, and caller mutation cannot change committed input', async () => {
  const C = persistenceCourse(), fields = await submissionFields(C, 0);
  const first = recordActivityEvent(cid, C, fields, { now: 10, sessionId: 'one' });
  const second = recordActivityEvent(cid, C, fields, { now: 11, sessionId: 'two' });
  fields.request.input.text = 'Mutated after calling';
  const results = await Promise.allSettled([first, second]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.match(results[1].reason.message, /attempt\/nonce/);
  assert.equal(logRows().length, 1);
  assert.equal(logRows()[0].request.input.text, 'Independent explanation 0');
});

test('draft conflicts fail before resetting or writing any imported state', async () => {
  const C = persistenceCourse();
  await saveActivityDraft(cid, C, 'task-0', { text: '' }, { now: 10 });
  const backup = JSON.parse(toJSON());
  backup.mastery.drafts[0].value.input.text = 'Conflicting same revision';
  backup.mastery.resets.push({ k: `reset:${cid}`, value: 100 });
  const before = toJSON();
  await assert.rejects(fromJSON(JSON.stringify(backup)), /Conflicting activity draft revision/);
  assert.equal(toJSON(), before);
});

test('draft tombstones beat stale restore, independent activities survive, reset-only exports protect fresh installs', async () => {
  const C = persistenceCourse();
  await saveActivityDraft(cid, C, 'task-0', { text: 'old' }, { now: 10 });
  const old = toJSON();
  await saveActivityDraft(cid, C, 'task-0', null, { now: 20 });
  await fromJSON(old);
  assert.equal((await run(C)).drafts.length, 0);
  wipe(); setItem(`reset:${cid}`, '100');
  const resetOnly = toJSON();
  wipe(); await fromJSON(resetOnly); await fromJSON(old);
  assert.equal((await run(C)).drafts.length, 0);
  assert.equal(getItem(`reset:${cid}`), '100');
});

test('a late correction binds the original rubric after the live definition changes', async () => {
  const { C } = await achieved(), old = structuredClone(C);
  const evaluation = logRows().find(r => r.event === 'activity-evaluation');
  const sub = logRows().find(r => r.id === evaluation.submissionId);
  C.activityIndex.activities['task-0'].rubricVersion++; masterySignatures(C);
  const fields = evaluationFields(old, sub, 4 * DAY, 'fail');
  fields.supersedes = evaluation.id; fields.reason = 'Corrected observation';
  await recordActivityEvent(cid, C, fields, { now: 4 * DAY, sessionId: 'correction' });
  const before = await run(C);
  const backup = toJSON(); wipe(); await fromJSON(backup);
  assert.deepEqual(await run(C), before);
  assert.equal(before.historical[0].projection.provisional.simple.complete, false);
  assert.equal(logRows().find(r => r.id === evaluation.id).result.criteria[0].outcome, 'pass');
});

test('large histories validate in bounded complete batches without losing or multiplying records', async () => {
  const C = persistenceCourse(), snapshot = masterySnapshot(C), definitionId = await snapshotIdentity(snapshot);
  const submission = await submissionFields(C, 0);
  const rows = Array.from({ length: 1002 }, (_, i) => ({ ...structuredClone(submission), schemaVersion: 1,
    id: `large:${i}`, ts: i + 1, course: cid, courseCode: C.code, definitionId, sessionId: `s-${i}`,
    request: { ...submission.request, attemptId: `a-${i}`, nonce: `n-${i}` } }));
  const backup = { schemaVersion: 1, definitions: [{ k: `mastery-definition:${cid}:${definitionId}`, value: snapshot }], drafts: [], resets: [] };
  assert.equal(await restoreActivityBackup(backup, rows.toReversed()), 1002);
  assert.equal(logRows().length, 1002);
  assert.equal((await run(C)).projection.complete, false);
  assert.equal(await restoreActivityBackup(backup, rows), 0);
  const conflicting = structuredClone(rows[1001]); conflicting.request.attemptId = rows[0].request.attemptId;
  conflicting.id = 'conflict';
  await assert.rejects(restoreActivityBackup(backup, [conflicting]), /attempt\/nonce/);
  assert.equal(logRows().length, 1002);
});

test('equal-millisecond local references keep causal order and returned records cannot mutate storage', async () => {
  const C = persistenceCourse();
  const sub = await recordActivityEvent(cid, C, await submissionFields(C, 0), { now: 10, sessionId: 's' });
  await recordActivityEvent(cid, C, evaluationFields(C, sub, 10), { now: 10, sessionId: 's' });
  sub.request.input.text = 'mutated return value';
  assert.equal(logRows()[0].request.input.text, 'Independent explanation 0');
  assert.equal((await run(C)).projection.provisional.simple.anchors[3].facets.explain.groups, 1);
});

test('nonfinite live data cannot be silently normalized to unknown timing', async () => {
  const C = persistenceCourse(), fields = await submissionFields(C, 0);
  fields.timing.activeMs = NaN;
  await assert.rejects(recordActivityEvent(cid, C, fields, { now: 10, sessionId: 's' }), /finite JSON/);
  assert.equal(logRows().length, 0);
});

test('purge drops owned definitions, drafts and events while preserving another course', async () => {
  const { purge } = await import('../../src/lib/purge.js');
  const C = persistenceCourse();
  await saveActivityDraft(cid, C, 'task-0', { text: 'own' }, { now: 10 });
  await saveActivityDraft('other', C, 'task-0', { text: 'other' }, { now: 10 });
  await recordActivityEvent(cid, C, await submissionFields(C, 0), { now: 10, sessionId: 's' });
  await purge(cid, C.code);
  assert.ok(!keys().some(k => k.startsWith('mastery-definition:folder:')));
  assert.equal(logRows().length, 0);
  assert.equal((await rebuildMastery('other', C, { now })).drafts[0].input.text, 'other');
  assert.equal((await run(C)).drafts.length, 0);
});

test('oversized dependency chains fail explicitly rather than truncating claim history', async () => {
  const C = persistenceCourse(f => f.source.targets.roots[0].claimRequirement = 'historical-evidence');
  const snapshot = masterySnapshot(C), definitionId = await snapshotIdentity(snapshot);
  const claims = Array.from({ length: 1001 }, (_, i) => ({ schemaVersion: 1, event: 'activity-claim', id: `claim:${i}`, ts: i + 1,
    course: cid, courseCode: C.code, definitionId, sessionId: 'history', root: 'simple', semanticVersion: 1,
    status: 'unsubstantiated', sources: [], uncertainty: 'Historical claim remains unresolved',
    provenance: { kind: 'self-report', reviewerId: 'learner', issuedAt: i + 1 } }));
  await assert.rejects(restoreActivityBackup({ schemaVersion: 1,
    definitions: [{ k: `mastery-definition:${cid}:${definitionId}`, value: snapshot }], drafts: [], resets: [] }, claims), /chain exceeds/);
  assert.equal(logRows().length, 0);
  assert.equal(keys().length, 0);
});

test('raising the required target preserves lower-anchor evidence and reports the new gap', async () => {
  const C = persistenceCourse(f => {
    const root = f.source.targets.roots[0];
    root.requiredAnchor = 2;
    root.anchors.push({ ...structuredClone(root.anchors[0]), level: 2 });
    root.facets[0].anchors.push({ ...structuredClone(root.facets[0].anchors[0]), level: 2 });
    f.activities.activities.forEach(a => a.tests[0].anchor = 2);
  });
  const { verifiedEvaluationIds } = await achieved(C);
  assert.equal((await run(C, verifiedEvaluationIds)).projection.complete, true);
  C.mastery.roots.simple.requiredAnchor = 3; masterySignatures(C);
  const p = await run(C, verifiedEvaluationIds);
  assert.equal(p.projection.complete, false);
  assert.equal(p.projection.roots.simple.anchor, 2);
  assert.equal(p.projection.roots.simple.anchors[2].complete, true);
  assert.deepEqual(p.historical, []);
});

test('independent draft restore order converges and a fresh edit after reset starts new work', async () => {
  const C = persistenceCourse();
  await saveActivityDraft(cid, C, 'task-2', { text: 'second' }, { now: 10 });
  await saveActivityDraft(cid, C, 'task-1', { text: 'first' }, { now: 20 });
  const baseline = await run(C), backup = JSON.parse(toJSON());
  backup.mastery.drafts.reverse(); wipe(); await fromJSON(JSON.stringify(backup));
  assert.deepEqual(await run(C), baseline);
  setItem(`reset:${cid}`, '100');
  await saveActivityDraft(cid, C, 'task-1', { text: 'new work' }, { now: 200 });
  const p = await run(C);
  assert.equal(p.drafts.length, 1); assert.equal(p.drafts[0].started, 200);
  assert.equal(p.drafts[0].input.text, 'new work');
});
