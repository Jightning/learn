const DAY = 864e5;
const facetOf = (projection, target) => projection.roots[target.root]?.anchors[target.anchor]?.facets[target.facet];
const satisfied = (projection, activity) => activity.tests.every(t => facetOf(projection, t)?.complete === true);

/** Pure opt-in frontier. Projection is the current verified S05 output, never
 * its provisional branch or a stored/learner-supplied summary. Times are seconds
 * for budgets, epoch milliseconds for observations and the injected clock. */
export function masteryFrontier(C, projection, options = {}) {
  if (!C?.mastery) return null;
  const { now, wave, availableSeconds, exposure = new Set(), environment = new Set(),
    exhausted = new Set(), placementLimit = 3 } = options;
  if (!C.activityIndex?.activities || !projection?.roots || !projection.activityGates)
    throw new Error('Current mastery projection and activity index required');
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(wave) || wave < 1 ||
      !Number.isFinite(availableSeconds) || availableSeconds < 0)
    throw new Error('Explicit clock, positive wave and nonnegative session seconds required');
  if (projection.now !== now) throw new Error('Rebuild the projection at the frontier clock');
  if (![exposure, environment, exhausted].every(s => s instanceof Set) ||
      !Number.isSafeInteger(placementLimit) || placementLimit < 0 || placementLimit > 10)
    throw new Error('Exposure/environment/inventory sets and placement limit 0–10 required');
  const activities = Object.values(C.activityIndex.activities), eligible = [], blocked = [],
    teaching = new Map(), placement = [], demonstrated = [], exploration = [];
  for (const activity of activities) {
    const reasons = [], add = (code, details = {}) => reasons.push({ code, ...details });
    if (activity.wave > wave) add('future-wave', { wave: activity.wave });
    for (const pre of activity.prerequisites) {
      // Higher demand does not imply this anchor unless the policy projection
      // has actually satisfied it through an explicit entailment rule.
      if (projection.roots[pre.root]?.anchors[pre.minAnchor]?.complete !== true)
        add('prerequisite-anchor', { ...pre });
    }
    for (const id of activity.after) if (!projection.activityGates[id] || projection.activityGates[id].ts > now)
      add('prior-activity', { activityId: id });
    if (activity.availability !== 'available') add('adapter-unavailable', { adapter: activity.adapter.id });
    const missing = (activity.environment?.capabilities || []).filter(id => !environment.has(id));
    if (missing.length) add('environment-unavailable', { capabilities: missing, fallback: activity.fallback ?? null });
    if (exhausted.has(activity.id)) add('exhausted-inventory');
    // Reserve the authored upper bound so a "short" session does not silently
    // assume best-case setup. Feedback sequencing belongs to S09.
    const active = activity.timing?.active, setup = activity.timing?.setup;
    if (!active || (activity.kind === 'external-lab' || activity.environment?.capabilities?.length) && !setup) add('unknown-duration');
    else {
      const seconds = active[1] + (setup?.[1] ?? 0);
      if (seconds > availableSeconds) add('session-too-short', { requiredSeconds: seconds });
    }
    if (activity.delay) {
      const source = C.activityIndex.activities[activity.delay.activity];
      const facets = source.tests.filter(t => t.root === activity.delay.root).map(t => facetOf(projection, t));
      const observations = facets.flatMap(f => f?.observations || []).filter(o => o.activityId === source.id && o.ts <= now);
      if (!observations.length || facets.some(f => !f?.observations?.some(o => o.activityId === source.id && o.ts <= now)))
        add('awaiting-delay-evidence', { activityId: source.id });
      else {
        const baseline = Math.max(...observations.map(o => o.ts), ...facets.map(f => f.baseline ?? 0));
        const readyAt = baseline + activity.delay.days * DAY;
        if (now < readyAt) add('waiting-for-delay', { readyAt });
      }
    }
    const observed = satisfied(projection, activity);
    if (observed) demonstrated.push(activity.id);
    exploration.push({ activityId: activity.id, lesson: activity.lesson, certificationEligible: reasons.length === 0 && exposure.has(activity.lesson) });
    // Placement bypasses exposure only; all hard eligibility gates still apply.
    if (!reasons.length && !observed && activity.kind === 'question' && activity.support === 'none' && !activity.delay)
      placement.push(activity);
    if (!exposure.has(activity.lesson)) {
      add('teaching-exposure', { lesson: activity.lesson });
      if (activity.wave <= wave && !reasons.some(r => r.code === 'prerequisite-anchor'))
        teaching.set(activity.lesson, { kind: 'teach', lesson: activity.lesson });
    }
    if (reasons.length) blocked.push({ activityId: activity.id, reasons });
    else eligible.push(activity);
  }
  // Bound probes across distinct root/facet/anchor demands before offering
  // another variant of the same gate. A probe alone never grants a skip.
  const covered = new Set(), probes = [];
  for (const activity of placement) {
    const keys = activity.tests.map(t => JSON.stringify([t.root, t.facet, t.anchor]));
    if (probes.length >= placementLimit || keys.every(k => covered.has(k))) continue;
    probes.push(activity); keys.forEach(k => covered.add(k));
  }
  return { eligible, blocked, teaching: [...teaching.values()], placement: probes, demonstrated, exploration };
}

/** Filter canonical bank IDs, including diagnostics, before breadth/ranking.
 * Unknown questions cannot enter an opt-in main path through a soft score. */
export function frontierQuestionPool(pool, frontier, { placement = false } = {}) {
  if (frontier == null) return pool;
  if (!Array.isArray(frontier.eligible) || !Array.isArray(frontier.placement)) throw new Error('Validated frontier required');
  const ids = new Set((placement ? frontier.placement : frontier.eligible).filter(a => a.kind === 'question').map(a => a.question));
  return pool.filter(q => ids.has(q.id));
}
