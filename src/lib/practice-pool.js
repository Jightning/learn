/* A subsection range defines the skills; both first-check questions and their
 * authored variants can exercise them. Selection is weighted, with a floor for
 * broad coverage so a few weak skills do not consume the whole set. */
import { get as retentionGet, isDue } from "./retention.js";
import { retentionKeyFor } from "./questions.js";
import { skillsOf } from "./evidence.js";

export function categoryPool(pool, idx, category) {
  pool = pool.filter(q => !q.quarantined);
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
  const skillsOf = q => q.skills?.length ? q.skills : [q.typeId].filter(Boolean);
  const selectedTypes = new Set(checks.flatMap(skillsOf));
  const full = selected.size === ids.length;
  return [...new Map([...checks, ...idx.PALL.filter(q => skillsOf(q).length
    ? skillsOf(q).some(id => selectedTypes.has(id)) || q.scopes?.some(s => selected.has(s) || sectionIds.has(s) || (full && s === 'course'))
    : concepts.has(q.concept))].filter(q => !q.quarantined && (!q.use || q.use === 'practice')).map(q => [q.id, q])).values()];
}

export function selectMixed(pool, cid, state, limit = 10, random = Math.random) {
  pool = pool.filter(q => !q.quarantined && (!q.use || q.use === "practice"));
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("Practice count must be a positive integer");
  const weighted = pool.map(item => {
    const prior = state.get(item.id);
    const concept = retentionKeyFor(item) && retentionGet(cid, retentionKeyFor(item));
    let weight = 1;
    if (prior?.got === 0 || concept?.ok === false) weight += 4;
    if (concept && isDue(concept)) weight += 3;
    if (item.difficulty === "challenging") weight += 1;
    return { item, weight, key: -Math.log(Math.max(random(), 1e-10)) / weight };
  });
  /* Reserve broad slots for distinct skills, rather than random items from
   * one large family. Multi-skill items cover each represented obligation. */
  const broad = Math.min(pool.length, Math.ceil(limit / 3));
  const uniform = [...weighted].sort((a, b) => a.key*a.weight-b.key*b.weight);
  const covered = new Set(), baseline = [];
  for (const row of uniform) {
    const ids = skillsOf(row.item).length ? skillsOf(row.item) : [row.item.id];
    if (!ids.some(id => !covered.has(id))) continue;
    baseline.push(row); ids.forEach(id => covered.add(id));
    if (baseline.length >= broad) break;
  }
  const used = new Set(baseline.map(x => x.item.id));
  const focused = weighted.filter(x => !used.has(x.item.id)).sort((a, b) => a.key - b.key)
    .slice(0, Math.max(0, limit - baseline.length));
  return [...baseline, ...focused].map(x => x.item);
}

export function retryVariant(pool, current, usedIds) {
  const target = new Set(skillsOf(current));
  const candidates = pool.filter(q => !q.quarantined && (!q.use || q.use === "practice") &&
    q.id !== current.id && !usedIds.has(q.id) && skillsOf(q).some(id => target.has(id)));
  const exact = q => skillsOf(q).length === target.size && skillsOf(q).every(id => target.has(id));
  return candidates.find(exact) || candidates[0] || null;
}
