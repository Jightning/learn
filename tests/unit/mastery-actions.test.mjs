import test from 'node:test';
import assert from 'node:assert/strict';
import { masteryActionPlan } from '../../src/lib/learn-by.js';
import { projectMastery } from '../../src/lib/mastery-projection.js';
import { measuredActivityTiming, reportedActivityTiming, activityTimeRange } from '../../src/lib/activity-timing.js';
import { selectScored } from '../../src/lib/practice-score.js';
import { persistenceCourse, submissionFields, evaluationFields } from '../fixtures/mastery/history.mjs';

const DAY = 864e5, now = 10 * DAY;
function course(edit = () => {}) {
  return persistenceCourse(f => {
    for (const [i, a] of f.activities.activities.entries()) {
      a.kind = 'question'; a.adapter = { id: 'question', version: 1 }; a.question = `q-${i}`;
      f.C.questionBank[a.question] = { id: a.question, skills: ['a'] };
      a.timing = { active: [30, 60], feedback: [10, 20] };
    }
    edit(f);
  });
}
const options = extra => ({ now, wave: 1, availableSeconds: 900, exposure: new Set(['s1-1']), ...extra });
async function plan(C = course(), rows = [], extra = {}, verifiedEvaluationIds = new Set()) {
  const projection = await projectMastery(C, rows, { now, verifiedEvaluationIds });
  assert.ok(projection);
  const snapshot = JSON.stringify({ C, rows, projection });
  const result = await masteryActionPlan(C, projection, rows, options(extra));
  assert.equal(JSON.stringify({ C, rows, projection }), snapshot, 'planning is pure');
  return result;
}
async function attempt(C, index, ts, outcome = 'fail', suffix = String(ts)) {
  const s = { ...await submissionFields(C, index), schemaVersion: 1, course: C.code, id: `s-${suffix}`, sessionId: suffix, ts };
  s.request.attemptId += suffix; s.request.nonce += suffix;
  const e = { ...evaluationFields(C, s, ts + 1, outcome), schemaVersion: 1, course: C.code, id: `e-${suffix}`, sessionId: suffix, ts: ts + 1 };
  return [s, e];
}
const ids = list => list.map(a => a.id);
const reasons = (p, id) => p.actions.find(a => a.id === id)?.reasons || [];

test('opt-out, malformed allocation/history and stale projections fail closed', async () => {
  assert.equal(await masteryActionPlan({}, null, []), null);
  const C = course(), projection = await projectMastery(C, [], { now });
  await assert.rejects(masteryActionPlan(C, projection, [], options({ allocation: { coding: 1 } })), /allocation/);
  await assert.rejects(masteryActionPlan(C, projection, [], options({ allocation: null })), /allocation/);
  await assert.rejects(masteryActionPlan(C, projection, [], options({ now: now + 1 })), /Rebuild/);
  await assert.rejects(masteryActionPlan(C, projection, [], options({ availableSeconds: -1 })), /session/);
  const errors = [];
  assert.equal(await masteryActionPlan(C, projection, [{}], options(), errors), null);
  assert.ok(errors.length);
});

test('novices immediately receive budgeted teaching; unknown teaching time stays blocked', async () => {
  const p = await plan(course(), [], { exposure: new Set(), lessonTiming: { 's1-1': [120, 180] } });
  assert.deepEqual(ids(p.queue), ['teach:s1-1']);
  assert.equal(p.queue[0].kind, 'teach');
  assert.ok(reasons(p, 'task-0').some(r => r.code === 'teaching-exposure'));
  const unknown = await plan(course(), [], { exposure: new Set() });
  assert.deepEqual(unknown.queue, []);
  assert.ok(reasons(unknown, 'teach:s1-1').some(r => r.code === 'unknown-duration'));
});

test('guided, independent, practical, defense and delayed actions preserve sequence', async () => {
  const C = course(f => {
    const [guided, independent, practical, defense] = f.activities.activities;
    guided.support = 'guided';
    practical.kind = 'external-lab'; practical.adapter = { id: 'external-submission', version: 1 }; delete practical.question;
    practical.lab = { id: 'lab', version: '1', url: 'https://example.invalid/lab.zip', sha256: '0'.repeat(64), instructions: 'Fix ledger', command: 'test' };
    practical.timing.setup = [10, 30];
    defense.kind = 'written-defense'; defense.adapter = { id: 'written-defense', version: 1 }; delete defense.question;
  });
  let p = await plan(C);
  assert.deepEqual(ids(p.queue), ['task-0']);
  assert.deepEqual(p.actions.map(a => a.kind), ['guided', 'independent', 'practical', 'defense']);
  assert.ok(reasons(p, 'task-1').some(r => r.code === 'sequence-gate'));
  const rows = await attempt(C, 0, 10, 'pass');
  p = await plan(C, rows, {}, new Set([rows[1].id]));
  assert.deepEqual(ids(p.queue), ['task-1']);
  assert.deepEqual(p.skipped, [{ activityId: 'task-0', reason: 'observed-completion' }]);
  const provisional = await plan(C, rows);
  assert.ok(!ids(provisional.queue).includes('task-1'));
});

test('authored return to guided repair does not deadlock the earlier independent task', async () => {
  const C = course(f => {
    f.activities.activities[1].support = 'reference';
    f.activities.activities[1].after = ['task-0'];
  });
  const p = await plan(C);
  assert.ok(ids(p.queue).includes('task-0'));
  assert.ok(reasons(p, 'task-1').some(r => r.code === 'prior-activity'));
  assert.ok(!reasons(p, 'task-0').some(r => r.code === 'sequence-gate' && r.activityId === 'task-1'));
});

test('demonstrated question demands never waive a required practical artifact', async () => {
  const C = course(f => {
    const a = f.activities.activities[3];
    a.kind = 'external-lab'; a.adapter = { id: 'external-submission', version: 1 }; delete a.question;
    a.lab = { id: 'lab', version: '1', url: 'https://example.invalid/lab.zip', sha256: '0'.repeat(64), instructions: 'Fix ledger', command: 'test' };
    a.timing.setup = [10, 20];
  });
  const rows = [...await attempt(C, 0, 10, 'pass'), ...await attempt(C, 1, 20, 'pass'), ...await attempt(C, 2, 2 * DAY + 21, 'pass')];
  const p = await plan(C, rows, {}, new Set(rows.filter(r => r.event === 'activity-evaluation').map(r => r.id)));
  assert.ok(ids(p.queue).includes('task-3'));
  assert.ok(!p.skipped.some(s => s.activityId === 'task-3'));
});

test('placement bypasses exposure only, not guided, after, environment or required practical gates', async () => {
  const C = course(f => {
    f.activities.activities[1].after = ['task-0'];
    f.activities.activities[2].environment = { capabilities: ['runtime'] }; f.activities.activities[2].timing.setup = [0, 1];
    f.activities.activities[3].wave = 2;
  });
  const p = await plan(C, [], { exposure: new Set(), placement: true });
  assert.ok(ids(p.queue).includes('task-0'));
  assert.ok(!ids(p.queue).includes('task-1'));
  assert.ok(!ids(p.queue).includes('task-2'));
  assert.ok(!ids(p.queue).includes('task-3'));
  assert.equal(p.skipped.length, 0);
  const rows = [...await attempt(C, 0, 10, 'pass'), ...await attempt(C, 1, 20, 'pass'), ...await attempt(C, 2, 2 * DAY + 21, 'pass')];
  const known = await plan(C, rows, {}, new Set(rows.filter(r => r.event === 'activity-evaluation').map(r => r.id)));
  assert.ok(known.skipped.some(s => s.activityId === 'task-3' && s.reason === 'demonstrated-demand'));
});

test('two repeated failures request review; three repair actions terminate even across variants', async () => {
  const C = course(), first = await attempt(C, 0, 10);
  let p = await plan(C, first, { lessonTiming: { 's1-1': [10, 20] } });
  assert.ok(ids(p.queue).includes('repair:s1-1'));
  assert.ok(reasons(p, 'task-0').some(r => r.code === 'repair-needed'));
  const rows = [...first, ...await attempt(C, 1, 20)];
  p = await plan(C, rows, { lessonTiming: { 's1-1': [10, 20] } });
  assert.deepEqual(p.queue, []);
  assert.ok(reasons(p, 'task-0').some(r => r.code === 'repair-limit'));
  assert.ok(p.actions.some(a => a.kind === 'request-review'));
  const repairs = Array.from({ length: 3 }, (_, i) => ({ schemaVersion: 1, event: 'activity-feedback', id: `f-${i}`,
    course: C.code, ts: 30 + i, sessionId: 'repairs', evaluationId: first[1].id, repair: i ? 'representation' : 'explanation' }));
  p = await plan(C, [...first, ...repairs]);
  assert.deepEqual(p.queue, []);
  assert.ok(reasons(p, 'task-2').some(r => r.code === 'repair-limit'));
});

test('latest evaluation corrections count once; environment errors do not become skill failures', async () => {
  const C = course(), rows = await attempt(C, 0, 10);
  const corrected = structuredClone(rows[1]); corrected.id = 'correction'; corrected.ts = 30;
  corrected.supersedes = rows[1].id; corrected.reason = 'Confirm result'; corrected.result.provenance.issuedAt = 30;
  const p = await plan(C, [...rows, corrected]);
  assert.ok(!reasons(p, 'task-1').some(r => r.code === 'repair-limit'));
  rows[1].result.status = 'execution-error'; rows[1].result.criteria.forEach(c => { c.outcome = 'unobserved'; });
  const env = await plan(C, rows);
  assert.ok(reasons(env, 'task-0').some(r => r.code === 'execution-error' && r.nextAction === 'check-environment'));
  assert.ok(!env.actions.some(a => a.kind === 'repair'));
});

test('pending and provisional evaluations stay awaiting review rather than repeating checks', async () => {
  const C = course(), rows = await attempt(C, 0, 10, 'pass');
  for (const history of [[rows[0]], rows]) {
    const p = await plan(C, history);
    assert.ok(reasons(p, 'task-0').some(r => r.code === 'awaiting-review'));
    assert.ok(!ids(p.queue).includes('task-0'));
  }
});

test('feedback is reserved, unknown durations stay unknown, long labs cannot be squeezed', async () => {
  const C = course(f => {
    const a = f.activities.activities[0]; a.kind = 'external-lab'; a.adapter = { id: 'external-submission', version: 1 }; delete a.question;
    a.lab = { id: 'lab', version: '1', url: 'https://example.invalid/lab.zip', sha256: '0'.repeat(64), instructions: 'Fix ledger', command: 'test' };
    a.timing = { active: [600, 1200], setup: [60, 300], feedback: [60, 120] };
    delete f.activities.activities[1].timing.feedback;
    delete f.activities.activities[2].timing;
    f.activities.activities[3].timing = { active: [850, 890], feedback: [10, 20] };
  });
  const p = await plan(C);
  assert.deepEqual(p.queue, []);
  assert.ok(reasons(p, 'task-0').some(r => r.code === 'session-too-short' && r.requiredSeconds === 1620));
  assert.ok(reasons(p, 'task-1').some(r => r.code === 'unknown-duration' && r.phases.includes('feedback')));
  assert.ok(reasons(p, 'task-3').some(r => r.code === 'session-too-short' && r.requiredSeconds === 910));
});

test('observed reported durations can fill gaps, incomplete interrupted samples cannot', async () => {
  const C = course(f => { delete f.activities.activities[0].timing; });
  const rows = await attempt(C, 0, 10);
  rows[0].timing = reportedActivityTiming({ activeMs: 30000, setupMs: 0, wallMs: 40000 });
  const feedback = { schemaVersion: 1, event: 'activity-feedback', id: 'feedback', course: C.code,
    ts: 20, sessionId: 'feedback', evaluationId: rows[1].id,
    timing: reportedActivityTiming({ activeMs: 10000, setupMs: 0, wallMs: 10000 }) };
  let p = await plan(C, [...rows, feedback]);
  const a = p.actions.find(a => a.id === 'task-0');
  assert.equal(a.timing.total.upper, 40);
  assert.deepEqual(a.timing.active.sources, ['external-report']);
  rows[0].timing.interrupted = true;
  p = await plan(C, [...rows, feedback]);
  assert.ok(reasons(p, 'task-0').some(r => r.code === 'unknown-duration'));
});

test('observed explanation reading informs repair estimates through the same persisted feedback events', async () => {
  const C = course(), rows = await attempt(C, 0, 10);
  const feedback = { schemaVersion: 1, event: 'activity-feedback', id: 'reading', course: C.code,
    ts: 20, sessionId: 'reading', evaluationId: rows[1].id, repair: 'explanation',
    timing: reportedActivityTiming({ activeMs: 120000, setupMs: 0, wallMs: 120000 }) };
  const p = await plan(C, [...rows, feedback], { exposure: new Set() });
  const teach = p.actions.find(a => a.kind === 'teach');
  assert.equal(teach.timing.active.upper, 120);
  assert.deepEqual(teach.timing.active.sources, ['external-report']);
});

test('configurable coding allocation ranks available work and unused shares reallocate', async () => {
  const C = course(f => {
    const root = f.source.targets.roots[0];
    root.facets.push({ id: 'build', standard: 'Build', skills: ['a'], anchors: [{ level: 3, standard: 'Build', criteria: ['correct', 'reason'] }] });
    root.anchors[0].facets.push('build');
    for (const a of f.activities.activities.slice(0, 2)) a.tests[0].facet = 'build';
  });
  const coding = await plan(C, [], { availableSeconds: 160, allocation: { coding: 1, retention: 0, breadth: 0 } });
  assert.deepEqual(ids(coding.queue), ['task-0', 'task-1']);
  const breadth = await plan(C, [], { availableSeconds: 160, allocation: { coding: 0, retention: 0, breadth: 1 } });
  assert.deepEqual(ids(breadth.queue), ['task-2', 'task-3']);
});

test('due important retention is protected and elapsed delay cannot be compressed by a session budget', async () => {
  const C = course(f => {
    f.activities.activities[3].delay = { activity: 'task-1', root: 'simple', days: 2, after: 'qualifying-evidence-or-repair' };
    // Give the due check its own unsatisfied demand.
    const root = f.source.targets.roots[0];
    root.facets.push({ id: 'build', standard: 'Build', skills: ['a'], anchors: [{ level: 3, standard: 'Build', criteria: ['correct', 'reason'] }] });
    root.anchors[0].facets.push('build'); f.activities.activities[3].tests[0].facet = 'build';
  });
  const early = await plan(C);
  assert.ok(reasons(early, 'task-3').some(r => r.code === 'awaiting-delay-evidence'));
  const rows = [...await attempt(C, 0, 10, 'pass'), ...await attempt(C, 1, 20, 'pass')];
  const verified = new Set(rows.filter(r => r.event === 'activity-evaluation').map(r => r.id));
  const p = await plan(C, rows, { availableSeconds: 80 }, verified);
  assert.deepEqual(ids(p.queue), ['task-3']);
  assert.equal(p.queue[0].kind, 'delayed');
});

test('required low-importance work wins starvation protection; allocation reallocates unused categories', async () => {
  const C = course(f => {
    const low = structuredClone(f.source.targets.roots[0]);
    low.id = 'low'; low.importance = 1; low.skills = ['b']; low.facets[0].skills = ['b'];
    f.source.targets.roots.push(low);
    f.activities.activities[1].tests[0].root = 'low'; f.activities.activities[1].tests[0].skill = 'b';
    f.source.targets.roots[0].importance = 9;
    f.activities.activities[0].required = false;
  });
  const rows = [];
  for (let i = 0; i < 6; i++) rows.push(...await attempt(C, 0, 10 + i * 10, 'unobserved'));
  const p = await plan(C, rows, { availableSeconds: 80, allocation: { coding: 1, retention: 0, breadth: 0 } });
  assert.deepEqual(ids(p.queue), ['task-1']);
  assert.equal(p.queue[0].starved, true);
  assert.equal(p.queue[0].importance, 1);
  assert.equal(p.spent.breadth, 80);
  assert.equal(p.remainingSeconds, 0);
});

test('successive one-action sessions alternate due retention with starved required work', async () => {
  const C = course(f => {
    const root = f.source.targets.roots[0], low = structuredClone(root);
    low.id = 'low'; low.importance = 1; low.skills = ['b']; low.facets[0].skills = ['b'];
    f.source.targets.roots.push(low);
    f.activities.activities[2].tests[0].root = 'low'; f.activities.activities[2].tests[0].skill = 'b';
    root.facets.push({ id: 'build', standard: 'Build', skills: ['a'], anchors: [{ level: 3, standard: 'Build', criteria: ['correct', 'reason'] }] });
    root.anchors[0].facets.push('build');
    const delayed = f.activities.activities[3]; delayed.tests[0].facet = 'build';
    delayed.delay = { activity: 'task-1', root: 'simple', days: 2, after: 'qualifying-evidence-or-repair' };
    f.activities.activities.push({ ...structuredClone(delayed), id: 'task-4', group: 'other-retention' });
  });
  const rows = [...await attempt(C, 0, 10, 'pass'), ...await attempt(C, 1, 20, 'pass')];
  const verified = new Set(rows.filter(r => r.event === 'activity-evaluation').map(r => r.id));
  const settings = { availableSeconds: 80, starvationLimit: 1 };
  assert.deepEqual(ids((await plan(C, rows, settings, verified)).queue), ['task-3']);
  const previousRetention = await attempt(C, 4, 3 * DAY, 'unobserved');
  const p = await plan(C, [...rows, ...previousRetention], settings, verified);
  assert.deepEqual(ids(p.queue), ['task-2']);
  assert.ok(p.actions.find(a => a.id === 'task-3').status === 'deferred');
});

test('deterministic packing includes total upper bounds and never overspends or mutates policy', async () => {
  const C = course(), p = await plan(C, [], { availableSeconds: 170 });
  assert.equal(p.queue.length, 2);
  assert.equal(p.remainingSeconds, 10);
  assert.equal(p.actions.filter(a => a.status === 'deferred').length, 2);
  assert.deepEqual(await plan(C, [], { availableSeconds: 170 }), p);
  assert.deepEqual((await plan(C, [], { availableSeconds: 0 })).queue, []);
  const chosen = selectScored(Object.values(C.questionBank), [], { frontier: p.frontier });
  assert.ok(chosen.scores.every(s => p.queue.some(a => a.question === s.id)));
  const novice = await plan(C, [], { exposure: new Set(), lessonTiming: { 's1-1': [10, 20] } });
  assert.equal(selectScored(Object.values(C.questionBank), [], { frontier: novice.frontier }).action, 'stop');
});

test('measured intervals pause interruptions; reported and authored/observed ranges preserve provenance', () => {
  const t = measuredActivityTiming([{ phase: 'setup', start: 1000, end: 2000 }, { phase: 'active', start: 5000, end: 7000 }],
    { startedAt: 1000, endedAt: 10000, interrupted: true });
  assert.deepEqual(t, { activeMs: 2000, setupMs: 1000, wallMs: 9000, source: 'measured', interrupted: true });
  assert.throws(() => measuredActivityTiming([{ phase: 'active', start: 1, end: 5 }, { phase: 'active', start: 2, end: 8 }], { startedAt: 0, endedAt: 10 }), /nonoverlapping/);
  assert.equal(reportedActivityTiming().activeMs, null);
  assert.throws(() => reportedActivityTiming({ activeMs: 10, setupMs: 5, wallMs: 12 }), /reported/);
  const range = activityTimeRange([60, 120], [{ ms: 30000, source: 'external-report' }, { ms: 200000, source: 'measured' }]);
  assert.equal(range.lower, 30); assert.equal(range.upper, 200);
  assert.deepEqual(range.sources, ['authored', 'external-report', 'measured']);
  assert.equal(activityTimeRange(undefined, [{ ms: null }, { ms: 100, interrupted: true }]), null);
  assert.throws(() => activityTimeRange([-1, 10]), /range/);
});
