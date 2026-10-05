import { POLICY, exposedItems, orderEvents, observations, scoredEvents } from './evidence.js';
/* Confirmation is local and refers to applicability, never independent content audit. */
export function checkCandidates(idx, blueprint, rows, now = Date.now()) {
  if (!blueprint) return { items: [], missing: [], reason: 'No applicable assessment standard.' };
  const exposed = exposedItems(rows), items = [], missing = [];
  for (const typeId of blueprint.types) {
    const previous = observations(rows,typeId).filter(r=>(r.context === 'check' || (r.context === 'practice' && r.methodCued === false)) && r.assessmentVersion === blueprint.version &&
      r.firstUnaided && now-r.ts <= POLICY.freshnessDays*864e5 && (!idx.BANK || idx.BANK[r.itemId]?.contentVersion === r.contentVersion)).at(-1);
    if (previous && !rows.some(r=>r.typeId === typeId && r.firstUnaided === false && !r.skipped && r.ts > previous.ts)) continue;
    const candidates = (idx.CHECK || []).filter(q => q.typeId === typeId && !exposed.has(q.id));
    if (candidates.length) items.push(candidates[0]); else missing.push(typeId);
  }
  return { items, missing, reason: missing.length ? 'Fresh check questions are insufficient. Useful practice remains available.' : null };
}
export function readiness(blueprint, rows, { confirmedVersion, sufficientEvidence, bank, now = Date.now() } = {}) {
  if (!blueprint || confirmedVersion !== blueprint.version) return { ready: false, label: 'Readiness needs an applicable confirmed standard.', gaps: [] };
  const eligibleIds = new Set((blueprint.types || []).flatMap(t=>observations(rows,t)).map(r=>r.id));
  const current = scoredEvents(rows).filter(r=>r.event === 'attempt' && (r.context === 'check' || (r.context === 'practice' && r.methodCued === false)) &&
    r.assessmentVersion === blueprint.version && eligibleIds.has(r.id) && r.firstUnaided != null && !r.skipped && !r.assisted &&
    now-r.ts <= POLICY.freshnessDays*864e5 && (!bank || bank[r.itemId]?.contentVersion === r.contentVersion));
  const latest = new Map(current.map(r=>[r.typeId,r])), gaps = [], scores = {};
  let aggregate = 0;
  for (const t of blueprint.types) {
    const r = latest.get(t);
    if (!r) { gaps.push(t); continue; }
    scores[t] = Number(r.firstUnaided); aggregate += (blueprint.typeWeights[t] || 0)*scores[t];
  }
  const outcomes = {};
  for (const [id,o] of Object.entries(blueprint.outcomes)) {
    const assessed = o.types.every(t=>t in scores);
    const score = assessed ? o.types.reduce((n,t)=>n + (blueprint.typeWeights[t] || 0)*scores[t],0)/o.weight : null;
    outcomes[id] = { score, essential: o.essential, floor: o.floor };
    if (!assessed || (o.essential && score < o.floor)) gaps.push(id);
  }
  const evidenceKey = current.map(r=>r.id).join('|');
  const contradictions = blueprint.types.filter(t => rows.some(r=>r.event === 'attempt' && r.typeId === t &&
    r.firstUnaided === false && !r.skipped && r.ts > (latest.get(t)?.ts || 0)));
  const confirmed = sufficientEvidence === evidenceKey;
  const ready = !gaps.length && !contradictions.length && confirmed && aggregate >= blueprint.target;
  return { ready, score: aggregate, outcomes, gaps, contradictions, evidenceKey, confirmed, label: ready
    ? 'Likely ready now; delayed retention is separate.' : gaps.length
      ? 'Needs a check: some required evidence is missing, expired, or below the standard.'
      : 'Strong recent results; more independent evidence is needed.', selfAssessed: current.some(r=>r.selfChecked) };
}
