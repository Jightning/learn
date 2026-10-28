import test from 'node:test';
import assert from 'node:assert/strict';
import { correctAnswer } from '../../src/lib/correct-answer.js';
import { effectiveEvents, reliableGrade } from '../../src/lib/evidence.js';
import { reconcileSession } from '../../src/lib/practice-session.js';
import { stateFor } from '../../src/lib/state.js';
import { rebuild } from '../../src/lib/replay.js';
import { append, forCourse } from '../../src/lib/log.js';

const item = { id: 'q', response: { kind: 'number' } };
const attempt = { attemptId: 'a', signature: 'sig', value: '3', started: Date.now(),
  feedback: { recorded: true, correct: false, score: 0, maxScore: 2 } };

test('learner correction revises progress and scores without rewriting the original grade', async () => {
  const cid = 'correct-progress', C = { code: cid, state: {} };
  append({ id: 'correct:original', course: cid, event: 'attempt', attemptId: 'a', itemId: 'q',
    loop: 'Q', correct: false, firstUnaided: false, gradeSource: 'deterministic-checker', score: 0, maxScore: 2,
    criteria: [{ id: 'reason', correct: false, score: 0, maxScore: 2 }] });
  rebuild(cid, C);
  const state = stateFor(cid, C), ctx = { cid, C, state };
  const feedback = await correctAnswer(ctx, item, attempt);
  assert.equal(feedback.correct, true);
  assert.equal(feedback.gradeSource, 'self');
  assert.equal(state.get('q').got, 1);
  assert.equal(state.getAttempt('q', 'sig').value, '3');
  const rows = forCourse(cid, C), result = effectiveEvents(rows).find(r => r.event === 'attempt');
  assert.equal(rows.find(r => r.event === 'attempt').correct, false);
  assert.equal(result.correct, true);
  assert.equal(result.firstUnaided, true);
  assert.equal(result.score, 2);
  assert.equal(result.criteria[0].correct, true);
  assert.equal(reliableGrade(result), false, 'manual credit retains self-reported provenance');
  await correctAnswer(ctx, item, attempt);
  assert.equal(forCourse(cid, C).filter(r => r.event === 'grade-revision').length, 1);
  // Immutable correction wins over a stale answer restored from another device.
  await state.saveAttempt('q', attempt);
  assert.equal(state.getAttempt('q', 'sig').feedback.correct, true);
  rebuild(cid, C);
  assert.equal(stateFor(cid, C).get('q').got, 1);
  const run = { sessionId: 's', at: 0, items: [item, { id: 'retry' }, { id: 'unrelated' }],
    results: [{ id: 'q', attemptId: 'a', correct: false }], retries: ['skill'], retryIds: ['retry'],
    retrySources: { retry: { itemId: 'q', key: 'skill' } } };
  const revised = reconcileSession(run, rows);
  assert.equal(revised.results[0].correct, true);
  assert.equal(revised.results[0].score, 2);
  assert.deepEqual(revised.items.map(q => q.id), ['q', 'unrelated']);
  assert.deepEqual(revised.retryIds, []);
});

test('correction requires a persisted submitted answer and cannot resurrect a voided answer', async () => {
  await assert.rejects(correctAnswer({ state: { on: false } }, item, attempt), /submitted answer/);
  const cid = 'correct-preconditions', C = { code: cid, state: {} }, state = stateFor(cid, C);
  const ctx = { cid, C, state };
  await assert.rejects(correctAnswer(ctx, item, { ...attempt, feedback: null }), /submitted answer/);
  await assert.rejects(correctAnswer(ctx, item, { ...attempt, feedback: { skipped: true } }), /submitted answer/);
  await assert.rejects(correctAnswer(ctx, item, attempt), /recorded answer/);
  append({ course: cid, event: 'attempt', attemptId: 'a', itemId: 'q', correct: false });
  append({ course: cid, event: 'attempt-void', attemptId: 'a' });
  await assert.rejects(correctAnswer(ctx, item, attempt), /recorded answer/);
});
