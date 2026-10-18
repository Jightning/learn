import { POLICY, exposedItems, skillsOf, skillState, isJoint, hasSupport } from './evidence.js';
/* Confirmation selects an applicable standard; only observations supply evidence. */
export function checkCandidates(idx, blueprint, rows, now = Date.now()) {
  if (!blueprint) return { items: [], missing: [], reason: 'No applicable assessment standard.' };
  const exposed = exposedItems(rows), selected = new Map(), missing = new Set(), inventoryGaps = [];
  const candidates = (idx.CHECK || []).filter(q => !exposed.has(q.id) && !q.quarantined &&
    !hasSupport(q) && (!q.demand || q.demand === 'standard'));
  const states = Object.fromEntries(blueprint.types.map(id => [id,
    skillState(id, rows, { bank: idx.BANK, now, standard: blueprint, skill: idx.TYPES?.[id] })]));
  const choose = q => { selected.set(q.id, q); return q; };
  for (const id of blueprint.types) {
    const state = states[id];
    if (state.ready) continue;
    const groups = new Set(state.practice.map(r => r.group || `${id}:unknown`));
    const atomic = candidates.filter(q => skillsOf(q).includes(id) && !isJoint(q));
    const chosen = [];
    const take = predicate => {
      const q = atomic.find(q => !selected.has(q.id) && !groups.has(q.group || `${id}:unknown`) && predicate(q));
      if (q) { groups.add(q.group || `${id}:unknown`); chosen.push(choose(q)); }
      return q;
    };
    const representations = [...new Set([...state.coverage.missingRepresentations, ...state.coverage.missingFreshRepresentations])];
    for (const representation of representations) if (!take(q => q.representation === representation)) {
      missing.add(id); inventoryGaps.push(`representation:${id}:${representation}`);
    }
    // Joint questions never fill the independent atomic-task minimum.
    const needed = Math.max(0, POLICY.minimumIndependent-state.coverage.freshIndependent);
    while (chosen.length < needed && take(() => true)) { /* bounded by inventory */ }
    if (chosen.length < needed) { missing.add(id); inventoryGaps.push(`independent:${id}`); }
  }
  const sets = [...new Map(Object.values(states).flatMap(state =>
    [...state.coverage.missingIntegrations, ...state.coverage.missingFreshIntegrations])
    .map(set => [[...set].sort().join('+'), set])).values()];
  for (const skills of sets) {
    const task = candidates.find(q => isJoint(q) && !q.routes?.length && skills.every(id => skillsOf(q).includes(id)) &&
      skills.every(id => !states[id]?.practice.some(r => (r.group || `${id}:unknown`) === (q.group || `${id}:unknown`))));
    if (task) choose(task);
    else { skills.forEach(id => missing.add(id)); inventoryGaps.push(`integration:${[...skills].sort().join('+')}`); }
  }
  return { items: [...selected.values()], missing: [...missing], inventoryGaps,
    reason: missing.size ? 'Fresh independent check inventory is insufficient. Useful practice remains available.' : null };
}

export function readiness(blueprint, rows, { confirmedVersion, bank, now = Date.now() } = {}) {
  if (!blueprint || confirmedVersion !== blueprint.version) return { ready: false, label: 'Readiness needs an applicable confirmed standard.', gaps: [] };
  const states = Object.fromEntries(blueprint.types.map(id => [id, skillState(id, rows, { bank, now, standard: blueprint })]));
  const scores = {}, gaps = [], contradictions = [], outcomes = {}, adequacy = {};
  let aggregate = 0;
  for (const id of blueprint.types) {
    const state = states[id];
    const fresh = state.observations.filter(r => now-r.ts <= POLICY.freshnessDays*864e5);
    const representations = new Set(fresh.map(r => r.representation).filter(Boolean));
    const requiredRepresentations = blueprint.requirements?.representations?.[id] || [];
    const missingRepresentations = requiredRepresentations.filter(rep => !representations.has(rep));
    // Formal assessment measures observed performance after adequate sampling.
    // Learn-by's supported requirement remains a stricter successful claim.
    // Integrations have no duplicate component weight. Their fresh success is
    // an explicit gate so atomic scores cannot hide failed coordination.
    const adequate = fresh.length >= POLICY.minimumIndependent && fresh.some(r => r.methodCued === false || r.context === 'check') &&
      !missingRepresentations.length && !state.coverage.missingFreshIntegrations.length;
    adequacy[id] = { adequate, independent: fresh.length, missingRepresentations,
      missingIntegrations: state.coverage.missingFreshIntegrations };
    if (!adequate) gaps.push(id);
    if (state.contradictions.length) contradictions.push(id);
    if (adequate) {
      const recent = fresh.slice(-POLICY.window);
      scores[id] = recent.filter(r => r.firstUnaided).length/recent.length;
    }
    aggregate += (blueprint.typeWeights[id] || 0)*(scores[id] || 0);
  }
  for (const [id, outcome] of Object.entries(blueprint.outcomes || {})) {
    const assessed = outcome.types.every(t => t in scores);
    const score = assessed ? outcome.types.reduce((n, t) => n+(blueprint.typeWeights[t] || 0)*scores[t], 0)/outcome.weight : null;
    outcomes[id] = { score, essential: outcome.essential, floor: outcome.floor };
    if (!assessed || (outcome.essential && score < (outcome.floor ?? .8))) gaps.push(id);
  }
  const evidence = [...new Map(Object.values(states).flatMap(s => s.observations).map(r => [r.id, r])).values()];
  const ready = !gaps.length && aggregate >= blueprint.target;
  return { ready, score: aggregate, scores, states, adequacy, outcomes, gaps, contradictions,
    evidenceKey: evidence.map(r => r.id).sort().join('|'), confirmed: true,
    label: ready ? 'Meets the confirmed assessment criteria; delayed retention is separate.' : 'Required sampling or assessment performance does not yet meet the confirmed criteria.',
    selfAssessed: Object.values(states).some(s => s.practice.some(r => r.selfChecked)) };

}
