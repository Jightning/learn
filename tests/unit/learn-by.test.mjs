import test from 'node:test';
import assert from 'node:assert/strict';
import { deadlinePlan, goalMaterial, saveGoal, deleteGoal, goals } from '../../src/lib/learn-by.js';

const now = Date.parse('2026-10-16T12:00:00Z');
const item = (id, typeId, subId = null) => ({ id, typeId, subId, use: 'practice', group: id, response: { kind: 'number' } });
const idx = {
  SUBS: Object.fromEntries(['s1-1', 's1-2', 's1-3'].map((id, i) => [id, { sec: { id: 's1' }, sub: { title: id }, num: `1.${i + 1}` }])),
  TYPES: {
    base: { id: 'base', scopes: ['s1-1'], requires: [] },
    middle: { id: 'middle', scopes: ['s1-2'], requires: ['base'] },
    later: { id: 'later', scopes: ['s1-3'], requires: ['middle'] }
  },
  QALL: [item('base-one', 'base', 's1-1'), item('middle-one', 'middle', 's1-2'), item('later-one', 'later', 's1-3')],
  PALL: [item('base-two', 'base'), item('middle-two', 'middle'), item('later-two', 'later')],
  BANK: {}, BLUEPRINTS: { course: { typeWeights: { base: 0.2, middle: 0.3, later: 0.5 } } }
};
const goal = (id, from, to, days, intensity = 'focus') => ({ id, cid: 'course', from, to, dueAt: now + days * 864e5, intensity, name: id });
const attempt = (id, typeId, ts, extra = {}) => ({ id: `${id}:${ts}`, event: 'attempt', itemId: id, typeId, ts,
  group: id, sessionId: `${id}:${ts}`, firstUnaided: true, methodCued: false, ...extra });
const plan = (list, rows = []) => deadlinePlan(idx, list, rows, { now, retention: () => null });

test('a selected range includes scoped types, variants, and only useful prerequisites', () => {
  const material = goalMaterial(idx, goal('g', 's1-2', 's1-2', 4));
  assert.deepEqual(material.types, ['middle']);
  assert.deepEqual(material.prerequisites, ['base']);
  assert.deepEqual(material.pool.map(q => q.id).sort(), ['base-one', 'base-two', 'middle-one', 'middle-two']);
});

test('whole-course ranges include course-scoped types without lesson quiz placement', () => {
  const course = { ...idx, TYPES: { ...idx.TYPES, capstone: { id: 'capstone', scopes: ['course'], requires: [] } },
    PALL: [...idx.PALL, item('capstone-one', 'capstone')] };
  assert.ok(goalMaterial(course, goal('all', 's1-1', 's1-3', 14)).types.includes('capstone'));
  assert.ok(!goalMaterial(course, goal('part', 's1-1', 's1-2', 14)).types.includes('capstone'));
});

test('near focus wins over later goals; overlap uses maximum rather than sum', () => {
  const near = goal('near', 's1-1', 's1-2', 4), future = goal('future', 's1-2', 's1-3', 14);
  const a = plan([near]), b = plan([future]), together = plan([near, future]);
  assert.ok(a.priorities.middle > b.priorities.middle);
  assert.equal(together.priorities.middle, Math.max(a.priorities.middle, b.priorities.middle));
  assert.ok(together.priorities.later > 0);
  assert.equal(new Set(together.pool.map(q => q.id)).size, together.pool.length);
  assert.ok(plan([goal('soft', 's1-2', 's1-3', 14, 'checkpoint')]).priorities.later < b.priorities.later);
});

test('independent evidence can reach 100%, reduce priority, and reopen after a miss', () => {
  const g = goal('g', 's1-2', 's1-2', 4), start = plan([g]);
  const rows = [attempt('middle-one', 'middle', now - 2000), attempt('middle-two', 'middle', now - 1000)];
  const ready = plan([g], rows);
  assert.equal(ready.details[0].progress, 100);
  assert.ok(ready.priorities.middle < start.priorities.middle / 4);
  const missed = plan([g], [...rows, attempt('middle-one', 'middle', now, { firstUnaided: false })]);
  assert.equal(missed.details[0].progress, 0);
  assert.ok(missed.priorities.middle > ready.priorities.middle);
  const oneRecovery = plan([g], [...rows, attempt('middle-one', 'middle', now - 500, { firstUnaided: false }),
    attempt('middle-three', 'middle', now - 100)]);
  assert.equal(oneRecovery.details[0].progress, 0);
});

test('progress cannot round to 100 while even a lightly weighted type is missing', () => {
  const weighted = { ...idx, BLUEPRINTS: { course: { typeWeights: { middle: 0.99999, later: 0.00001 } } } };
  const rows = [attempt('middle-one', 'middle', now - 2000), attempt('middle-two', 'middle', now - 1000)];
  const result = deadlinePlan(weighted, [goal('g', 's1-2', 's1-3', 4)], rows, { now, retention: () => null });
  assert.equal(result.details[0].progress, 99);
});

test('a demonstrated prerequisite gets a smaller soft boost, without gating advanced work', () => {
  const g = goal('g', 's1-2', 's1-2', 4);
  const plain = plan([g]);
  const shown = plan([g], [attempt('middle-one', 'middle', now - 1000, { demonstrates: ['base'] })]);
  assert.ok(plain.priorities.base > 0);
  assert.ok(shown.priorities.base < plain.priorities.base);
  assert.ok(shown.priorities.middle > shown.priorities.base);
});

test('deadline settings validate range and date', () => {
  assert.throws(() => saveGoal(goal('bad', 's9-1', 's1-2', 4), idx, now), /valid subsection/);
  assert.throws(() => saveGoal(goal('bad', 's1-1', 's1-2', -1), idx, now), /future deadline/);
});
