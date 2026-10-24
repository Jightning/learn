import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveEvents, skillState, retentionEligible, reliableGrade } from '../../src/lib/evidence.js';
import { selectScored } from '../../src/lib/practice-score.js';
import { selectMixed, retryVariant } from '../../src/lib/practice-pool.js';
import { checkCandidates } from '../../src/lib/assessment.js';
import { duePracticeTypes } from '../../src/lib/practice-policy.js';

const DAY = 864e5;
const item = (id, skill = 'a', extra = {}) => ({ id, typeId: skill, skills: [skill], group: id,
  demand: 'standard', response: { kind: 'number' }, ...extra });
const row = (id, ts, extra = {}) => ({ ...item(id), id: `event-${id}`, itemId: id, attemptId: id,
  event: 'attempt', ts, firstUnaided: true, correct: true, methodCued: false, ...extra });

test('corrected and voided joint failures cannot survive in selection or coverage counters', () => {
  const pool = [item('next-a'), item('next-b', 'b')];
  const samples = [row('a', 1), row('b', 2, { typeId: 'b', skills: ['b'] })];
  const joint = row('joint', 3, { skills: ['a', 'b'], firstUnaided: false });
  const revision = { id: 'revision', ts: 4, event: 'grade-revision', attemptId: 'joint', correct: true, grader: 'human' };
  assert.notEqual(selectScored(pool, [...samples, joint, revision], { now: 10 }).action, 'diagnose');
  const voided = { ...revision, id: 'void', event: 'attempt-void' };
  assert.deepEqual(selectScored(pool, [...samples, joint, voided], { now: 10 }), selectScored(pool, samples, { now: 10 }));
});

test('invalid content and quarantined attempts are absent from the common projection', () => {
  const rows = [row('edited', 1, { contentVersion: 'old' }), row('quarantined', 2, { contentVersion: 'v' }), row('legacy', 3)];
  const bank = { edited: item('edited', 'a', { contentVersion: 'new' }), quarantined: item('quarantined', 'a', { contentVersion: 'v', quarantined: true }) };
  assert.deepEqual(effectiveEvents(rows, { bank }).map(r => r.itemId), ['legacy']);
  assert.deepEqual(effectiveEvents(rows, { versions: { edited: 'new' } }).map(r => r.itemId), ['quarantined', 'legacy']);
});

test('delayed reliable rechecks restore current support without new independent groups', () => {
  const original = [row('a', 1), row('b', 2)];
  const miss = row('miss', DAY, { firstUnaided: false });
  const repeated = [row('a-repeat', 2*DAY+1, { itemId: 'a', group: 'a' }), row('b-repeat', 3*DAY, { itemId: 'b', group: 'b' })];
  const state = skillState('a', [...original, miss, ...repeated], { now: 4*DAY });
  assert.equal(state.ready, true); assert.equal(state.coverage.independent, 2);
  assert.equal(state.coverage.recovery, 2); assert.equal(state.observations.length, 3);
  const immediate = repeated.map((r, i) => ({ ...r, ts: DAY+10+i }));
  // The same-day results are still delayed from their prior group attempts, so
  // explicitly place the original trials immediately before the miss.
  const sameDay = original.map((r, i) => ({ ...r, ts: DAY-10+i }));
  assert.equal(skillState('a', [...sameDay, miss, ...immediate], { now: DAY+20 }).ready, false);
  const oneGroup = [...original.map(r => ({ ...r, group: 'one' })), miss,
    ...repeated.map(r => ({ ...r, group: 'one' }))];
  assert.equal(skillState('a', oneGroup, { now: 4*DAY }).ready, false);
});

test('self and provisional grades cannot contradict checked competence or advance verified retention', () => {
  const checked = [row('a', 1), row('b', 2)];
  for (const gradeSource of ['self', 'model-provisional']) {
    const miss = row('unverified', 3, { gradeSource, firstUnaided: false });
    assert.equal(skillState('a', [...checked, miss], { now: 10 }).supported, true);
    assert.equal(retentionEligible(miss), false); assert.equal(reliableGrade(miss), false);
  }
  assert.equal(retentionEligible(row('verified', 1, { gradeSource: 'deterministic-checker' })), true);
  assert.equal(retentionEligible(row('cued', 1, { methodCued: true })), false);
  assert.equal(retentionEligible(row('unknown', 1, { firstUnaided: null, timedOut: true })), false);
  assert.equal(retentionEligible(row('invalid-clock', 1, { timingValid: false })), false);
});

test('a focused cause probe can precede unknown coverage only once per source', () => {
  const pool = [item('next-a'), item('next-b', 'b')];
  const source = row('miss', 1, { firstUnaided: false, errorHypotheses: ['polarity'] });
  const diagnostics = [item('probe', 'a', { use: 'diagnostic', diagnosticsFor: ['a'], probes: ['polarity'] })];
  const options = { diagnostics, now: 10 };
  const selected = selectScored(pool, [source], options);
  assert.equal(selected.item.id, 'probe'); assert.equal(selected.action, 'diagnose');
  assert.equal(selected.sourceAttemptId, 'miss'); assert.equal(selected.targetSkill, 'a');
  assert.equal(selectScored(pool, [source], { ...options, diagnostics: diagnostics.map(q => ({ ...q, diagnosticsFor: [] })) }).item.id, 'probe');
  const decided = { id: 'decision', ts: 2, event: 'policy-decision', sourceAttemptId: 'miss' };
  assert.equal(selectScored(pool, [source, decided], options).item.id, 'next-b');
});

test('permuting multi-skill lists preserves ranking and retry choice', () => {
  const combined = item('combined', 'a', { skills: ['a', 'b'] });
  const pool = [combined, item('a'), item('b', 'b')];
  const rows = [row('old-a', 1), row('old-b', 2, { typeId: 'b', skills: ['b'], firstUnaided: false })];
  const a = selectScored(pool, rows, { now: 10 });
  const swapped = pool.map(q => q.id === 'combined' ? { ...q, typeId: 'b', skills: ['b', 'a'] } : q);
  const b = selectScored(swapped, rows, { now: 10 });
  assert.deepEqual(a.scores, b.scores); assert.equal(a.item.id, b.item.id);
  const retry = item('retry', 'b', { skills: ['b', 'a'] });
  assert.equal(retryVariant([item('atomic'), retry], combined, new Set()).id, 'retry');
});

test('partial criteria remain descriptive without multiplying joint mastery', () => {
  const partial = row('joint', 1, { skills: ['a', 'b'], firstUnaided: false,
    criteria: [{ id: 'index', skills: ['a'], correct: true, score: 1, maxScore: 1 },
      { id: 'polarity', skills: ['b'], correct: false, score: 0, maxScore: 1 }] });
  const a = skillState('a', [partial], { now: 10 }), b = skillState('b', [partial], { now: 10 });
  assert.equal(a.componentPerformance.fraction, 1); assert.equal(b.componentPerformance.fraction, 0);
  assert.equal(a.ready, false); assert.equal(b.ready, false); assert.equal(a.observations.length, 0);
  const unspecified = { ...partial, criteria: partial.criteria.map(({ skills, ...c }) => c) };
  assert.equal(skillState('a', [unspecified], { now: 10 }).componentPerformance.observations, 0);
});

test('fallback broad slots cover different skills and keep reserved items out', () => {
  const pool = [...Array.from({ length: 8 }, (_, i) => item(`a${i}`)), item('b', 'b'), item('reserved', 'c', { use: 'check' })];
  const result = selectMixed(pool, 'fallback', { get: () => null }, 6, () => .5);
  assert.deepEqual(result.slice(0, 2).map(q => q.typeId), ['a', 'b']);
  assert.equal(result.length, 6); assert.ok(!result.some(q => q.id === 'reserved'));
});

test('fresh check inventory rejects self grades and due joint tasks name every component', () => {
  const checks = [item('self', 'a', { response: { kind: 'self' } }), item('checked')];
  const result = checkCandidates({ CHECK: checks }, { types: ['a'] }, [], 10);
  assert.deepEqual(result.items.map(q => q.id), ['checked']); assert.deepEqual(result.missing, ['a']);
  const pool = [item('joint', 'a', { skills: ['a', 'b'] })];
  assert.deepEqual(duePracticeTypes(pool, 'c', (_, key) => key === 'joint:joint' ? { reps: 1, dueAt: 1 } : null, 10), ['a', 'b']);
});

test('recovered current support does not conceal exhausted fresh independent check inventory', () => {
  const rows = [row('a', DAY), row('b', 2*DAY), row('miss', 40*DAY, { firstUnaided: false }),
    row('a-again', 42*DAY, { itemId: 'a', group: 'a' }), row('b-again', 43*DAY, { itemId: 'b', group: 'b' })];
  assert.equal(skillState('a', rows, { now: 44*DAY }).ready, true);
  const checks = checkCandidates({ CHECK: [item('check1'), item('check2')] }, { types: ['a'] }, rows, 44*DAY);
  assert.equal(checks.items.length, 2); assert.deepEqual(checks.missing, []);
  const exhausted = checkCandidates({ CHECK: [] }, { types: ['a'] }, rows, 44*DAY);
  assert.deepEqual(exhausted.missing, ['a']);
});

test('compiled numerical prerequisite graph preserves the authored prerequisite ranking', () => {
  const pool = [item('next')], types = { a: { requires: ['b'] }, b: {} };
  const graph = { ids: ['a', 'b'], index: { a: 0, b: 1 }, requires: [[1], []] };
  assert.deepEqual(selectScored(pool, [], { types, graph, now: 10 }).scores,
    selectScored(pool, [], { types, now: 10 }).scores);
});


test('self-reported scheduling is explicit and does not promote verification or provisional model grades', () => {
  const self = row('self', 1, { gradeSource: 'self', selfChecked: true });
  assert.equal(retentionEligible(self), false);
  assert.equal(retentionEligible(self, { allowSelf: true }), true);
  assert.equal(reliableGrade(self), false);
  assert.equal(retentionEligible({ ...self, gradeSource: undefined }, { allowSelf: true }), true);
  assert.equal(retentionEligible({ ...self, gradeSource: 'model-provisional' }, { allowSelf: true }), false);
  assert.equal(retentionEligible({ ...self, timingValid: false }, { allowSelf: true }), false);
  assert.equal(retentionEligible({ ...self, support: ['supplied-method'] }, { allowSelf: true }), false);
  assert.equal(retentionEligible(self, { allowSelf: true, priorSession: true }), false);
  assert.equal(skillState('a', [self, { ...self, id: 'self2', itemId: 'self2', group: 'self2', ts: 2 }], { now: 10 }).ready, false);
});

test('an uncertain pacing clock does not discard accurate untimed work', () => {
 const pacing = row('pace', 1, {gradeSource:'deterministic-checker',timingValid:false,timing:{mode:'pacing'}});
 assert.equal(reliableGrade(pacing),true);
 assert.equal(retentionEligible(pacing),true);
 assert.equal(reliableGrade({...pacing,timing:{mode:'strict'}}),false);
 assert.equal(retentionEligible({...pacing,timing:{mode:'strict'}}),false);
});
