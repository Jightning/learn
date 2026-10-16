import { observations, exposedItems, orderEvents } from './evidence.js';

/* A deterministic ranking for shadow evaluation. The smoothed performance
 * estimate is a heuristic, not a calibrated probability of learning. */
export function selectScored(pool, rows, options = {}) {
  const { used = new Set(), types = {}, dueTypes = [], lastType = null,
    remaining = 10, versions = null, goalPriorities = null, goalReasons = null } = options;
  const candidates = pool.filter(q => !used.has(q.id) && (!q.use || q.use === 'practice'));
  if (!candidates.length) return { item: null, reason: 'No suitable questions remain.', scores: [] };
  const typeOf = q => q.typeId || q.concept || q.id;
  const ids = new Set(candidates.map(typeOf));
  for (const id of [...ids]) for (const dep of types[id]?.requires || []) ids.add(dep);
  const evidence = Object.fromEntries([...ids].map(id => {
    const eligible = observations(rows, id).filter(r => !versions || !Object.hasOwn(versions, r.itemId) || versions[r.itemId] === r.contentVersion);
    const recent = eligible.slice(-8);
    const n = recent.reduce((sum, r) => sum + r.weight, 0);
    const successes = recent.reduce((sum, r) => sum + r.weight * Number(r.firstUnaided), 0);
    return [id, { n, estimate: (1 + successes) / (2 + n) }];
  }));
  const unknown = [...new Set(candidates.map(typeOf))].reduce((sum, id) => sum + 1 / (1 + evidence[id].n), 0);
  const breadth = unknown / (unknown + Math.max(1, remaining));
  const ordered = orderEvents(rows);
  const exposed = exposedItems(ordered);
  const recentType = ordered.filter(r => r.event === 'attempt').at(-1)?.typeId || lastType;
  const groupCounts = new Map();
  for (const r of ordered) if (r.event === 'attempt' && r.group && r.typeId)
    groupCounts.set(`${r.typeId}:${r.group}`, (groupCounts.get(`${r.typeId}:${r.group}`) || 0) + 1);
  const scored = candidates.map(item => {
    const id = typeOf(item), state = evidence[id], deps = types[id]?.requires || [];
    const gap = deps.length ? deps.reduce((sum, dep) => sum + (1 - (evidence[dep]?.estimate ?? .5)), 0) / deps.length : 0;
    const prerequisite = 1 - .2 * gap;
    const due = dueTypes.includes(id) ? 1 : 0;
    const foundation = Object.values(types).some(t => t.requires?.includes(id) && (evidence[t.id]?.estimate ?? .5) < .5) ? 1 : 0;
    const novelty = exposed.has(item.id) ? .25 : 1;
    const mix = recentType === id ? .85 : 1;
    const group = groupCounts.get(`${id}:${item.group}`) ? .5 : 1;
    // Format time must not bury a type before its first independent sample.
    const cost = state.n === 0 ? 1 : ({ single: 1, multi: 1.5, number: 1.5, formula: 2.5, self: 3 }[item.response?.kind] || 2);
    const base = novelty * mix * group * prerequisite / cost *
      (breadth / (1 + state.n) + (1 - breadth) * 4 * state.estimate * (1 - state.estimate) + .25 * due + .10 * foundation);
    // Scope is filtered by the caller. The multiplier preserves the ordinary
    // breadth/variant/due ranking within each deadline-weighted type.
    const score = base * (goalPriorities ? 0.25 + 5 * (goalPriorities[id] || 0) : 1);
    return { item, score, typeId: id, due, unseen: state.n === 0, prerequisite };
  }).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  const first = scored[0];
  return { item: first.item, reason: goalReasons?.[first.typeId] || (first.due ? 'Due for review' : first.unseen ? 'Broaden coverage' : 'Useful next practice'),
    scores: scored.map(({ item, score, typeId, prerequisite }) => ({ id: item.id, typeId, score, prerequisite })) };
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
