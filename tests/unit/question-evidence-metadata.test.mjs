import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuestion, questionErrorHypotheses, retentionKeyFor, questionSessionCurrent, practiceRequirements } from '../../src/lib/questions.js';
import { fold, rebuild } from '../../src/lib/replay.js';
import { appendRow } from '../../src/lib/store.js';
import { stateFor } from '../../src/lib/state.js';

test('joint and separate step metadata survive normalization and use distinct retention claims', () => {
  const q = normalizeQuestion({ id: 'j', q: 'Solve', skills: ['a', 'b'], typeId: 'a', support: [], demand: 'standard', evidenceVersion: 'ev', contentVersion: 'v', response: { kind: 'number', value: 2 } });
  assert.deepEqual(q.skills, ['a', 'b']); assert.equal(q.evidenceVersion, 'ev');
  assert.equal(retentionKeyFor(q), 'joint:j');
  const replay = fold([{ id: 'e', event: 'attempt', loop: 'Q', itemId: 'j', skills: ['a', 'b'], typeId: 'a', ts: 1000,
    sessionId: 's', firstUnaided: true, correct: true }], { target: .9 });
  assert.equal(replay.retain['type:a'], undefined);
  assert.equal(replay.retain['joint:j'].reps, 1);
});

test('reviewed literal error matches remain hypotheses, not regex or correctness rules', () => {
  const item = { errors: [{ id: 'sign', match: '-2', description: 'Check the sign.' }, { id: 'pattern', match: '.*', description: 'Literal only.' }] };
  assert.deepEqual(questionErrorHypotheses(item, ' -2 ').map(x => x.id), ['sign']);
  assert.deepEqual(questionErrorHypotheses(item, 'wrong'), []);
});

test('late grading corrections and voids rebuild checkpointed retention from original attempts', () => {
  const cid = 'regraded-joint-test', C = { code: 'REGRADE', state: {} };
  appendRow({ id: 'attempt-r', attemptId: 'ar', course: cid, event: 'attempt', loop: 'Q', itemId: 'q', typeId: 'a', sessionId: 's',
    firstUnaided: true, correct: true, ts: 1000 });
  assert.equal(rebuild(cid, C).retain['type:a'].ok, true);
  appendRow({ id: 'revision-r', attemptId: 'ar', course: cid, event: 'grade-revision', correct: false, grader: 'human', ts: 2000 });
  assert.equal(rebuild(cid, C).retain['type:a'].ok, false);
  appendRow({ id: 'void-r', attemptId: 'ar', course: cid, event: 'attempt-void', ts: 3000 });
  assert.equal(rebuild(cid, C).retain['type:a'], undefined);
  assert.equal(stateFor(cid, C).get('q'), undefined, 'voided raw attempt cannot return through the derived cache');
});

test('saved sessions reject quarantined and reinterpreted tasks; overlapping goals preserve all variations', () => {
  const q = { id: 'q', typeId: 'a', contentVersion: 'c', evidenceVersion: 'e' };
  assert.equal(questionSessionCurrent(q, { q }), true);
  assert.equal(questionSessionCurrent(q, { q: { ...q, quarantined: true } }), false);
  assert.equal(questionSessionCurrent(q, { q: { ...q, evidenceVersion: 'new' } }), false);
  const merged = practiceRequirements([{ requirements: { representations: { a: ['graph'] }, integrations: [['a', 'b']] } },
    { requirements: { representations: { a: ['equation'] }, integrations: [['b', 'a']] } }]);
  assert.deepEqual(merged.requirements.representations.a, ['graph', 'equation']);
  assert.equal(merged.requirements.integrations.length, 1);
});
