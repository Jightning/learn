import { masteryFrontier } from './mastery-frontier.js';
import { validateActivityHistory } from './activity-events.js';
import { activityTimeRange } from './activity-timing.js';

const demands = a => a.tests.map(t => JSON.stringify([t.root, t.facet, t.anchor]));
const related = (a, b) => demands(a).some(key => demands(b).includes(key));
const stage = a => a.delay ? 'delayed' : a.kind === 'external-lab' ? 'practical' :
  a.kind === 'written-defense' ? 'defense' : a.support !== 'none' ? 'guided' : 'independent';
const order = { teach: 0, guided: 1, independent: 2, practical: 3, defense: 4, delayed: 5 };
const zero = Object.freeze({ lower: 0, typical: 0, upper: 0, sources: Object.freeze(['not-applicable']) });

function historyState(C, rows) {
  const submissions = new Map(), evaluations = new Map(), contexts = new Map(), byId = new Map(rows.map(r => [r.id, r]));
  for (const row of rows) {
    if (row.event === 'activity-submission') { submissions.set(row.id, row); contexts.set(row.id, row); }
    if (row.event === 'activity-context-revision') contexts.set(row.submissionId, row);
    if (row.event === 'activity-evaluation') evaluations.set(row.submissionId, row);
  }
  return { submissions, evaluations, contexts, byId, activity: sub => C.activityIndex.activities[sub.request.activityId] };
}

function sequenceGates(activities) {
  const gates = new Map(activities.map(a => [a.id, [...a.after]])), added = new Map(activities.map(a => [a.id, []]));
  const depends = (id, other, seen = new Set()) => {
    if (id === other) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return gates.get(id).some(pre => depends(pre, other, seen));
  };
  for (const a of activities) for (const before of activities) {
    // Authored chains can deliberately return to guided repair after defense.
    // Supplement the DAG only when the new edge cannot reverse that chain.
    if (before.required && before.lesson === a.lesson && related(before, a) &&
        order[stage(before)] < order[stage(a)] && !before.delay && !depends(before.id, a.id) && !depends(a.id, before.id)) {
      gates.get(a.id).push(before.id); added.get(a.id).push(before.id);
    }
  }
  return added;
}

function timingFor(a, history, rows) {
  const samples = [...history.submissions.values()].filter(s => s.request.activityId === a.id).map(s => history.contexts.get(s.id).timing);
  const feedback = rows.filter(r => r.event === 'activity-feedback' && r.timing &&
    history.submissions.get(history.byId.get(r.evaluationId)?.submissionId)?.request.activityId === a.id).map(r => r.timing);
  const range = (key, values, field) => activityTimeRange(a.timing?.[key], values.map(t => ({ ...t, ms: t[field] })));
  const active = range('active', samples, 'activeMs');
  const setup = a.timing?.setup || a.kind === 'external-lab' || a.environment?.capabilities?.length || samples.some(t => t.setupMs > 0) ? range('setup', samples, 'setupMs') : zero;
  const response = range('feedback', feedback, 'activeMs');
  return { active, setup, feedback: response, total: active && setup && response ? {
    lower: active.lower + setup.lower + response.lower,
    typical: active.typical + setup.typical + response.typical,
    upper: active.upper + setup.upper + response.upper
  } : null };
}

function repairState(a, history, rows) {
  const relevant = [...history.submissions.values()].filter(s => related(a, history.activity(s)));
  let failures = 0, lastPass = -1, failureAt = -1;
  // Count attempts once, using the latest correction. Infrastructure trouble
  // and unobserved criteria cannot be turned into observed skill failures.
  for (const s of relevant) {
    const e = history.evaluations.get(s.id);
    if (!e || e.result.status !== 'complete') continue;
    const tested = e.result.criteria.filter(c => a.tests.some(t => t.root === c.root && t.facet === c.facet && t.anchor === c.anchor));
    if (tested.some(c => c.outcome === 'fail')) { failures++; failureAt = Math.max(failureAt, e.ts); }
    else if (tested.length && tested.every(c => c.outcome === 'pass')) {
      failures = 0; lastPass = Math.max(lastPass, e.ts);
    }
  }
  const ids = new Set(relevant.map(s => s.id));
  const repairs = rows.filter(r => r.event === 'activity-feedback' && r.repair && r.ts > lastPass &&
    ids.has(history.byId.get(r.evaluationId)?.submissionId));
  return { failures, failureAt, repairs, stop: failures >= 2 || repairs.length >= 3,
    needsRepair: failures > 0 && !repairs.some(r => r.ts >= failureAt) };
}

/** Pure opt-in next-session plan. Rows are current compatible, effective S06
 * history in course-code form, without reset/voided records or storage metadata.
 * Only the verified projection can skip gates; reports may slow the path only. */
export async function masteryActionPlan(C, projection, rows, options = {}, errors = []) {
  if (!C?.mastery) return null;
  const { now, availableSeconds, lessonTiming = {}, allocation = { coding: .5, retention: .3, breadth: .2 },
    starvationLimit = 5, placement = false } = options;
  if (!Number.isSafeInteger(starvationLimit) || starvationLimit < 1 || typeof placement !== 'boolean' ||
      !lessonTiming || typeof lessonTiming !== 'object' || Array.isArray(lessonTiming) ||
      !allocation || typeof allocation !== 'object' || Object.keys(allocation).sort().join() !== 'breadth,coding,retention' ||
      !Object.values(allocation).every(n => Number.isFinite(n) && n >= 0) ||
      Math.abs(Object.values(allocation).reduce((s, n) => s + n, 0) - 1) > 1e-9)
    throw new Error('Valid allocation, teaching timing and starvation policy required');
  // Resolve hard eligibility without time filtering first: observed durations
  // may fill missing authored estimates, but cannot relax any other gate.
  const frontier = masteryFrontier(C, projection, { ...options, availableSeconds: Number.MAX_VALUE });
  if (!Number.isFinite(availableSeconds) || availableSeconds < 0) throw new Error('Explicit session seconds required');
  const valid = await validateActivityHistory(rows, C, errors);
  if (!valid) return null;
  const current = valid.filter(r => r.ts <= now), history = historyState(C, current);
  const activities = Object.values(C.activityIndex.activities), actions = [], skipped = [], sequence = sequenceGates(activities);
  const eligibleProbes = new Set(frontier.placement.map(a => a.id));
  const blockMap = new Map(frontier.blocked.map(b => [b.activityId, b.reasons]));
  const add = action => { action.status = action.reasons.length ? 'blocked' : 'ready'; actions.push(action); };
  const taught = new Map();
  for (const a of activities) {
    const demonstrated = frontier.demonstrated.includes(a.id);
    if (projection.activityGates[a.id] || demonstrated && a.kind === 'question' && !a.delay) {
      skipped.push({ activityId: a.id, reason: projection.activityGates[a.id] ? 'observed-completion' : 'demonstrated-demand' }); continue;
    }
    const reasons = (blockMap.get(a.id) || []).filter(r => r.code !== 'unknown-duration' &&
      !(placement && eligibleProbes.has(a.id) && r.code === 'teaching-exposure')).map(r => ({ ...r }));
    const repair = repairState(a, history, current);
    const matching = [...history.submissions.values()].filter(s => s.request.activityId === a.id);
    const pending = matching.at(-1);
    if (pending && !history.evaluations.has(pending.id)) reasons.push({ code: 'awaiting-review', submissionId: pending.id });
    const result = pending && history.evaluations.get(pending.id);
    if (result && result.result.status !== 'complete') reasons.push({
      code: result.result.status === 'execution-error' ? 'execution-error' : result.result.status === 'unavailable' ? 'review-unavailable' : 'awaiting-review',
      nextAction: result.result.status === 'execution-error' ? 'check-environment' : 'request-review' });
    else if (result && !result.result.criteria.some(c => c.outcome === 'fail'))
      reasons.push({ code: 'awaiting-review', nextAction: 'verify-result' });
    if (repair.stop) reasons.push({ code: 'repair-limit', nextAction: 'request-review' });
    else if (repair.needsRepair) reasons.push({ code: 'repair-needed', nextAction: 'explanation' });
    // Implicit sequence supplements explicit authored edges only within the
    // same lesson/demand. It never invents a practical requirement or a pass.
    for (const id of sequence.get(a.id)) if (!projection.activityGates[id] &&
        !(frontier.demonstrated.includes(id) && C.activityIndex.activities[id].kind === 'question'))
      reasons.push({ code: 'sequence-gate', activityId: id });
    const timing = timingFor(a, history, current);
    if (!timing.total) reasons.push({ code: 'unknown-duration', phases: ['active', 'setup', 'feedback'].filter(k => !timing[k]) });
    else if (timing.total.upper > availableSeconds) reasons.push({ code: 'session-too-short', requiredSeconds: timing.total.upper });
    const lastIndex = current.findLastIndex(r => r.event === 'activity-submission' && r.request.activityId === a.id);
    const waited = current.slice(lastIndex + 1).filter(r => r.event === 'activity-submission').length;
    const importance = Math.max(...a.tests.map(t => C.mastery.roots[t.root].importance));
    const unlocks = activities.filter(b => b.after.includes(a.id) || b.prerequisites.some(p => a.tests.some(t => t.root === p.root && t.anchor === p.minAnchor))).length;
    const category = a.delay ? 'retention' : a.tests.some(t => ['build', 'debug'].includes(t.facet)) || a.kind === 'external-lab' ? 'coding' : 'breadth';
    add({ id: a.id, activityId: a.id, lesson: a.lesson, question: a.question ?? null, kind: stage(a),
      required: a.required, support: a.support, placement: placement && eligibleProbes.has(a.id), timing, category, importance, unlocks,
      waited, starved: a.required && waited >= starvationLimit, reasons });
    const exposure = reasons.some(r => r.code === 'teaching-exposure');
    if ((exposure || repair.needsRepair || repair.stop) && a.wave <= options.wave &&
        !reasons.some(r => r.code === 'prerequisite-anchor' || r.code === 'prior-activity' || r.code === 'sequence-gate')) {
      const kind = repair.stop ? 'request-review' : repair.needsRepair ? 'repair' : 'teach';
      const key = `${kind}:${a.lesson}`;
      if (!taught.has(key)) {
        const reading = current.filter(r => r.event === 'activity-feedback' && r.timing &&
          ['explanation', 'representation'].includes(r.repair) &&
          history.submissions.get(history.byId.get(r.evaluationId)?.submissionId) &&
          history.activity(history.submissions.get(history.byId.get(r.evaluationId).submissionId)).lesson === a.lesson);
        const active = activityTimeRange(lessonTiming[a.lesson], reading.map(r => ({ ...r.timing, ms: r.timing.activeMs })));
        const time = { active, setup: zero, feedback: zero, total: active };
        const why = !active ? [{ code: 'unknown-duration', phases: ['active'] }] : active.upper > availableSeconds ?
          [{ code: 'session-too-short', requiredSeconds: active.upper }] : [];
        // Review is a human next action, never a timed activity to repeat.
        taught.set(key, { id: key, lesson: a.lesson, kind, required: a.required, timing: time, category: 'breadth',
          importance, unlocks, waited, starved: a.required && waited >= starvationLimit,
          reasons: kind === 'request-review' ? [{ code: 'awaiting-review', nextAction: 'request-review' }] : why });
      }
    }
  }
  for (const a of taught.values()) add(a);
  const candidates = actions.filter(a => a.status === 'ready');
  // Ready retention gets first refusal. Starvation beats importance, then
  // prerequisites and required practical gaps beat optional breadth.
  const compare = (a, b) => Number(b.starved) - Number(a.starved) ||
    (a.starved && b.starved ? b.waited - a.waited || a.id.localeCompare(b.id) : 0) || Number(b.required) - Number(a.required) ||
    b.unlocks - a.unlocks || (order[a.kind] ?? 0) - (order[b.kind] ?? 0) || b.importance - a.importance || a.id.localeCompare(b.id);
  candidates.sort(compare);
  const queue = [], spent = { coding: 0, retention: 0, breadth: 0 };
  const lastSubmission = [...history.submissions.values()].at(-1);
  const lastWasRetention = lastSubmission && !!history.activity(lastSubmission).delay;
  let remainingSeconds = availableSeconds;
  while (true) {
    const fits = candidates.filter(a => !queue.includes(a) && a.timing.total.upper <= remainingSeconds);
    if (!fits.length) break;
    // A one-action session cannot reserve both kinds. After a retention session,
    // give overdue required breadth its turn rather than starving it forever.
    let next = queue.length === 0 && lastWasRetention ? fits.find(a => a.starved && a.category !== 'retention') : null;
    next ||= queue.length === 0 ? fits.filter(a => a.category === 'retention').sort((a, b) => b.importance - a.importance || compare(a, b))[0] : null;
    next ||= fits.find(a => a.starved);
    if (!next) {
      const category = Object.keys(spent).filter(k => fits.some(a => a.category === k))
        .sort((a, b) => (allocation[b] * availableSeconds - spent[b]) - (allocation[a] * availableSeconds - spent[a]))[0];
      next = fits.find(a => a.category === category);
    }
    queue.push(next); spent[next.category] += next.timing.total.upper; remainingSeconds -= next.timing.total.upper;
  }
  const queued = new Set(queue.map(a => a.id));
  for (const a of candidates) if (!queued.has(a.id)) { a.status = 'deferred'; a.reasons.push({ code: 'session-capacity', requiredSeconds: a.timing.total.upper }); }
  // Downstream question ranking must obey sequencing and the packed budget,
  // not the unlimited-time frontier used internally to inspect hard gates.
  const selection = { ...frontier,
    eligible: activities.filter(a => queued.has(a.id) && !(blockMap.get(a.id) || []).some(r => r.code === 'teaching-exposure')),
    placement: frontier.placement.filter(a => queued.has(a.id)),
    teaching: frontier.teaching.filter(a => queued.has(`teach:${a.lesson}`)),
    blocked: actions.filter(a => a.activityId && a.reasons.length).map(a => ({ activityId: a.activityId, reasons: a.reasons })),
    exploration: frontier.exploration.map(a => ({ ...a, certificationEligible: a.certificationEligible && queued.has(a.activityId) }))
  };
  return { now, frontier: selection, actions, queue, skipped, remainingSeconds, spent, allocation: { ...allocation } };
}
