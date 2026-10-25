import test from 'node:test';
import assert from 'node:assert/strict';
import { ignoreAnswer } from '../../src/lib/ignore-answer.js';
import { effectiveEvents, exposedItems, skillState } from '../../src/lib/evidence.js';
import { ignoreSessionAnswer, reconcileSession } from '../../src/lib/practice-session.js';
import { studyMinutesToday } from '../../src/lib/learn-by.js';
import { selectScored } from '../../src/lib/practice-score.js';
import { checkCandidates } from '../../src/lib/assessment.js';
import { stateFor, forget, keyFor } from '../../src/lib/state.js';
import { rebuild } from '../../src/lib/replay.js';
import { append, forCourse } from '../../src/lib/log.js';
import { keys, removeItem, clearLog, mergeRows } from '../../src/lib/store.js';
import { migrateLearnerPrefs, learnerKey } from '../../src/lib/learner-prefs.js';
import { mine, apply } from '../../src/lib/prefs.js';

const item = { id: 'q', typeId: 'skill', skills: ['skill'], group: 'q', response: { kind: 'number' } };
const event = (cid, id = 'a', extra = {}) => append({ id: `${cid}:${id}`, course: cid,
  attemptId: id, sessionId: 'session', event: 'attempt', loop: 'Q', itemId: item.id,
  typeId: item.typeId, skills: item.skills, group: 'q', firstUnaided: true, correct: true,
  activeMs: 60000, ...extra });
const answer = id => ({ attemptId: id, sessionId: 'session', signature: 'sig', started: Date.now(),
  value: '3', feedback: { recorded: true, correct: true } });

test('ignore retracts progress and retention without deleting the response or the question', async () => {
  const cid = 'ignore-progress', C = { code: cid, state: {} };
  event(cid);
  event(cid, 'a:exposure', { event: 'exposure', attemptId: 'a' });
  rebuild(cid, C);
  const state = stateFor(cid, C), attempt = answer('a');
  await state.saveAttempt('q', attempt);
  migrateLearnerPrefs(); // A legacy rating preference must not resurrect the answer.
  assert.equal(state.stats(['q']).got, 1);
  await ignoreAnswer({ cid, C, state }, item, attempt);
  assert.equal(state.stats(['q']).seen, 0, 'the currently mounted state refreshes too');
  assert.equal(stateFor(cid, C).get('q'), undefined);
  assert.equal(state.getAttempt('q', 'sig').value, '3');
  assert.equal(state.getAttempt('q', 'sig').feedback.ignored, true);
  assert.equal(rebuild(cid, C).retain['type:skill'], undefined);
  assert.equal(exposedItems(forCourse(cid, C)).has('q'), false);
  assert.equal(skillState('skill', forCourse(cid, C)).n, 0);
  const before = forCourse(cid, C).length;
  await ignoreAnswer({ cid, C, state }, item, attempt);
  assert.equal(forCourse(cid, C).length, before, 'repeated clicks append only one void');
  const pool = [item, { ...item, id: 'other', group: 'other' }];
  assert.deepEqual(selectScored(pool, forCourse(cid, C)), selectScored(pool, []));
  assert.deepEqual(checkCandidates({ CHECK: [item] }, { types: ['skill'] }, forCourse(cid, C)).items, [item]);
});

test('ignoring the latest attempt preserves earlier work and a future answer can count again', async () => {
  const cid = 'ignore-latest', C = { code: cid, state: {} };
  event(cid, 'old', { ts: 1000, correct: false, firstUnaided: false });
  event(cid, 'latest', { ts: 2000 });
  rebuild(cid, C);
  const state = stateFor(cid, C);
  await ignoreAnswer({ cid, C, state }, item, answer('latest'));
  assert.equal(state.get('q').got, 0);
  assert.equal(state.get('q').last, 1000);
  event(cid, 'future');
  rebuild(cid, C);
  assert.equal(stateFor(cid, C).get('q').got, 1);
});

test('session projection removes only unattempted retries caused by the ignored answer', () => {
  const run = { at: 0, items: [item, { id: 'retry' }, { id: 'unrelated' }],
    results: [{ id: 'q', attemptId: 'a', correct: false, firstUnaided: false }],
    retries: ['skill', 'other'], retryIds: ['retry'],
    retrySources: { retry: { itemId: 'q', key: 'skill' } } };
  const next = ignoreSessionAnswer(run, 'q');
  assert.deepEqual(next.items.map(q => q.id), ['q', 'unrelated']);
  assert.deepEqual(next.retries, ['other']);
  assert.deepEqual(next.retryIds, []);
  assert.equal(next.results[0].ignored, true);
  assert.equal(next.results[0].correct, null);
  assert.equal(run.results[0].correct, false, 'the projection does not mutate the saved session');
  const rows = [{ event: 'attempt-void', attemptId: 'a' }];
  assert.deepEqual(reconcileSession(run, rows), next);
  const reviewed = ignoreSessionAnswer({ ...run, at: 1 }, 'q');
  assert.equal(reviewed.items.length, 3, 'a retry already reached remains visible');
});

test('voids survive backup restoration and a stale editable answer or session cannot restore their effects', async () => {
  const cid = 'ignore-sync', C = { code: cid, state: {} }, attempt = answer('synced');
  event(cid, 'synced'); rebuild(cid, C);
  const state = stateFor(cid, C);
  await state.saveAttempt('q', attempt);
  await state.saveSession({ sessionId: 'session', at: 0, items: [item],
    results: [{ id: 'q', attemptId: 'synced', correct: true, firstUnaided: true }] });
  await ignoreAnswer({ cid, C, state }, item, attempt);
  const prefs = mine(), rows = forCourse(cid, C);
  for (const k of keys()) removeItem(k);
  clearLog(); forget();
  mergeRows(rows); apply(prefs);
  // Model a stale current-answer edit arriving after the void. Immutable history wins.
  apply([{ k: learnerKey(keyFor(cid, C.code), 'answer', 'q'), ts: Date.now() + 1000,
    v: JSON.stringify(attempt) }]);
  rebuild(cid, C);
  const restored = stateFor(cid, C);
  assert.equal(restored.getAttempt('q', 'sig').value, '3');
  assert.equal(restored.getAttempt('q', 'sig').feedback.ignored, true);
  assert.equal(restored.get('q'), undefined);
  assert.equal(restored.getSession().results[0].ignored, true);
});

test('voided exposure, partial submissions and legacy outcomes do not affect decisions or study budgets', () => {
  const now = Date.now();
  const rows = ['exposure', 'submission', 'attempt'].map((event, i) => ({ id: `r${i}`, ts: now - 100,
    event, itemId: 'q', attemptId: 'a', loop: 'Q', firstUnaided: true, activeMs: 60000 }));
  rows.push({ id: 'void', ts: now, event: 'attempt-void', attemptId: 'a' });
  assert.deepEqual(effectiveEvents(rows).map(r => r.id), ['void']);
  assert.equal(studyMinutesToday(rows, now), 0);
  rows.push({ id: 'other-exposure', ts: now, event: 'exposure', itemId: 'q', attemptId: 'other' });
  assert.equal(exposedItems(rows).has('q'), true, 'unrelated exposure still applies');
});

test('ignore fails before writing when there is no persistent attempt', async () => {
  await assert.rejects(ignoreAnswer({ cid: 'off', C: {}, state: { on: false } }, item, answer('a')), /saved answer/);
  await assert.rejects(ignoreAnswer({ cid: 'empty', C: {}, state: { on: true } }, item,
    { attemptId: 'empty' }), /saved answer/);
});

test('review sessions isolate identical question IDs from different courses', () => {
  const run = { at: 0, items: [
    { cid: 'a', item }, { cid: 'a', item: { id: 'retry' } }, { cid: 'b', item: { id: 'retry' } }
  ], results: [{ id: 'a:q', correct: false }, { id: 'b:q', correct: false }],
  retries: ['a-skill', 'b-skill'], retrySources: {
    'a:retry': { itemId: 'a:q', key: 'a-skill' }, 'b:retry': { itemId: 'b:q', key: 'b-skill' }
  } };
  const next = ignoreSessionAnswer(run, 'a:q');
  assert.deepEqual(next.items.map(q => q.cid), ['a', 'b']);
  assert.equal(next.results.find(r => r.id === 'a:q').ignored, true);
  assert.equal(next.results.find(r => r.id === 'b:q').correct, false);
  assert.deepEqual(next.retries, ['b-skill']);
});
