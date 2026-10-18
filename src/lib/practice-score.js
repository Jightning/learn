import { POLICY, exposedItems, orderEvents, skillsOf, skillState, isJoint, hasSupport, currentEvidence } from './evidence.js';

/* Coverage is a constraint; scores rank only within the eligible action tier.
 * This baseline makes no claim to estimate learning gain. */
export function selectScored(pool, rows, options = {}) {
  const { used = new Set(), types = {}, dueTypes = [], versions, goalPriorities, goalReasons,
    bank, standard, diagnostics = [], inventory = {}, now = Date.now() } = options;
  const candidates = pool.filter(q => !used.has(q.id) && !q.quarantined && (!q.use || q.use === 'practice'));
  if (!candidates.length) return { item: null, action: 'stop', reason: 'No suitable questions remain.', scores: [] };
  const typeOf = q => q.typeId || q.skills?.[0] || q.concept || q.id;
  const ids = [...new Set(candidates.flatMap(q => skillsOf(q).length ? skillsOf(q) : [typeOf(q)]))];
  const history = orderEvents(rows).filter(r => !versions || !Object.hasOwn(versions, r.itemId) || versions[r.itemId] === r.contentVersion || (bank?.[r.itemId] && currentEvidence(r, bank)));
  const states = Object.fromEntries(ids.map(id => [id, skillState(id, history, { bank, now, standard, skill: types[id] })]));
  const attempts = history.filter(r => r.event === 'attempt');
  const lastAt = id => attempts.filter(r => skillsOf(r).includes(id)).at(-1)?.ts || 0;
  const directAt = id => attempts.filter(r => skillsOf(r).includes(id) && !isJoint(r) && !r.skipped && !hasSupport(r) && (!r.demand || r.demand === 'standard')).at(-1)?.ts || 0;
  const count = id => attempts.filter(r => skillsOf(r).includes(id)).length;
  const unsampled = ids.filter(id => !states[id].coverage.sampled);
  const breadth = (unsampled.length ? unsampled : ids).sort((a, b) => Number(count(a)>0)-Number(count(b)>0) ||
    (unsampled.length ? lastAt(a)-lastAt(b) : directAt(a)-directAt(b)) || a.localeCompare(b));
  const last = attempts.at(-1), lastId = last?.typeId || options.lastType;
  let streak = 0;
  for (let i = attempts.length-1; i >= 0 && skillsOf(attempts[i]).includes(lastId); i--) streak++;
  const coverageTurn = !!unsampled.length || attempts.length % POLICY.coverageEvery === 0 || streak >= POLICY.repairBudget;
  const failing = ids.filter(id => states[id].misses >= POLICY.repairMisses && !(id === lastId && streak >= POLICY.repairBudget));
  const jointFailure = [...attempts].reverse().find(r => isJoint(r) && r.firstUnaided === false && !r.skipped);
  const atomicSupported = id => states[id].coverage.missingIntegrations.length ? skillState(id, history, { bank, now, skill: types[id],
    standard: { ...standard, requirements: { ...standard?.requirements, integrations: [] } } }).supported : states[id].supported;
  const ambiguous = jointFailure ? skillsOf(jointFailure).filter(id => ids.includes(id) && !atomicSupported(id) && lastAt(id) <= jointFailure.ts) : [];
  let target = coverageTurn ? breadth[0] : ambiguous.length ? ambiguous.sort((a, b) => states[a].p-states[b].p)[0] :
    failing.sort((a, b) => states[a].p-states[b].p)[0] || dueTypes.find(id => ids.includes(id)) ||
    ids.filter(id => !states[id].ready).sort((a, b) => states[a].p-states[b].p || directAt(a)-directAt(b))[0] || breadth[0];
  // A repeatedly failing skill cannot consume the next breadth opportunity.
  if (streak >= POLICY.repairBudget && ids.length > 1 && target === lastId) target = breadth.find(id => id !== lastId);
  const state = states[target];
  let action = coverageTurn ? 'coverage' : ambiguous.includes(target) ? 'diagnose' : failing.includes(target) ? 'repair' : dueTypes.includes(target) || state.stale ? 'review' : 'practice';
  if (ids.length === 1 && streak >= POLICY.repairBudget && state.misses >= POLICY.repairMisses) action = 'teach';
  const exposed = exposedItems(history);
  const scores = candidates.map(item => {
    const id = typeOf(item), s = states[id] || states[skillsOf(item)[0]], deps = types[id]?.requires || [];
    const prerequisite = deps.length ? .8+.2*deps.filter(dep => skillState(dep, history, { bank, now }).supported).length/deps.length : 1;
    const newGroup = !s.practice.some(r => (r.group || `${id}:unknown`) === (item.group || `${id}:unknown`));
    const independent = !exposed.has(item.id) && newGroup;
    const targetDemand = options.demandPreference || (state.misses >= POLICY.repairMisses && action === 'repair' ? 'foundation' : 'standard');
    const demandMatch = (item.demand || 'standard') === targetDemand;
    const scope = skillsOf(item).includes(target) || id === target;
    // Mandatory coverage gets equal opportunity regardless of response duration.
    const score = (independent ? 8 : !exposed.has(item.id) ? 4 : 0) +
      (!isJoint(item) ? 2 : 0) + (demandMatch ? 2 : 0) + (dueTypes.includes(id) ? 1 : 0) +
      (goalPriorities?.[id] || 0) + prerequisite + (!s.coverage.sampled ? 1 : 1-s.p);
    return { item, id: item.id, typeId: id, score, prerequisite, scope, preference: !!options.demandPreference && demandMatch };
  }).sort((a, b) => Number(b.scope)-Number(a.scope) || Number(b.preference)-Number(a.preference) || b.score-a.score || a.id.localeCompare(b.id));
  let selected = scores[0].item;
  const diagnosticIds = inventory[target]?.diagnose || [];
  if (action === 'repair') {
    const diagnostic = diagnosticIds.map(id => diagnostics.find(q => q.id === id)).find(q => q && !used.has(q.id) && !exposed.has(q.id));
    if (diagnostic) { selected = diagnostic; action = 'diagnose'; }
  }
  // Completion tasks must be scheduled explicitly: an endless supply of
  // atomic variants cannot satisfy a missing representation or integration.
  const missingSets = [...new Map(Object.values(states).flatMap(s => s.coverage.missingIntegrations.concat(s.stale ? s.coverage.missingFreshIntegrations : []))
    .map(set => [[...set].sort().join('+'), set])).values()];
  const requiredReps = ids.flatMap(id => [...new Set(states[id].coverage.missingRepresentations.concat(states[id].stale ? states[id].coverage.missingFreshRepresentations : []))].map(representation => ({ id, representation })));
  const standardItem = q => !q.routes?.length && !hasSupport(q) && (!q.demand || q.demand === 'standard');
  const repItems = requiredReps.map(requirement => ({ ...requirement, items: candidates.filter(q => standardItem(q) &&
    !isJoint(q) && skillsOf(q).includes(requirement.id) && q.representation === requirement.representation) }));
  const integratedItems = missingSets.map(skills => ({ skills, items: candidates.filter(q => standardItem(q) &&
    isJoint(q) && skills.every(id => skillsOf(q).includes(id))) }));
  const contentGaps = [...repItems.filter(r => !r.items.length).map(r => `representation:${r.id}:${r.representation}`),
    ...integratedItems.filter(r => !r.items.length).map(r => `integration:${[...r.skills].sort().join('+')}`)];
  if (!unsampled.length && !['repair', 'diagnose', 'teach'].includes(action) &&
      (!options.demandPreference || options.demandPreference === 'standard')) {
    const fresh = items => [...items].sort((a, b) => Number(exposed.has(a.id))-Number(exposed.has(b.id)) || a.id.localeCompare(b.id));
    const rep = repItems.find(r => r.items.length);
    const integration = integratedItems.find(r => r.items.length);
    if (rep) { selected = fresh(rep.items)[0]; action = 'transfer'; }
    else if (integration) { selected = fresh(integration.items)[0]; action = 'integrate'; }
  }
  const help = (action === 'repair' || action === 'diagnose' || action === 'teach') ? {
    skillId: target, teach: types[target]?.teach || [], prerequisites: types[target]?.requires || [],
    message: action !== 'diagnose' ? 'Review the teaching, try supported practice, then check a fresh independent task.' : 'Use a focused task to identify the missing component.' } : null;
  const reasons = { coverage: 'Broaden coverage', diagnose: 'Focused diagnostic after recent difficulty',
    repair: 'Repair after repeated difficulty', teach: 'Pause for teaching after repeated difficulty', review: 'Due for review', practice: 'Independent practice', transfer: 'Sample a required representation', integrate: 'Check required combined skills' };
  return { item: selected, action, help, contentGaps, reason: goalReasons?.[target] || reasons[action],
    coverageDebt: ids.filter(id => !states[id].coverage.sampled),
    recommendedStop: ids.every(id => states[id].ready && !states[id].coverage.missingRepresentations.length && !states[id].coverage.missingIntegrations.length) && !dueTypes.some(id => ids.includes(id)),
    policyVersion: POLICY.version,
    scores: scores.map(({ id, typeId, score, prerequisite }) => ({ id, typeId, score, prerequisite })) };
}
/* Preserve the requested set length and distinct IDs when a live decision
 * pulls an item that the baseline had placed later in the same session. */
export function placeSelection(items, at, selected, reserved = new Set()) {
  if (!selected || at >= items.length || reserved.has(items[at].id) || items[at].id === selected.id ||
    items.slice(0, at).some(q => q.id === selected.id)) return items;
  const next = [...items], later = next.findIndex((q, i) => i > at && q.id === selected.id);
  if (later >= 0) next[later] = next[at];
  next[at] = selected;
  return next;
}
