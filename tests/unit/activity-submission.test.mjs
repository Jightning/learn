import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { commitSubmission, saveSubmissionDraft, submissionsFor, feedbackReady, importSubmissionResult, revealSubmissionFeedback } from '../../src/lib/activity-submission.js';
import { activityFixture } from '../fixtures/mastery/activities.mjs';
import { persistenceCourse, evaluationFields } from '../fixtures/mastery/history.mjs';
import { rebuildActivityState } from '../../src/lib/mastery-state.js';
import { clearLog, keys, removeItem, logRows } from '../../src/lib/store.js';
import { fromJSON, toJSON } from '../../src/lib/log.js';
import { validateAdapterRequest } from '../../src/lib/activity-adapters.js';

const cid = 'folder';
const wipe = () => { clearLog(); for (const key of keys()) removeItem(key); };
beforeEach(wipe);
const context = { assistance: { sources: ['ai'], answerExposed: false },
  timing: { activeMs: 60000, setupMs: null, wallMs: null, source: 'external-report', interrupted: false },
  environment: { description: 'External Python' } };
const course = () => persistenceCourse(f => {
  Object.assign(f.activities.activities[0], { kind: 'external-lab', adapter: { id: 'external-submission', version: 1 }, lab: activityFixture().activities.activities[1].lab });
  f.activities.activities[1].kind = 'written-defense';
  f.activities.activities[1].adapter.id = 'written-defense';
  delete f.activities.activities[1].lab;
  f.activities.activities[1].after = ['task-0'];
});
const state = C => rebuildActivityState(cid, C, { now: Date.now() });
async function defense(C) {
  const initial = await commitSubmission(cid, C, 'task-1', { text: 'Reason before feedback' }, context);
  const followup = { text: 'Fresh answer', followup: { submissionHash: initial.request.submissionHash,
    prompt: 'What changes if the input is zero?', reviewerId: 'claimed-reviewer' } };
  await commitSubmission(cid, C, 'task-1', followup, context);
  return initial;
}

test('draft context, committed references and unknown byte availability survive another device restore', async () => {
  const C = course(), input = { text: 'Code report', artifacts: [{ id: 'code', url: 'https://example.invalid/code.txt',
    sha256: 'a'.repeat(64), bytes: 100, mediaType: 'text/plain' }] };
  await saveSubmissionDraft(cid, C, 'task-0', input, context);
  let backup = toJSON(); wipe(); await fromJSON(backup);
  assert.deepEqual((await state(C)).drafts[0].context, context);
  const row = await commitSubmission(cid, C, 'task-0', input, context, 'stable-attempt');
  assert.equal(row.trust, 'untrusted');
  assert.equal((await state(C)).drafts.length, 0);
  backup = toJSON(); wipe(); await fromJSON(backup);
  const restored = await state(C);
  assert.equal(restored.artifacts[0].availability, 'unavailable');
  assert.equal(restored.artifacts[0].bytesRestored, false);
  assert.deepEqual(restored.rows[0].request.input, input);
  assert.equal(restored.projection.complete, false);
});

test('duplicates, invalid input, unsafe URLs and oversize fail without adding events', async () => {
  const C = course(), input = { text: 'Original' };
  await commitSubmission(cid, C, 'task-0', input, context, 'one');
  await assert.rejects(commitSubmission(cid, C, 'task-0', input, context, 'two'), /already committed/);
  await assert.rejects(commitSubmission(cid, C, 'task-0', { text: 'Changed' }, context, 'one'), /attempt\/nonce/);
  for (const bad of [{ text: '' }, { text: 'x'.repeat(20000) }, { text: 'Report', artifacts: [{ id: 'x', url: 'javascript:alert(1)', sha256: 'a'.repeat(64), bytes: 2, mediaType: 'text/plain' }] }])
    await assert.rejects(commitSubmission(cid, C, 'task-0', bad, context));
  await assert.rejects(saveSubmissionDraft(cid, C, 'task-0', input, { ...context, timing: { ...context.timing, activeMs: -1 } }), /timing/);
  assert.equal(logRows().length, 1);
});

test('defense and reviewer follow-up are durable before result import or feedback', async () => {
  const C = course();
  const lab = await commitSubmission(cid, C, 'task-0', { text: 'My work' }, context);
  const result = evaluationFields(C, lab, Date.now()).result;
  assert.equal(feedbackReady(C, await state(C), 'task-0'), false);
  await assert.rejects(importSubmissionResult(cid, C, lab.id, result), /before feedback/);
  const initial = await defense(C);
  const backup = toJSON(); wipe(); await fromJSON(backup);
  assert.equal(feedbackReady(C, await state(C), 'task-0'), true);
  const evaluation = await importSubmissionResult(cid, C, lab.id, result);
  assert.equal(evaluation.result.trust, 'untrusted');
  assert.equal((await state(C)).rows.filter(r => r.event === 'activity-feedback').length, 0);
  await revealSubmissionFeedback(cid, C, evaluation.id);
  await revealSubmissionFeedback(cid, C, evaluation.id);
  assert.equal((await state(C)).rows.filter(r => r.event === 'activity-feedback').length, 1);
  assert.equal((await state(C)).rows.find(r => r.id === initial.id).request.input.text, 'Reason before feedback');
  await assert.rejects(importSubmissionResult(cid, C, lab.id, result), /already recorded/);
  assert.equal((await state(C)).projection.complete, false);
});

test('forged review and changed artifact hash cannot bind a result to different work', async () => {
  const C = course();
  const input = { text: 'Work', artifacts: [{ id: 'code', url: 'https://example.invalid/code.txt', sha256: 'a'.repeat(64), bytes: 1, mediaType: 'text/plain' }] };
  const first = await commitSubmission(cid, C, 'task-0', input, context);
  input.artifacts[0].sha256 = 'b'.repeat(64);
  const second = await commitSubmission(cid, C, 'task-0', input, context);
  assert.notEqual(first.request.submissionHash, second.request.submissionHash);
  await defense(C);
  const result = evaluationFields(C, first, Date.now()).result;
  await assert.rejects(importSubmissionResult(cid, C, second.id, result), /mismatch/);
  await assert.rejects(importSubmissionResult(cid, C, first.id, { ...result, trust: 'verified' }), /unknown key trust/);
  await assert.rejects(importSubmissionResult(cid, C, first.id, { ...result, provenance: { ...result.provenance, kind: 'human-reviewed' } }), /provenance/);
  assert.equal((await state(C)).rows.filter(r => r.event === 'activity-evaluation').length, 0);
});

test('follow-ups require saved explanation and a bounded reviewer claim; legacy envelopes still work', async () => {
  const C = course(), followup = { submissionHash: 'a'.repeat(64), prompt: 'Fresh question', reviewerId: 'reviewer' };
  await assert.rejects(commitSubmission(cid, C, 'task-1', { text: 'Answer', followup }, context), /initial explanation/);
  for (const id of ['task-0', 'task-1']) {
    const sub = await commitSubmission(cid, C, id, { text: 'Original' }, context);
    const errors = [];
    const bad = { ...sub.request, input: { text: 'Answer', followup: { ...followup, prompt: '' } } };
    assert.equal(validateAdapterRequest(bad, C.activityIndex.activities[id], errors), null);
    assert.ok(errors.length);
  }
  assert.equal(submissionsFor(await state(C), 'task-1').length, 1);
});

test('new lab work or a revised explanation requires another defense and fresh follow-up', async () => {
  const C = course();
  await commitSubmission(cid, C, 'task-0', { text: 'First work' }, context);
  await defense(C);
  assert.equal(feedbackReady(C, await state(C), 'task-0'), true);
  await commitSubmission(cid, C, 'task-0', { text: 'Revised work' }, context);
  assert.equal(feedbackReady(C, await state(C), 'task-0'), false);
  const initial = await commitSubmission(cid, C, 'task-1', { text: 'Revised reasoning' }, context);
  assert.equal(feedbackReady(C, await state(C), 'task-0'), false);
  const oldInitial = submissionsFor(await state(C), 'task-1').find(r => !r.request.input.followup);
  await assert.rejects(commitSubmission(cid, C, 'task-1', { text: 'Stale follow-up', followup: {
    submissionHash: oldInitial.request.submissionHash, reviewerId: 'claim', prompt: 'Old question' } }, context), /initial explanation/);
  await commitSubmission(cid, C, 'task-1', { text: 'Another answer', followup: {
    submissionHash: initial.request.submissionHash, reviewerId: 'claim', prompt: 'Another fresh question' } }, context);
  assert.equal(feedbackReady(C, await state(C), 'task-0'), true);
});
