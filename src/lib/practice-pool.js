/* A subsection range defines the skills; both first-check questions and their
 * authored variants can exercise them. Selection is weighted, with a floor for
 * broad coverage so a few weak skills do not consume the whole set. */
import { get as retentionGet, isDue } from "./retention.js";

export function categoryPool(pool, idx, category) {
  if (!category) return pool;
  const concepts = new Set(idx.CAT.drillsOf(category) || []);
  return pool.filter(q => concepts.has(q.concept) || q.scopes?.includes(category));
}

export function rangePool(idx, from, to) {
  const ids = Object.keys(idx.SUBS);
  const lo = Math.max(0, ids.indexOf(from));
  const hi = to ? ids.indexOf(to) : ids.length - 1;
  const selected = new Set(ids.slice(Math.min(lo, hi), Math.max(lo, hi) + 1));
  const checks = idx.QALL.filter(q => selected.has(q.subId));
  const concepts = new Set(checks.map(q => q.concept).filter(Boolean));
  const sectionIds = new Set([...selected].map(id => idx.SUBS[id]?.sec?.id || id.split('-')[0]).filter(sec =>
    ids.filter(id => (idx.SUBS[id]?.sec?.id || id.split('-')[0]) === sec).every(id => selected.has(id))));
  const selectedTypes = new Set(checks.map(q => q.typeId).filter(Boolean));
  const full = selected.size === ids.length;
  return [...new Map([...checks, ...idx.PALL.filter(q => q.typeId
    ? selectedTypes.has(q.typeId) || q.scopes?.some(s => selected.has(s) || sectionIds.has(s) || (full && s === 'course'))
    : concepts.has(q.concept))].filter(q => !q.use || q.use === 'practice').map(q => [q.id, q])).values()];
}

export function selectMixed(pool, cid, state, limit = 10, random = Math.random) {
  const weighted = pool.map(item => {
    const prior = state.get(item.id);
    const concept = item.concept && retentionGet(cid, item.concept);
    let weight = 1;
    if (prior?.got === 0 || concept?.ok === false) weight += 4;
    if (concept && isDue(concept)) weight += 3;
    if (item.difficulty === "challenging") weight += 1;
    return { item, weight, key: -Math.log(Math.max(random(), 1e-10)) / weight };
  });
  /* Keep at least one third of a set for broad coverage. */
  const broad = Math.min(pool.length, Math.ceil(limit / 3));
  const baseline = [...weighted].sort((a, b) => a.key * a.weight - b.key * b.weight).slice(0, broad);
  const used = new Set(baseline.map(x => x.item.id));
  const focused = weighted.filter(x => !used.has(x.item.id)).sort((a, b) => a.key - b.key)
    .slice(0, Math.max(0, limit - baseline.length));
  return [...baseline, ...focused].map(x => x.item);
}

export function retryVariant(pool, current, usedIds) {
  return pool.find(q => (!q.use || q.use === "practice") && (current.typeId ? q.typeId === current.typeId : q.concept && q.concept === current.concept) &&
    q.id !== current.id && !usedIds.has(q.id)) || null;
}
