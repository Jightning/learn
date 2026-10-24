import test from 'node:test';
import assert from 'node:assert/strict';
import { deadlinePlan, planAcrossCourses, goalMaterial, studyMinutesToday, saveGoal, deleteGoal, goals } from '../../src/lib/learn-by.js';

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

test('deadline questions retain normalized prompts and answers when bank records share their IDs', () => {
  const course = { ...idx,
    QALL: [{ ...item('middle-one', 'middle', 's1-2'), prompt: 'Rendered lesson prompt' }],
    PALL: [],
    BANK: {
      'middle-one': { id: 'middle-one', typeId: 'middle', use: 'practice', q: 'Authored lesson prompt', response: { kind: 'number', value: 2 } },
      'middle-bank': { id: 'middle-bank', typeId: 'middle', use: 'practice', q: 'Bank-only prompt', response: { kind: 'number', value: 3 } }
    }
  };
  const material = goalMaterial(course, goal('g', 's1-2', 's1-2', 4));
  assert.equal(material.pool.find(q => q.id === 'middle-one').prompt, 'Rendered lesson prompt');
  assert.equal(material.pool.find(q => q.id === 'middle-bank').prompt, 'Bank-only prompt');
  assert.equal(material.pool.find(q => q.id === 'middle-bank').response.value, 3);
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
  const result = deadlinePlan(weighted, [{ ...goal('g', 's1-2', 's1-3', 4), standard: 'course' }], rows, { now, retention: () => null });
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


test('section blueprint and explicitly selected standard determine weights', () => {
  const course = { ...idx, BLUEPRINTS: { s1: { scope: 's1', types: ['base', 'middle', 'later'], typeWeights: { base: 0.05, middle: 0.9, later: 0.05 } } } };
  const auto = deadlinePlan(course, [goal('s', 's1-1', 's1-3', 5)], [], { now, retention: () => null });
  assert.equal(auto.details[0].standard.scope, 's1');
  assert.ok(auto.priorities.middle > auto.priorities.later * 10);
  const range = plan([goal('r', 's1-2', 's1-3', 5)]);
  assert.equal(range.details[0].standard, null);
});

test('unknown availability gives work ranges but no feasibility claim', () => {
  const result = plan([goal('g', 's1-2', 's1-2', 5)]), detail = result.details[0];
  assert.equal(detail.forecast, 'availability-unknown');
  assert.ok(detail.workRange.lower < detail.workRange.typical);
  assert.ok(detail.workRange.typical < detail.workRange.upper);
  assert.deepEqual(detail.actions.map(a => a.action), ['diagnose', 'practice', 'check', 'review']);
  assert.ok(detail.actions.find(a => a.action === 'review').earliestAt >= now + 864e5);
});

test('overlapping duplicate goals share actions and one daily capacity', () => {
  const g = { ...goal('a', 's1-2', 's1-2', 5), minutesPerDay: 20, sessionMinutes: 2 };
  const one = plan([g]), both = plan([g, { ...g, id: 'b' }]);
  assert.equal(one.workRange.typical, both.workRange.typical);
  assert.equal(one.actions.length, both.actions.length);
  assert.ok(both.actions.every(a => a.goalIds.length === 2));
  assert.ok(both.actions.some(a => a.sessions > 1));
  assert.equal(both.details[0].forecast, 'fits-typical-estimate');
  const usage = new Map();
  for (const a of both.actions) for (const slot of a.allocations || []) usage.set(slot.day, (usage.get(slot.day) || 0) + slot.minutes);
  assert.ok([...usage.values()].every(n => n <= 20));
});

test('insufficient time leaves requirements unresolved; session length alone is not daily availability', () => {
  const result = plan([{ ...goal('cram', 's1-1', 's1-3', 0.02), minutesPerDay: 1 }]);
  assert.equal(result.details[0].forecast, 'insufficient-time');
  assert.ok(result.details[0].unscheduled.length);
  assert.equal(result.details[0].delayedRetention, 'unverified');
  assert.equal(result.details[0].progress, 0);
  assert.equal(plan([{ ...goal('session', 's1-1', 's1-3', 5), sessionMinutes: 15 }]).details[0].forecast, 'availability-unknown');
});

test('replanning missed days moves actions forward and expired goals remain visible', () => {
  const g = { ...goal('g', 's1-2', 's1-2', 5), minutesPerDay: 10 };
  const later = deadlinePlan(idx, [g], [], { now: now + 864e5, retention: () => null });
  assert.ok(later.actions.every(a => a.scheduledAt === null || a.scheduledAt >= now + 864e5));
  const expired = deadlinePlan(idx, [g], [], { now: g.dueAt + 1, retention: () => null });
  assert.equal(expired.details[0].forecast, 'expired');
  assert.equal(expired.actions.length, 0);
  assert.deepEqual(expired.priorities, {});
});

test('achievement survives aging while retrieval need is separate', () => {
  const old = [attempt('middle-one', 'middle', now - 45 * 864e5), attempt('middle-two', 'middle', now - 44 * 864e5)];
  const detail = plan([goal('g', 's1-2', 's1-2', 5)], old).details[0];
  assert.equal(detail.progress, 100);
  assert.equal(detail.retentionNeeds, 1);
  assert.deepEqual(detail.actions.map(a => a.action), ['review']);
});

test('composite candidates include every component and prerequisites recurse with cycle rejection', () => {
  const course = { ...idx, QALL: [{ ...item('joint', 'later', 's1-3'), skills: ['later', 'middle'] }], PALL: idx.PALL };
  const material = goalMaterial(course, goal('g', 's1-3', 's1-3', 5));
  assert.ok(material.types.includes('middle'));
  assert.ok(material.prerequisites.includes('base'));
  const cyclic = { ...idx, TYPES: { ...idx.TYPES, base: { ...idx.TYPES.base, requires: ['later'] } } };
  assert.throws(() => goalMaterial(cyclic, goal('g', 's1-3', 's1-3', 5)), /Cyclic/);
});

test('missing inventory and invalidated standards stay explicit', () => {
  const course = { ...idx, TYPES: { ...idx.TYPES, missing: { id: 'missing', scopes: ['s1-2'] } } };
  assert.equal(deadlinePlan(course, [goal('g', 's1-2', 's1-2', 5)], [], { now, retention: () => null }).details[0].forecast, 'content-gap');
  const bad = plan([{ ...goal('g', 's1-2', 's1-2', 5), standard: 'deleted' }]).details[0];
  assert.match(bad.error, /no longer available/);
  assert.equal(bad.progress, 0);
});

test('invalid availability and standards fail before settings writes', () => {
  for (const key of ['minutesPerDay', 'sessionMinutes']) {
    assert.throws(() => saveGoal({ ...goal('g', 's1-1', 's1-2', 5), [key]: 0 }, idx, now), /Study minutes/);
    assert.throws(() => saveGoal({ ...goal('g', 's1-1', 's1-2', 5), [key]: 1441 }, idx, now), /Study minutes/);
  }
  assert.throws(() => saveGoal({ ...goal('g', 's1-1', 's1-2', 5), standard: 'missing' }, idx, now), /available assessment/);
});


test('whole course prefers its standard even when it contains one subsection', () => {
  const tiny = { ...idx, SUBS: { 's1-2': idx.SUBS['s1-2'] }, BLUEPRINTS: { course: { scope: 'course', types: ['middle', 'later'], typeWeights: { middle: 0.99999, later: 0.00001 } } } };
  const rows = [attempt('middle-one', 'middle', now - 2000), attempt('middle-two', 'middle', now - 1000)];
  const result = deadlinePlan(tiny, [goal('tiny', 's1-2', 's1-2', 5)], rows, { now, retention: () => null });
  assert.equal(result.details[0].standard.scope, 'course');
  assert.equal(result.details[0].progress, 99);
});

test('required integration schedules one actual joint task without repeating supported atomic repairs', () => {
  const joint = { ...item('joint', 'middle'), skills: ['middle', 'later'], group: 'joint', demand: 'standard' };
  const course = { ...idx, PALL: [...idx.PALL, joint], BANK: { joint }, BLUEPRINTS: { course: {
    scope: 'course', version: 'integration-v1', types: ['middle', 'later'], typeWeights: { middle: 0.5, later: 0.5 }, requirements: { integrations: [['middle', 'later']] }
  } } };
  const g = { ...goal('g', 's1-1', 's1-3', 5), minutesPerDay: 15 };
  const rows = ['middle', 'later'].flatMap(id => [attempt(`${id}-one`, id, now - 2000), attempt(`${id}-two`, id, now - 1000)]);
  const before = deadlinePlan(course, [g], rows, { now, retention: () => null });
  assert.equal(before.details[0].progress, 0);
  const integrated = before.actions.filter(a => a.action === 'integrate');
  assert.equal(integrated.length, 1);
  assert.equal(integrated[0].itemId, 'joint');
  assert.ok(!before.actions.some(a => ['diagnose', 'practice', 'check'].includes(a.action)));
  const after = deadlinePlan(course, [g], [...rows, attempt('joint', 'middle', now, { skills: ['middle', 'later'] })], { now, retention: () => null });
  assert.equal(after.details[0].progress, 100);
  assert.ok(!after.actions.some(a => a.action === 'integrate'));
  const jointOnly = deadlinePlan(course, [g], [attempt('joint', 'middle', now, { skills: ['middle', 'later'] })], { now, retention: () => null });
  assert.equal(jointOnly.details[0].progress, 0);
  assert.ok(jointOnly.actions.some(a => a.action === 'check'));
});

test('missing integration inventory is an explicit content gap', () => {
  const course = { ...idx, BLUEPRINTS: { course: { scope: 'course', types: ['middle', 'later'], requirements: { integrations: [['middle', 'later']] } } } };
  const result = deadlinePlan(course, [goal('g', 's1-1', 's1-3', 5)], [], { now, retention: () => null });
  assert.equal(result.details[0].forecast, 'content-gap');
  assert.ok(result.details[0].missing.includes('integration:later+middle'));
});

test('stage dependencies span days without overlapping capacity; teaching remains conditional', () => {
  const course = { ...idx, TYPES: { ...idx.TYPES, middle: { ...idx.TYPES.middle, teach: ['s1-2'] } } };
  const rows = [attempt('middle-one', 'middle', now - 1000, { firstUnaided: false })];
  const result = deadlinePlan(course, [{ ...goal('g', 's1-2', 's1-2', 20), minutesPerDay: 2 }], rows, { now, retention: () => null });
  const actions = result.actions.filter(a => a.skillId === 'middle');
  assert.equal(actions.find(a => a.action === 'teach').conditional, true);
  for (let i = 1; i < actions.length; i++) assert.ok(actions[i].scheduledAt >= actions[i - 1].endsAt);
  const slots = actions.flatMap(a => a.allocations || []).sort((a, b) => a.start - b.start);
  for (let i = 1; i < slots.length; i++) assert.ok(slots[i].start >= slots[i - 1].end);
});


test('cross-course schedules consume one global budget and namespace equal skill IDs', () => {
  const books = [{ cid: 'first', idx }, { cid: 'second', idx }];
  const list = [{ ...goal('a', 's1-2', 's1-2', 0.25), cid: 'first', minutesPerDay: 10 },
    { ...goal('b', 's1-2', 's1-2', 0.25), cid: 'second', minutesPerDay: 20 }];
  const result = planAcrossCourses(books, list, {}, { now, retention: () => null });
  assert.equal(result.minutesPerDay, 10);
  assert.equal(new Set(result.actions.map(a => a.id)).size, result.actions.length);
  assert.ok(result.actions.some(a => a.cid === 'first'));
  assert.ok(result.actions.some(a => a.cid === 'second'));
  const usage = new Map();
  for (const a of result.actions) for (const slot of a.allocations || []) usage.set(slot.day, (usage.get(slot.day) || 0) + slot.minutes);
  assert.ok([...usage.values()].every(n => n <= 10));
  assert.ok(result.details.some(d => d.forecast === 'insufficient-time'));
  // Equal local skill names do not make one course's failed scheduling block
  // the other course's already scheduled diagnostic.
  assert.equal(result.actions.filter(a => a.action === 'diagnose' && a.scheduledAt !== null).length, 2);
});

test('a sole subsection can inherit an available full-section standard', () => {
  const course = { ...idx, SUBS: { 's1-2': idx.SUBS['s1-2'] }, BLUEPRINTS: { s1: { scope: 's1', types: ['middle'] } } };
  assert.equal(goalMaterial(course, goal('g', 's1-2', 's1-2', 5)).standard.scope, 's1');
});


test('logged study and feedback use today budget across reloads and courses, with a fresh budget tomorrow', () => {
  const g = { ...goal('g', 's1-2', 's1-2', 0.1), minutesPerDay: 10 };
  const studied = { ...attempt('outside', 'outside', now - 1000), activeMs: 8 * 6e4, feedbackMs: 2 * 6e4 };
  const repeated = [studied, { ...studied }];
  assert.equal(studyMinutesToday(repeated, now), 10);
  for (let reload = 0; reload < 2; reload++) {
    const result = deadlinePlan(idx, [g], repeated, { now, retention: () => null });
    assert.equal(result.spentToday, 10);
    assert.equal(result.details[0].availableMinutes, 0);
    assert.equal(result.details[0].forecast, 'insufficient-time');
    assert.ok(result.actions.every(a => a.scheduledAt === null));
  }
  const shared = planAcrossCourses([{ cid: 'course', idx }, { cid: 'other', idx }], [g], { course: [studied], other: [{ ...studied }] }, { now, retention: () => null });
  assert.equal(shared.spentToday, 10);
  assert.equal(shared.details[0].availableMinutes, 0);
  const tomorrow = deadlinePlan(idx, [{ ...g, dueAt: now + 2 * 864e5 }], repeated, { now: now + 864e5, retention: () => null });
  assert.equal(tomorrow.spentToday, 0);
  assert.ok(tomorrow.details[0].availableMinutes >= 10);
  assert.ok(tomorrow.actions.some(a => a.scheduledAt !== null));
  assert.equal(studyMinutesToday([{ ...studied, timingFlags: ['idle'] }], now), 0);
});

test('quarantined-only skill keeps its denominator and reports missing practice inventory', () => {
  const course = { ...idx, QALL: idx.QALL.map(q => q.typeId === 'middle' ? { ...q, quarantined: true } : q),
    PALL: idx.PALL.map(q => q.typeId === 'middle' ? { ...q, quarantined: true } : q) };
  const detail = deadlinePlan(course, [goal('g', 's1-2', 's1-2', 5)], [], { now, retention: () => null }).details[0];
  assert.deepEqual(detail.types, ['middle']);
  assert.deepEqual(detail.missing, ['middle']);
  assert.equal(detail.progress, 0);
  assert.ok(!detail.pool.some(q => q.quarantined));
});
