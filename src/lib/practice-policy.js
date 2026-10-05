import { get as retentionGet } from "./retention.js";
import { POLICY, recentPerformance, exposedItems, provisionalDemonstrations } from './evidence.js';
/* Promotion is deliberately off until the controlled learner comparison. */
export const adaptiveEnabled = policy => policy.experimental === true;
export function duePracticeTypes(pool, cid, lookup = retentionGet, now = Date.now()) {
  return [...new Set(pool.filter(q=>!q.use || q.use === 'practice').filter(q=>{
    const schedule = lookup(cid,q.typeId ? `type:${q.typeId}` : q.concept);
    return schedule?.reps > 0 && (!schedule.dueAt || schedule.dueAt <= now);
  }).map(q=>q.typeId || q.concept || q.id))];
}
export function selectAdaptive(pool, rows, policy = {}, used = new Set(), dueTypes = [], blueprint = null, versions = null, diagnostics = [], inventory = {}) {
  const candidates = pool.filter(q => !used.has(q.id) && (!q.use || q.use === 'practice'));
  if (!candidates.length) return { item: null, reason: 'No suitable questions remain.', policy };
  const types = [...new Set(candidates.map(q => q.typeId || q.concept || q.id))];
  const perf = Object.fromEntries(types.map(t => [t, recentPerformance(rows, t, versions)]));
  const turn = policy.actions || 0;
  const indirect = provisionalDemonstrations(rows);
  const outcomeOf = t => Object.entries(blueprint?.outcomes || {}).find(([,o])=>o.types.includes(t))?.[0] || t;
  const unresolved = types.filter(t=>policy.unresolvedOutcomes?.includes(outcomeOf(t)) || perf[t].fraction == null || perf[t].fraction < (blueprint?.outcomes?.[outcomeOf(t)]?.floor ?? 0.8) || Date.now()-perf[t].last > POLICY.freshnessDays*864e5);
  const rotated = [...(unresolved.length ? unresolved : types)].sort((a,b) => (policy.coverage?.[outcomeOf(a)] || 0)-(policy.coverage?.[outcomeOf(b)] || 0) || a.localeCompare(b));
  let type, reason;
  if (turn % POLICY.coverageEvery === 0) { type = rotated[0]; reason = 'Coverage check'; }
  else if (types.some(t=>perf[t].misses >= POLICY.repairMisses && (policy.repairs?.[t] || 0) < perf[t].last)) {
    type = types.find(t=>perf[t].misses >= POLICY.repairMisses && (policy.repairs?.[t] || 0) < perf[t].last); reason = 'Another version after recent difficulty';
  } else if (turn % 2 && dueTypes.some(t=>types.includes(t))) { type = dueTypes.find(t=>types.includes(t)); reason = 'Due for review'; }
  else { type = [...types].sort((a,b)=>(perf[a].fraction ?? (indirect[a] ? -0.5 : -1))-(perf[b].fraction ?? (indirect[b] ? -0.5 : -1)) || perf[a].last-perf[b].last)[0]; reason = 'Independent practice'; }
  if (type === policy.lastType && types.length > 1 && reason !== 'Coverage check') type = rotated.find(t=>t!==type) || types.find(t=>t!==type);
  const exposed = exposedItems(rows), byType = candidates.filter(q=>(q.typeId || q.concept || q.id)===type);
  const groupCounts = g => rows.filter(r=>r.group===g && r.typeId===type).length;
  byType.sort((a,b)=>Number(exposed.has(a.id))-Number(exposed.has(b.id)) || groupCounts(a.group)-groupCounts(b.group) || a.id.localeCompare(b.id));
  const next = { ...policy, version: POLICY.version, actions: turn, lastType: type,
    coverage: { ...policy.coverage, ...(reason === 'Coverage check' ? { [outcomeOf(type)]: turn+1 } : {}) },
    repairs: { ...policy.repairs, ...(reason.includes('difficulty') ? { [type]: perf[type].last } : {}) } };
  const diagnostic = reason.includes('difficulty') && (inventory[type]?.diagnose || [])
    .map(id=>diagnostics.find(q=>q.id===id)).find(q=>q && !used.has(q.id));
  return { item: diagnostic || byType[0], reason: diagnostic ? 'Focused diagnostic after recent difficulty' : reason, policy: next };
}
