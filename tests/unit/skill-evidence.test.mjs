import test from 'node:test';
import assert from 'node:assert/strict';
import { skillState, observations, performanceEvents } from '../../src/lib/evidence.js';
import { selectScored } from '../../src/lib/practice-score.js';
import { readiness, checkCandidates } from '../../src/lib/assessment.js';
const row = (id, extra = {}) => ({ id, event: 'attempt', itemId: id, typeId: 'a', skills: ['a'], group: id,
  ts: Number(id.replace(/\D/g, '')) || 1, firstUnaided: true, methodCued: false, ...extra });
const item = (id, typeId = 'a', extra = {}) => ({ id, typeId, skills: [typeId], group: id, ...extra });

test('perfect fractional outcome budgets meet a 100% target without accepting a real miss', () => {
  const blueprint = { version: 'perfect', target: 1, types: [], typeWeights: {}, outcomes: {} };
  const rows = [];
  for (const [index, count] of [5, 7, 10, 5, 3].entries()) {
    const types = Array.from({ length: count }, (_, i) => `skill-${index}-${i}`);
    blueprint.types.push(...types);
    blueprint.outcomes[`outcome-${index}`] = { types, weight: .2, essential: true, floor: 1 };
    for (const id of types) {
      blueprint.typeWeights[id] = .2 / count;
      for (const ts of [1, 2]) rows.push(row(`${id}-${ts}`, { ts, typeId: id, skills: [id], context: 'check' }));
    }
  }
  const options = { confirmedVersion: 'perfect', now: 10 };
  const result = readiness(blueprint, rows, options);
  assert.equal(result.ready, true);
  assert.equal(result.score, 1);
  for (const outcome of Object.values(result.outcomes)) assert.equal(outcome.score, 1);
  const missed = rows.map((r, i) => i === 0 ? { ...r, firstUnaided: false } : r);
  assert.equal(readiness(blueprint, missed, options).ready, false);
});

test('same template across sessions and unknown groups never manufacture independence', () => {
  const same = [row('q1', { group: 'same', sessionId: 'one' }), row('q2', { group: 'same', sessionId: 'two' })];
  assert.equal(observations(same, 'a').length, 1);
  assert.equal(skillState('a', same, { now: 10 }).ready, false);
  assert.equal(skillState('a', same.map(r => ({ ...r, group: undefined })), { now: 10 }).ready, false);
});
test('foundation, assistance and self ratings remain learning evidence without independent standard claims', () => {
  for (const extra of [{ demand: 'foundation' }, { support: ['supplied-method'] }, { assisted: true }, { selfChecked: true }]) {
    const state = skillState('a', [row('q1', extra), row('q2', extra)], { now: 10 });
    assert.equal(state.ready, false); assert.equal(state.practice.length, 2);
  }
  assert.equal(skillState('a', [row('q1'), row('q2')], { now: 10 }).ready, true);
});
test('joint and alternative route outcomes cannot multiply atomic evidence', () => {
  for (const extra of [{ skills: ['a', 'b'] }, { routes: [['a'], ['b']] }]) {
    const state = skillState('a', [row('q1', extra), row('q2', extra)], { now: 10 });
    assert.equal(state.ready, false); assert.equal(state.observations.length, 0); assert.equal(state.joint.length, 2);
  }
});
test('delayed repeats inform recovery and retention without fresh transfer evidence', () => {
  const rows = [row('q1', { firstUnaided: false }), row('r2', { itemId: 'q1', ts: 20*864e5 })];
  assert.equal(performanceEvents(rows, 'a').length, 2); assert.equal(observations(rows, 'a').length, 1);
  assert.equal(skillState('a', rows, { now: 21*864e5 }).ready, false);
});
test('freshness does not rewrite historical achievement; extension failure does not contradict standard', () => {
  const rows = [row('q1'), row('q2'), row('q3', { demand: 'extension', firstUnaided: false })];
  const state = skillState('a', rows, { now: 40*864e5 });
  assert.equal(state.supported, true); assert.equal(state.ready, false); assert.equal(state.achieved, true);
  assert.equal(state.contradictions.length, 0);
});
test('required representations and integrations remain visible despite atomic success', () => {
  const rows = [row('q1', { representation: 'equation' }), row('q2', { representation: 'equation' })];
  const standard = { requirements: { representations: { a: ['graph'] }, integrations: [['a', 'b']] } };
  const state = skillState('a', rows, { standard, now: 10 });
  assert.equal(state.ready, false); assert.deepEqual(state.coverage.missingRepresentations, ['graph']);
  assert.deepEqual(state.coverage.missingIntegrations, [['a', 'b']]);
});
test('metadata-only changes retain evidence; substantive evidence revisions and quarantine invalidate claims', () => {
  const rows = [row('q1', { contentVersion: 'c', evidenceVersion: 'e' }), row('q2', { contentVersion: 'c', evidenceVersion: 'e' })];
  const bank = { q1: item('q1', 'a', { contentVersion: 'c', evidenceVersion: 'e', organizationVersion: 'new' }),
    q2: item('q2', 'a', { contentVersion: 'c', evidenceVersion: 'e' }) };
  assert.equal(skillState('a', rows, { bank, now: 10 }).ready, true);
  bank.q1.evidenceVersion = 'different'; assert.equal(skillState('a', rows, { bank, now: 10 }).ready, false);
  bank.q2.quarantined = true; assert.equal(skillState('a', rows, { bank, now: 10 }).n, 0);
});
test('coverage persists across session resets, skips remain gaps and repair loops are bounded', () => {
  const pool = ['a', 'b', 'c'].map(id => item(id, id));
  const rows = [row('a1'), row('a2'), row('b3', { typeId: 'b', skills: ['b'], skipped: true })];
  assert.equal(selectScored(pool, rows, { now: 10 }).item.typeId, 'c');
  const failed = [1, 2, 3].map(i => row(`q${i}`, { firstUnaided: false }));
  assert.notEqual(selectScored(pool, failed, { now: 10 }).item.typeId, 'a');
  assert.equal(selectScored([item('next')], failed, { now: 10 }).help?.skillId, 'a');
});
test('readiness cannot be authorized by a sufficiency click or hide an essential gap in weights', () => {
  const b = { version: 'v', types: ['a', 'b'], typeWeights: { a: .99, b: .01 }, target: .9,
    outcomes: { essential: { types: ['b'], weight: .01, essential: true, floor: .8 } } };
  const rows = [row('q1'), row('q2')];
  const state = readiness(b, rows, { confirmedVersion: 'v', sufficientEvidence: 'anything', now: 10 });
  assert.equal(state.ready, false); assert.ok(state.gaps.includes('b'));
});
test('grade revisions and voiding change one event rather than adding another observation', () => {
  const rows = [row('q1', { attemptId: 'attempt', firstUnaided: false }),
    { id: 'revision', ts: 2, event: 'grade-revision', attemptId: 'attempt', correct: true, grader: 'human' }];
  assert.equal(skillState('a', rows, { now: 10 }).n, 1);
  assert.equal(observations(rows, 'a')[0].firstUnaided, true);
  rows.push({ id: 'void', ts: 3, event: 'attempt-void', attemptId: 'attempt' });
  assert.equal(skillState('a', rows, { now: 10 }).n, 0);
});
test('independently checked steps can contribute while supplied upstream answers cannot', () => {
  const rows = [row('q1', { parentId: 'task1', stepId: 'model' }), row('q2', { parentId: 'task2', stepId: 'model' })];
  assert.equal(skillState('a', rows, { now: 10 }).ready, true);
  assert.equal(skillState('a', rows.map(r => ({ ...r, dependent: true })), { now: 10 }).ready, false);
});
test('learner challenge preference applies within the protected coverage skill', () => {
  const pool = [item('easy', 'a', { demand: 'foundation' }), item('hard', 'a', { demand: 'extension' }), item('standard', 'a')];
  assert.equal(selectScored(pool, [], { demandPreference: 'extension', now: 10 }).item.id, 'hard');
  assert.equal(selectScored(pool, [], { demandPreference: 'foundation', now: 10 }).item.id, 'easy');
});
test('step evidence follows parent revisions and quarantines', () => {
  const rows = [row('step1', { parentId: 'task1', stepId: 'model', contentVersion: 'c:step:model', evidenceVersion: 'e' }),
    row('step2', { parentId: 'task2', stepId: 'model', contentVersion: 'c:step:model', evidenceVersion: 'e' })];
  const bank = { task1: { contentVersion: 'c', evidenceVersion: 'e' }, task2: { contentVersion: 'c', evidenceVersion: 'e' } };
  assert.equal(skillState('a', rows, { bank, now: 10 }).ready, true);
  bank.task1.contentVersion = 'changed';
  assert.equal(skillState('a', rows, { bank, now: 10 }).ready, false);
  bank.task2.quarantined = true;
  assert.equal(skillState('a', rows, { bank, now: 10 }).n, 0);
});
test('legacy compatibility requires the explicit original hash and never crosses new authored semantics', () => {
  const rows = [row('q1', { contentVersion: 'old1' }), row('q2', { contentVersion: 'old2' })];
  const bank = { q1: { schemaVersion: 1, contentVersion: 'new1', legacyContentVersion: 'old1' },
    q2: { schemaVersion: 1, contentVersion: 'new2', legacyContentVersion: 'old2' } };
  assert.equal(skillState('a', rows, { bank, now: 10 }).ready, true);
  bank.q1.schemaVersion = 2;
  assert.equal(skillState('a', rows, { bank, now: 10 }).ready, false);
});
test('required integration outranks endless fresh atomic tasks once components are supported', () => {
  const rows = [row('a1'), row('a2'), row('b3', { typeId: 'b', skills: ['b'] }), row('b4', { typeId: 'b', skills: ['b'] })];
  const pool = [item('joint', 'a', { skills: ['a', 'b'] }), ...Array.from({ length: 20 }, (_, i) => item(`fresh${i}`, i%2 ? 'a' : 'b'))];
  const standard = { requirements: { integrations: [['a', 'b']] } };
  const decision = selectScored(pool, rows, { standard, now: 10 });
  assert.equal(decision.item.id, 'joint'); assert.equal(decision.action, 'integrate');
  assert.equal(decision.recommendedStop, false);
  const gap = selectScored(pool.filter(q => q.id !== 'joint'), rows, { standard, now: 10 });
  assert.deepEqual(gap.contentGaps, ['integration:a+b']); assert.equal(gap.recommendedStop, false);
});
test('missing representations are actively sampled and alternative routes cannot satisfy joint inventory', () => {
  const rows = [row('a1'), row('a2')];
  const pool = [item('fresh'), item('graph', 'a', { representation: 'graph' })];
  const standard = { requirements: { representations: { a: ['graph'] } } };
  assert.equal(selectScored(pool, rows, { standard, now: 10 }).item.id, 'graph');
  const routes = [item('routes', 'a', { skills: ['a', 'b'], routes: [['a'], ['b']] })];
  assert.deepEqual(selectScored(routes, rows, { standard: { requirements: { integrations: [['a', 'b']] } }, now: 10 }).contentGaps, ['integration:a+b']);
});
test('deleted canonical tasks do not contribute unverifiable evidence', () => {
  const rows = [row('a1', { schemaVersion: 2 }), row('a2', { schemaVersion: 2 })];
  assert.equal(skillState('a', rows, { bank: {}, now: 10 }).ready, false);
  assert.equal(skillState('a', rows, { bank: {}, now: 10 }).n, 0);
});
test('freshness requires fresh independent coverage, representations and integrations', () => {
  const now = 60*864e5;
  const rows = [row('old1', { ts: 864e5, representation: 'graph' }), row('new2', { ts: now-100, representation: 'equation' })];
  const standard = { requirements: { representations: { a: ['graph', 'equation'] }, integrations: [['a', 'b']] } };
  rows.push(row('joint3', { ts: 2*864e5, skills: ['a', 'b'] }));
  const state = skillState('a', rows, { now, standard });
  assert.equal(state.supported, true); assert.equal(state.ready, false); assert.equal(state.stale, true);
  assert.equal(state.coverage.freshIndependent, 1);
  assert.deepEqual(state.coverage.missingFreshRepresentations, ['graph']);
  assert.deepEqual(state.coverage.missingFreshIntegrations, [['a', 'b']]);
  rows.push(row('new4', { ts: now-50, representation: 'graph' }));
  assert.equal(skillState('a', rows, { now, standard }).ready, false);
  rows.push(row('joint5', { ts: now-20, skills: ['a', 'b'] }));
  assert.equal(skillState('a', rows, { now, standard }).ready, true);
});
test('a combined failure after atomic support targets coordination rather than reteaching components', () => {
  const rows = [row('a1'), row('a2'), row('b3', { typeId: 'b', skills: ['b'] }), row('b4', { typeId: 'b', skills: ['b'] }),
    row('joint5', { skills: ['a', 'b'], firstUnaided: false })];
  const pool = [item('newjoint', 'a', { skills: ['a', 'b'] }), item('newatomic')];
  const choice = selectScored(pool, rows, { standard: { requirements: { integrations: [['a', 'b']] } }, now: 10 });
  assert.equal(choice.action, 'integrate'); assert.equal(choice.item.id, 'newjoint');
});
test('checks select required representations and integrations without replacing atomic independence', () => {
  const rows = [row('a1'), row('a2'), row('b3', { typeId: 'b', skills: ['b'] }), row('b4', { typeId: 'b', skills: ['b'] })];
  const blueprint = { types: ['a', 'b'], requirements: { representations: { a: ['graph'] }, integrations: [['a', 'b']] } };
  const CHECK = [item('aa-atomic'), item('ab-graph', 'a', { representation: 'graph' }), item('joint', 'a', { skills: ['a', 'b'] })];
  const decision = checkCandidates({ CHECK }, blueprint, rows, 10);
  assert.deepEqual(decision.items.map(q => q.id), ['ab-graph', 'joint']); assert.deepEqual(decision.missing, []);
  const cold = checkCandidates({ CHECK: [CHECK[2]] }, { types: ['a', 'b'], requirements: { integrations: [['a', 'b']] } }, [], 10);
  assert.deepEqual(cold.items.map(q => q.id), ['joint']); assert.deepEqual(cold.missing, ['a', 'b']);
  const ambiguous = checkCandidates({ CHECK: [{ ...CHECK[2], routes: [['a'], ['b']] }] }, { types: ['a', 'b'], requirements: { integrations: [['a', 'b']] } }, rows, 10);
  assert.ok(ambiguous.inventoryGaps.includes('integration:a+b')); assert.equal(ambiguous.items.length, 0);
});
test('check inventory refreshes old required variations even after recent other successes', () => {
  const now = 60*864e5;
  const rows = [row('old1', { ts: 864e5, representation: 'graph' }), row('new2', { ts: now-100, representation: 'equation' }),
    row('oldjoint3', { ts: 2*864e5, skills: ['a', 'b'] }), row('b4', { typeId: 'b', skills: ['b'], ts: now-50 }),
    row('b5', { typeId: 'b', skills: ['b'], ts: now-40 })];
  const blueprint = { types: ['a', 'b'], requirements: { representations: { a: ['graph'] }, integrations: [['a', 'b']] } };
  const CHECK = [item('arbitrary'), item('graph', 'a', { representation: 'graph' }), item('joint', 'a', { skills: ['a', 'b'] })];
  assert.deepEqual(checkCandidates({ CHECK }, blueprint, rows, now).items.map(q => q.id), ['graph', 'joint']);
});
test('formal assessment tolerates adequately measured nonessential deficits within authored target', () => {
  const blueprint = { version: 'v', types: ['a', 'b'], typeWeights: { a: .9, b: .1 }, target: .9,
    outcomes: { major: { types: ['a'], weight: .9, essential: true, floor: .8 }, minor: { types: ['b'], weight: .1, essential: false, floor: .8 } } };
  const rows = [row('a1'), row('a2'), row('b3', { typeId: 'b', skills: ['b'], firstUnaided: false }),
    row('b4', { typeId: 'b', skills: ['b'], firstUnaided: false })];
  const opts = { confirmedVersion: 'v', now: 10 };
  const assessment = readiness(blueprint, rows, opts);
  assert.equal(assessment.ready, true); assert.equal(assessment.score, .9);
  assert.deepEqual(assessment.contradictions, ['b']); assert.equal(assessment.states.b.supported, false);
  assert.equal(assessment.adequacy.b.adequate, true);
  assert.equal(readiness(blueprint, rows.slice(0, 2), opts).ready, false);
  const essential = { ...blueprint, outcomes: { ...blueprint.outcomes, minor: { ...blueprint.outcomes.minor, essential: true } } };
  assert.equal(readiness(essential, rows, opts).ready, false);
  assert.equal(readiness({ ...blueprint, target: .95 }, rows, opts).ready, false);
});
