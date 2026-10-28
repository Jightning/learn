import test from 'node:test';
import assert from 'node:assert/strict';
import { masteryFrontier, frontierQuestionPool } from '../../src/lib/mastery-frontier.js';
import { projectMastery } from '../../src/lib/mastery-projection.js';
import { persistenceCourse, submissionFields, evaluationFields } from '../fixtures/mastery/history.mjs';
import { selectScored } from '../../src/lib/practice-score.js';

const DAY = 864e5;
function course(edit = () => {}) {
  return persistenceCourse(f => {
    f.activities.activities.forEach((a, i) => {
      a.kind = 'question'; a.adapter = { id: 'question', version: 1 };
      a.question = `q-${i}`; a.timing = { active: [60, 120] };
      f.C.questionBank[a.question] = { id: a.question, skills: ['a'], typeId: 'a' };
    });
    edit(f);
  });
}
const settings = (now = 10 * DAY, extra = {}) => ({ now, wave: 1, availableSeconds: 900,
  exposure: new Set(['s1-1']), ...extra });
const ids = list => list.map(a => a.id);
const reasons = (f, id) => f.blocked.find(a => a.activityId === id)?.reasons || [];
async function observed(C, entries, now = 10 * DAY, verified = true) {
  const rows = [], verification = new Set();
  for (const [i, ts, outcome = 'pass'] of entries) {
    const s = { ...await submissionFields(C, i), schemaVersion: 1, course: C.code,
      id: `s-${rows.length}`, sessionId: `session-${rows.length}`, ts };
    s.request.attemptId += `-${rows.length}`;
    s.request.nonce += `-${rows.length}`;
    const e = { ...evaluationFields(C, s, ts + 1, outcome), schemaVersion: 1, course: C.code,
      id: `e-${rows.length}`, sessionId: s.sessionId, ts: ts + 1 };
    rows.push(s, e); verification.add(e.id);
  }
  const projection = await projectMastery(C, rows, { now, verifiedEvaluationIds: verified ? verification : new Set() });
  assert.ok(projection);
  return { projection, rows, verification };
}

test('old courses stay opt-out; invalid or stale mastery inputs fail fast', async () => {
  assert.equal(masteryFrontier({}, null), null);
  const C = course(), p = await projectMastery(C, [], { now: 1 });
  assert.throws(() => masteryFrontier(C, p), /clock/);
  assert.throws(() => masteryFrontier(C, p, settings(2)), /Rebuild/);
  assert.throws(() => masteryFrontier(C, p, settings(1, { exposure: [] })), /sets/);
  assert.throws(() => masteryFrontier(C, p, settings(1, { placementLimit: 11 })), /limit/);
  assert.throws(() => masteryFrontier(C, { roots: p.provisional }, settings(1)), /projection/);
  const pool = [{ id: 'old' }];
  assert.equal(frontierQuestionPool(pool, null), pool);
  assert.throws(() => frontierQuestionPool(pool, {}), /frontier/);
});

test('novices get teaching and bounded placement, never mastery from authored/visited teaching', async () => {
  const C = course(), p = await projectMastery(C, [], { now: 1 });
  const f = masteryFrontier(C, p, settings(1, { exposure: new Set() }));
  assert.deepEqual(f.teaching, [{ kind: 'teach', lesson: 's1-1' }]);
  assert.deepEqual(f.eligible, []);
  assert.equal(f.placement.length, 1); // same observed gate, not four initial failures
  assert.deepEqual(f.demonstrated, []);
  assert.equal(p.roots.simple.anchor, null);
  const visited = masteryFrontier(C, p, settings(1));
  assert.equal(visited.eligible.length, 4);
  assert.deepEqual(visited.demonstrated, []);
});

test('partial prior skill and low-importance minimum anchor unlock advanced work only with observed gates', async () => {
  const C = course(f => {
    f.source.targets.roots[0].importance = 1;
    f.activities.activities[3].prerequisites = [{ root: 'simple', skill: 'a', minAnchor: 3 }];
    f.activities.activities[3].tests = [{ root: 'simple', facet: 'explain', skill: 'a', anchor: 3, criteria: ['correct', 'reason'] }];
  });
  const partial = await observed(C, [[0, 10], [1, 20]]);
  assert.equal(reasons(masteryFrontier(C, partial.projection, settings()), 'task-3')[0].code, 'prerequisite-anchor');
  const full = await observed(C, [[0, 10], [1, 20], [2, 2 * DAY + 21]]);
  assert.ok(ids(masteryFrontier(C, full.projection, settings()).eligible).includes('task-3'));
  const provisional = await observed(C, [[0, 10], [1, 20], [2, 2 * DAY + 21]], 10 * DAY, false);
  assert.equal(provisional.projection.provisional.simple.anchor, 3);
  assert.ok(reasons(masteryFrontier(C, provisional.projection, settings()), 'task-3').some(r => r.code === 'prerequisite-anchor'));
});

test('wave, environment, inventory, unknown durations and short sessions give specific blockers', async () => {
  const C = course(f => {
    f.activities.activities[0].wave = 2;
    f.activities.activities[1].environment = { capabilities: ['python3'] };
    f.activities.activities[1].timing = { active: [900, 1800], setup: [60, 300] };
    delete f.activities.activities[2].timing;
  });
  const p = await projectMastery(C, [], { now: 1 });
  const f = masteryFrontier(C, p, settings(1, { exhausted: new Set(['task-3']) }));
  assert.equal(f.eligible.length, 0);
  assert.ok(reasons(f, 'task-0').some(r => r.code === 'future-wave'));
  assert.ok(reasons(f, 'task-1').some(r => r.code === 'environment-unavailable'));
  assert.ok(reasons(f, 'task-1').some(r => r.code === 'session-too-short' && r.requiredSeconds === 2100));
  assert.ok(reasons(f, 'task-2').some(r => r.code === 'unknown-duration'));
  assert.ok(reasons(f, 'task-3').some(r => r.code === 'exhausted-inventory'));
  const long = masteryFrontier(C, p, settings(1, { wave: 2, availableSeconds: 2100, environment: new Set(['python3']) }));
  assert.deepEqual(ids(long.eligible), ['task-0', 'task-1', 'task-3']);
  assert.equal(masteryFrontier(C, p, settings(1, { availableSeconds: 0 })).placement.length, 0);
});

test('placement respects every hard constraint, cap, support and demonstrated requirements', async () => {
  const C = course(f => {
    f.activities.activities[1].support = 'guided';
    f.activities.activities[2].wave = 2;
    f.activities.activities[3].prerequisites = [{ root: 'simple', skill: 'a', minAnchor: 3 }];
  });
  const p = await projectMastery(C, [], { now: 1 });
  const f = masteryFrontier(C, p, settings(1, { exposure: new Set() }));
  assert.deepEqual(ids(f.placement), ['task-0']);
  assert.deepEqual(f.demonstrated, []);
  assert.deepEqual(masteryFrontier(C, p, settings(1, { placementLimit: 0 })).placement, []);
  const known = course();
  const { projection } = await observed(known, [[0, 10], [1, 20], [2, 2 * DAY + 21]]);
  const placed = masteryFrontier(known, projection, settings());
  assert.deepEqual(placed.placement, []);
  assert.deepEqual(placed.demonstrated, ['task-0', 'task-1', 'task-2', 'task-3']);
  // Demonstrated demands are a skip offer, not removal of all review inventory.
  assert.equal(placed.eligible.length, 4);
});

test('guided observed task completion unlocks after edges without certifying mastery', async () => {
  const C = course(f => { f.activities.activities[0].support = 'guided'; f.activities.activities[1].after = ['task-0']; });
  const { projection } = await observed(C, [[0, 10]], 100);
  assert.equal(projection.roots.simple.anchor, null);
  assert.ok(projection.activityGates['task-0']);
  assert.ok(ids(masteryFrontier(C, projection, settings(100)).eligible).includes('task-1'));
  const unverified = await observed(C, [[0, 10]], 100, false);
  assert.ok(reasons(masteryFrontier(C, unverified.projection, settings(100)), 'task-1').some(r => r.code === 'prior-activity'));
  const failed = await observed(C, [[0, 10], [0, 20, 'fail']], 100);
  assert.ok(reasons(masteryFrontier(C, failed.projection, settings(100)), 'task-1').some(r => r.code === 'prior-activity'));
});

test('delay uses qualifying source evidence and current repair clock, not course-open time', async () => {
  const C = course(f => { f.activities.activities[3].delay = {
    activity: 'task-1', root: 'simple', days: 2, after: 'qualifying-evidence-or-repair' }; });
  const empty = await projectMastery(C, [], { now: 100 * DAY });
  assert.ok(reasons(masteryFrontier(C, empty, settings(100 * DAY)), 'task-3').some(r => r.code === 'awaiting-delay-evidence'));
  for (const offset of [-1, 0]) {
    const now = 21 + 2 * DAY + offset;
    const { projection } = await observed(C, [[0, 10], [1, 20]], now);
    const f = masteryFrontier(C, projection, settings(now));
    assert.equal(ids(f.eligible).includes('task-3'), offset === 0);
    if (offset < 0) assert.ok(reasons(f, 'task-3').some(r => r.code === 'waiting-for-delay' && r.readyAt === 21 + 2 * DAY));
  }
  const repaired = await observed(C, [[0, 10], [1, 20], [2, 30, 'fail']], 3 * DAY);
  assert.ok(reasons(masteryFrontier(C, repaired.projection, settings(3 * DAY)), 'task-3').some(r => r.code === 'awaiting-delay-evidence'));
});

test('coverage-first ranking cannot escape the frontier; exploration grants no certification', async () => {
  const C = course(f => { f.activities.activities[1].prerequisites = [{ root: 'simple', skill: 'a', minAnchor: 3 }]; });
  const p = await projectMastery(C, [], { now: 1 });
  const f = masteryFrontier(C, p, settings(1));
  const pool = Object.values(C.questionBank), snapshot = JSON.stringify({ C, p, f });
  const result = selectScored(pool, [], { frontier: f });
  assert.ok(!result.scores.some(s => s.id === 'q-1'));
  assert.ok(!result.scores.some(s => s.id === 'ledger-total'));
  assert.equal(f.exploration.find(a => a.activityId === 'task-1').certificationEligible, false);
  assert.equal(JSON.stringify({ C, p, f }), snapshot);
  const exhausted = masteryFrontier(C, p, settings(1, { exhausted: new Set(ids(Object.values(C.activityIndex.activities))) }));
  assert.equal(selectScored(pool, [], { frontier: exhausted }).action, 'stop');
  const novice = masteryFrontier(C, p, settings(1, { exposure: new Set() }));
  assert.equal(selectScored(pool, [], { frontier: novice }).item, null);
  assert.equal(selectScored(pool, [], { frontier: novice, placement: true }).item.id, 'q-0');
});

test('blocked diagnostic probes cannot escape the frontier after an informative failure', async () => {
  const C = course(f => { f.activities.activities[1].wave = 2; });
  const p = await projectMastery(C, [], { now: 1 });
  const frontier = masteryFrontier(C, p, settings(1));
  const diagnostic = { id: 'q-1', skills: ['a'], typeId: 'a', probes: ['sign'], diagnosticsFor: ['a'] };
  const rows = [{ event: 'attempt', id: 'failed', itemId: 'old', typeId: 'a', skills: ['a'],
    ts: 1, sessionId: 'old', firstUnaided: false, correct: false, errorHypotheses: ['sign'] }];
  assert.equal(selectScored([C.questionBank['q-0']], rows, { diagnostics: [diagnostic] }).item.id, 'q-1');
  assert.equal(selectScored([C.questionBank['q-0']], rows, { diagnostics: [diagnostic], frontier }).item.id, 'q-0');
});

test('placement cap covers distinct demands; unknown setup for required environment stays blocked', async () => {
  const C = course(f => {
    f.source.targets.roots[0].facets.push({ id: 'build', standard: 'Build a ledger', skills: ['a'],
      anchors: [{ level: 3, standard: 'Build', criteria: ['correct', 'reason'] }] });
    f.source.targets.roots[0].anchors[0].facets.push('build');
    f.activities.activities[1].tests[0].facet = 'build';
    f.activities.activities[2].environment = { capabilities: ['runtime'] };
  });
  const p = await projectMastery(C, [], { now: 1 });
  const f = masteryFrontier(C, p, settings(1, { placementLimit: 1, environment: new Set(['runtime']) }));
  assert.deepEqual(ids(f.placement), ['task-0']);
  const diverse = masteryFrontier(C, p, settings(1, { placementLimit: 2 }));
  assert.deepEqual(ids(diverse.placement), ['task-0', 'task-1']);
  assert.ok(reasons(f, 'task-2').some(r => r.code === 'unknown-duration'));
});

test('superseded, incomplete and infrastructure results cannot retain an activity completion gate', async () => {
  const C = course();
  const { rows, verification } = await observed(C, [[0, 10]], 100);
  const previous = rows[1];
  const correction = structuredClone(previous);
  correction.id = 'corrected'; correction.ts = 30;
  correction.supersedes = previous.id; correction.reason = 'Withdraw unobserved reasoning';
  correction.result.provenance.issuedAt = 30;
  correction.result.criteria[0].outcome = 'unobserved';
  verification.add(correction.id);
  const p = await projectMastery(C, [...rows, correction], { now: 100, verifiedEvaluationIds: verification });
  assert.ok(p); assert.deepEqual(p.activityGates, {});
  for (const status of ['incomplete', 'execution-error']) {
    const e = structuredClone(previous); e.result.status = status;
    e.result.criteria.forEach(c => { c.outcome = 'unobserved'; });
    const result = await projectMastery(C, [rows[0], e], { now: 100, verifiedEvaluationIds: verification });
    assert.ok(result); assert.deepEqual(result.activityGates, {});
  }
});

test('assisted and provisional source results never start a retention clock', async () => {
  const C = course(f => {
    f.activities.activities[0].support = 'guided';
    f.activities.activities[3].delay = { activity: 'task-0', root: 'simple', days: 2, after: 'qualifying-evidence-or-repair' };
  });
  for (const verified of [false, true]) {
    const { projection } = await observed(C, [[0, 10]], 10 * DAY, verified);
    assert.ok(reasons(masteryFrontier(C, projection, settings()), 'task-3').some(r => r.code === 'awaiting-delay-evidence'));
  }
});

test('a higher observed anchor cannot substitute for an unentailed prerequisite anchor', async () => {
  const C = course(f => {
    const root = f.source.targets.roots[0];
    root.anchors.push({ level: 5, standard: 'Higher demand', facets: ['explain'] });
    root.facets[0].anchors.push({ level: 5, standard: 'Higher explanation', criteria: ['correct', 'reason'] });
    f.activities.activities.slice(0, 3).forEach(a => { a.tests[0].anchor = 5; });
    f.activities.activities[3].prerequisites = [{ root: 'simple', skill: 'a', minAnchor: 3 }];
  });
  const { projection } = await observed(C, [[0, 10], [1, 20], [2, 2 * DAY + 21]]);
  assert.equal(projection.roots.simple.anchor, 5);
  assert.equal(projection.roots.simple.anchors[3].complete, false);
  assert.ok(reasons(masteryFrontier(C, projection, settings()), 'task-3').some(r => r.code === 'prerequisite-anchor'));
});

test('optional unavailable adapters stay visible, with fallback links on missing environments', async () => {
  const C = course(f => {
    const a = f.activities.activities[0];
    a.kind = 'audio'; a.required = false; a.adapter = { id: 'audio', version: 1 }; delete a.question;
    const b = f.activities.activities[1];
    b.environment = { capabilities: ['microphone'] }; b.fallback = 'task-2';
    b.timing.setup = [0, 30];
  });
  const p = await projectMastery(C, [], { now: 1 });
  const f = masteryFrontier(C, p, settings(1));
  assert.ok(reasons(f, 'task-0').some(r => r.code === 'adapter-unavailable' && r.adapter === 'audio'));
  assert.ok(reasons(f, 'task-1').some(r => r.code === 'environment-unavailable' && r.fallback === 'task-2'));
  assert.deepEqual(ids(f.placement), ['task-2']);
});
