import { validateActivityEvents, validateActivityHistory } from "./activity-events.js";

const DAY = 864e5;
const keyOf = (...parts) => JSON.stringify(parts);
const assisted = row => row.assistance.answerExposed || row.assistance.sources.length > 0;
const blank = () => ({ checks: [], delayed: [], baseline: null, contradictions: [], seen: new Set(), historical: false });

// Entailment is explicit, descending and transitive. A high percentage or merely
// attempting a higher-demand task never supplies a lower anchor observation.
function entails(policy, from, to) {
  if (from === to) return true;
  return policy.entails.some(rule => rule.from === from && (rule.to === to || entails(policy, rule.to, to)));
}
function ready(state, policy) {
  return state.baseline !== null && state.delayed.length === policy.delayDays.length;
}
function facetView(state, policy) {
  const complete = ready(state, policy);
  return { complete, historical: state.historical, groups: new Set(state.checks.map(x => x.group)).size,
    sessions: new Set(state.checks.map(x => x.session)).size, baseline: state.baseline?.ts ?? null,
    delayed: state.delayed.map(x => ({ days: x.days, submissionId: x.submissionId, ts: x.ts })),
    missingDelayDays: policy.delayDays.slice(state.delayed.length),
    contradictions: complete ? [] : [...state.contradictions],
    evidence: state.checks.map(x => x.submissionId),
    observations: state.checks.map(({ activityId, submissionId, ts }) => ({ activityId, submissionId, ts })) };
}
function anchorComplete(root, level, states, policy) {
  return root.anchors[level].facets.every(facet => ready(states[keyOf(root.id, facet, Number(level))], policy));
}

function project(C, rows, verified, provisional) {
  const states = {}, submissions = new Map(), independent = new Map(), supported = new Set();
  const seenTasks = new Set(), seenGroups = new Set(), historical = {};
  const roots = Object.values(C.mastery.roots);
  for (const root of roots) {
    historical[root.id] = new Set();
    for (const [level, anchor] of Object.entries(root.anchors)) for (const facet of anchor.facets)
      states[keyOf(root.id, facet, Number(level))] = blank();
  }
  // Late disclosures can retract credit, but cannot remove earlier assistance.
  for (const row of rows) if ((row.event === "activity-submission" || row.event === "activity-context-revision") && assisted(row))
    supported.add(row.submissionId ?? row.id);
  for (const row of rows) {
    if (row.event === "activity-submission") {
      submissions.set(row.id, row);
      const activity = C.activityIndex.activities[row.request.activityId];
      const tasks = [keyOf("activity", activity.id), keyOf("input", row.request.submissionHash)];
      if (activity.question) tasks.push(keyOf("question", activity.question));
      const targets = activity.tests.map(t => keyOf(t.root, t.facet, t.anchor, activity.group));
      independent.set(row.id, !tasks.some(t => seenTasks.has(t)) && !targets.some(t => seenGroups.has(t)));
      tasks.forEach(t => seenTasks.add(t)); targets.forEach(t => seenGroups.add(t));
      continue;
    }
    if (row.event !== "activity-evaluation" || (!provisional && !verified.has(row.id)) || row.result.status !== "complete") continue;
    const submission = submissions.get(row.submissionId), activity = C.activityIndex.activities[submission.request.activityId];
    for (const root of roots) {
      const policy = C.mastery.policies[root.policy];
      for (const [level, anchor] of Object.entries(root.anchors)) for (const facet of anchor.facets) {
        const state = states[keyOf(root.id, facet, Number(level))];
        const required = root.facets[facet].anchors[level].criteria;
        // Each qualified native skill must stand on its own observation. Never
        // combine partial observations from different skills to invent a pass.
        const targets = activity.tests.filter(t => t.root === root.id && t.facet === facet && entails(policy, t.anchor, Number(level)));
        let pass = false, failure = false, unfamiliar = false;
        for (const target of targets) {
          const observations = row.result.criteria.filter(c => c.root === root.id && c.facet === facet && c.skill === target.skill && c.anchor === target.anchor);
          const outcomes = new Map(observations.map(c => [c.criterion, c.outcome]));
          const critical = required.filter(id => policy.criteria[id].critical);
          const noncritical = required.filter(id => !policy.criteria[id].critical);
          const observed = required.every(id => ["pass", "fail"].includes(outcomes.get(id)));
          // No noncritical criteria means that gate is satisfied; unobserved
          // criteria remain gaps rather than shrinking the denominator.
          const fraction = noncritical.length ? noncritical.filter(id => outcomes.get(id) === "pass").length / noncritical.length : 1;
          // Passing higher demand may entail a lower anchor. Failing higher
          // demand does not prove failure at that lower level.
          failure ||= target.anchor === Number(level) && (critical.some(id => outcomes.get(id) === "fail") || observed && fraction < policy.noncriticalFloor);
          const qualifies = observed && critical.every(id => outcomes.get(id) === "pass") && fraction >= policy.noncriticalFloor;
          pass ||= qualifies;
          unfamiliar ||= qualifies && target.unfamiliarConstraint === true;
        }
        if (!targets.length) continue;
        const hadObservation = state.seen.has(submission.id);
        // A superseding review that withdraws an earlier observation cannot
        // leave its old credit active, even when it asserts no explicit failure.
        const withdrawn = row.supersedes && !pass && state.checks.some(x => x.submissionId === submission.id);
        if (failure || withdrawn) {
          state.checks = []; state.delayed = []; state.baseline = null;
          state.contradictions.push(row.id);
        }
        if (pass || failure) state.seen.add(submission.id);
        if (!pass || failure || hadObservation || !independent.get(submission.id) || supported.has(submission.id) || activity.support !== "none" || activity.availability !== "available") continue;
        const check = { submissionId: submission.id, activityId: activity.id, group: activity.group, session: submission.sessionId,
          ts: row.ts, committedAt: submission.ts, unfamiliar };
        state.checks.push(check);
        if (state.baseline === null) {
          if (new Set(state.checks.map(x => x.group)).size >= policy.minGroups &&
              new Set(state.checks.map(x => x.session)).size >= policy.minSessions &&
              (!policy.unfamiliarConstraint || state.checks.some(x => x.unfamiliar))) state.baseline = check;
        } else {
          const days = policy.delayDays[state.delayed.length], baseline = state.baseline;
          // Elapsed time is measured to commitment, never to a late review or
          // the current clock. Same-session clicks cannot prove delayed transfer.
          if (days !== undefined && check.session !== baseline.session &&
              check.committedAt >= baseline.ts + days * DAY)
            state.delayed.push({ ...check, days });
        }
        if (ready(state, policy)) state.historical = true;
      }
      for (const level of Object.keys(root.anchors)) if (anchorComplete(root, level, states, policy)) historical[root.id].add(Number(level));
    }
  }
  return Object.fromEntries(roots.map(root => {
    const policy = C.mastery.policies[root.policy];
    const anchors = Object.fromEntries(Object.entries(root.anchors).map(([level, anchor]) => [level,
      { complete: anchorComplete(root, level, states, policy),
        facets: Object.fromEntries(anchor.facets.map(facet => [facet, facetView(states[keyOf(root.id, facet, Number(level))], policy)])) }]));
    const satisfied = Object.keys(anchors).filter(level => anchors[level].complete).map(Number);
    return [root.id, { anchor: satisfied.length ? Math.max(...satisfied) : null,
      historicalAnchor: historical[root.id].size ? Math.max(...historical[root.id]) : null,
      complete: anchors[root.requiredAnchor].complete, anchors }];
  }));
}

/** Pure, opt-in projection at an explicit epoch time. Verification IDs are a
 * caller-owned authority boundary, NEVER imported course/event fields. S16 must
 * construct them only after independently checking bound evaluator receipts.
 * With no verifier, local results can describe provisional progress only.
 * Rows must belong to this resolved version snapshot; S06 owns retaining and
 * partitioning incompatible history rather than laundering it as current work. */
export async function projectMastery(C, rows, { now, verifiedEvaluationIds = new Set() } = {}, errors = []) {
  if (!C?.mastery) return null;
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Explicit nonnegative projection time required");
  if (!(verifiedEvaluationIds instanceof Set)) throw new Error("Caller-owned verification set required");
  const validated = await validateActivityEvents(rows, C, errors);
  if (!validated) return null;
  return projectValidated(C, validated, now, verifiedEvaluationIds);
}

/** Local persistence uses bounded, dependency-complete validation batches. */
export async function projectMasteryHistory(C, rows, { now, verifiedEvaluationIds = new Set() } = {}, errors = []) {
  if (!C?.mastery) return null;
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Explicit nonnegative projection time required");
  if (!(verifiedEvaluationIds instanceof Set)) throw new Error("Caller-owned verification set required");
  const validated = await validateActivityHistory(rows, C, errors);
  return validated ? projectValidated(C, validated, now, verifiedEvaluationIds) : null;
}

function projectValidated(C, validated, now, verifiedEvaluationIds) {
  const current = validated.filter(row => row.ts <= now);
  const roots = project(C, current, verifiedEvaluationIds, false);
  const provisional = project(C, current, verifiedEvaluationIds, true);
  const claims = Object.fromEntries(Object.values(C.mastery.roots).map(root => {
    const records = current.filter(row => row.event === "activity-claim" && row.root === root.id);
    return [root.id, { required: root.claimRequirement === "historical-evidence", status: records.at(-1)?.status ?? "unsubstantiated",
      verified: false, records }];
  }));
  return { now, roots, provisional, claims, activityGates: activityGates(C, current, verifiedEvaluationIds),
    complete: Object.values(roots).every(root => root.complete),
    historicalClaimsComplete: Object.values(claims).every(claim => !claim.required) };
}

// Sequence completion is an observed task result, distinct from independent
// mastery. Guided work may unlock its next step without supplying an anchor.
function activityGates(C, rows, verified) {
  const submissions = new Map(), latest = new Map();
  for (const row of rows) {
    if (row.event === "activity-submission") submissions.set(row.id, row);
    if (row.event === "activity-evaluation" && verified.has(row.id)) latest.set(row.submissionId, row);
  }
  const gates = {}, activityLatest = new Map();
  for (const [id, row] of latest) {
    const activity = C.activityIndex.activities[submissions.get(id).request.activityId];
    const previous = activityLatest.get(activity.id);
    if (!previous || previous[1].ts <= row.ts) activityLatest.set(activity.id, [id, row]);
  }
  for (const [activityId, [id, row]] of activityLatest) {
    const activity = C.activityIndex.activities[activityId];
    if (row.result.status !== "complete" || activity.availability !== "available") continue;
    const passed = activity.tests.every(target => {
      const policy = C.mastery.policies[C.mastery.roots[target.root].policy];
      const outcomes = new Map(row.result.criteria.filter(c => c.root === target.root && c.facet === target.facet &&
        c.skill === target.skill && c.anchor === target.anchor).map(c => [c.criterion, c.outcome]));
      const required = C.mastery.roots[target.root].facets[target.facet].anchors[target.anchor].criteria;
      const noncritical = required.filter(c => !policy.criteria[c].critical);
      return required.every(c => ["pass", "fail"].includes(outcomes.get(c))) &&
        required.filter(c => policy.criteria[c].critical).every(c => outcomes.get(c) === "pass") &&
        (!noncritical.length || noncritical.filter(c => outcomes.get(c) === "pass").length / noncritical.length >= policy.noncriticalFloor);
    });
    if (passed && (!gates[activity.id] || gates[activity.id].ts < row.ts))
      gates[activity.id] = { submissionId: id, evaluationId: row.id, ts: row.ts };
  }
  return gates;
}
