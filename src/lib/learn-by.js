/* Learner deadlines are settings; readiness and priorities are derived from
 * course types and the attempt log, never stored as another progress record. */
import { keys, getItem } from './store.js';
import { setPref, dropPref } from './prefs.js';
import { rangePool } from './practice-pool.js';
import { observations, provisionalDemonstrations, scoredEvents } from './evidence.js';
import { get as retentionGet } from './retention.js';
import { retrievability } from './schedule.js';

const PREFIX = 'learnby:';
const DAY = 864e5;
const KIND_SECONDS = { single: 45, multi: 75, number: 75, formula: 120, self: 150 };
const typeOf = q => q.typeId || q.concept || q.id;

export function goals(cid = null) {
  return keys().filter(k => k.startsWith(PREFIX)).flatMap(k => {
    try {
      const g = JSON.parse(getItem(k));
      const valid = g && g.id === k.slice(PREFIX.length) && typeof g.cid === 'string' &&
        typeof g.from === 'string' && typeof g.to === 'string' && Number.isFinite(g.dueAt) &&
        ['focus', 'checkpoint'].includes(g.intensity);
      return valid && (!cid || g.cid === cid) ? [g] : [];
    }
    catch { return []; }
  }).sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id));
}
export const activeGoals = (cid = null, now = Date.now()) => goals(cid).filter(g => g.dueAt > now);

export function saveGoal(goal, idx, now = Date.now()) {
  const ids = Object.keys(idx.SUBS);
  if (!goal?.cid || !ids.includes(goal.from) || !ids.includes(goal.to)) throw new Error('Choose a valid subsection range.');
  if (!Number.isFinite(goal.dueAt) || goal.dueAt <= now) throw new Error('Choose a future deadline.');
  if (!['focus', 'checkpoint'].includes(goal.intensity)) throw new Error('Choose Focus or Checkpoint.');
  const id = goal.id || globalThis.crypto?.randomUUID?.() || `g-${now}-${Math.random().toString(36).slice(2)}`;
  const [from, to] = ids.indexOf(goal.from) <= ids.indexOf(goal.to) ? [goal.from, goal.to] : [goal.to, goal.from];
  const value = { id, cid: goal.cid, from, to, dueAt: goal.dueAt,
    intensity: goal.intensity, name: String(goal.name || '').trim().slice(0, 80) };
  setPref(PREFIX + id, JSON.stringify(value));
  return value;
}
export const deleteGoal = id => dropPref(PREFIX + id);
export function deleteCourseGoals(cid) {
  for (const goal of goals(cid)) deleteGoal(goal.id);
}

const selectedSubIds = (idx, goal) => {
  const ids = Object.keys(idx.SUBS), a = ids.indexOf(goal.from), b = ids.indexOf(goal.to);
  if (a < 0 || b < 0) return null;
  return new Set(ids.slice(Math.min(a, b), Math.max(a, b) + 1));
};

export function goalMaterial(idx, goal) {
  const subs = selectedSubIds(idx, goal);
  if (!subs) return { types: [], pool: [], missing: ['The course range changed.'] };
  const scopes = new Set(subs);
  const sections = new Set([...subs].map(id => idx.SUBS[id].sec.id));
  for (const section of sections) if (Object.entries(idx.SUBS).filter(([, x]) => x.sec.id === section).every(([id]) => subs.has(id))) scopes.add(section);
  if (subs.size === Object.keys(idx.SUBS).length) scopes.add('course');
  const scoped = Object.values(idx.TYPES || {}).filter(t => t.assess !== false && t.scopes?.some(s => scopes.has(s)));
  const direct = rangePool(idx, goal.from, goal.to);
  const ids = new Set([...scoped.map(t => t.id), ...direct.map(typeOf)]);
  const all = [...new Map([...idx.QALL, ...idx.PALL].filter(q => !q.use || q.use === 'practice').map(q => [q.id, q])).values()];
  const required = [...ids].sort();
  const deps = new Set(required.flatMap(id => idx.TYPES?.[id]?.requires || []));
  const pool = all.filter(q => ids.has(typeOf(q)) || deps.has(typeOf(q)));
  const missing = required.filter(id => !pool.some(q => typeOf(q) === id));
  return { types: required, prerequisites: [...deps].filter(id => !ids.has(id)), pool, missing };
}

function typeState(id, rows, idx, now) {
  const valid = observations(rows, id).filter(r => !idx.BANK?.[r.itemId] || idx.BANK[r.itemId].contentVersion === r.contentVersion);
  const recent = valid.slice(-8), last = recent.at(-1);
  const lastMiss = scoredEvents(rows).filter(r => r.event === 'attempt' && r.typeId === id &&
    r.firstUnaided === false && !r.skipped && !r.assisted &&
    (!idx.BANK?.[r.itemId] || idx.BANK[r.itemId].contentVersion === r.contentVersion))
    .reduce((at, r) => Math.max(at, r.ts), 0);
  const successes = recent.filter(r => r.firstUnaided && r.ts > lastMiss && now - r.ts <= 30 * DAY);
  const checked = successes.some(r => r.context === 'check');
  const independent = new Set(successes.map(r => r.itemId)).size >= 2 &&
    successes.some(r => r.methodCued === false);
  const ready = !!last?.firstUnaided && last.ts > lastMiss && (checked || independent) && now - last.ts <= 30 * DAY;
  const n = recent.reduce((v, r) => v + r.weight, 0);
  const p = (1 + recent.reduce((v, r) => v + r.weight * Number(r.firstUnaided), 0)) / (2 + n);
  const timings = recent.filter(r => Number.isFinite(r.activeMs) && r.activeMs > 0 && !r.timingFlags?.length).map(r => r.activeMs / 1000).sort((a, b) => a - b);
  return { ready, n, p, seconds: timings.length ? timings[Math.floor(timings.length / 2)] : null };
}

export function deadlinePlan(idx, courseGoals, rows, { now = Date.now(), retention = retentionGet } = {}) {
  const priorities = {}, reasons = {}, details = [], pool = new Map();
  const indirect = provisionalDemonstrations(rows);
  for (const goal of courseGoals.filter(g => g.dueAt > now)) {
    const material = goalMaterial(idx, goal);
    const blueprint = idx.BLUEPRINTS?.course;
    const weights = Object.fromEntries(material.types.map(id => [id, blueprint?.typeWeights?.[id] || 1]));
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const time = Math.max(0, (goal.dueAt - now) / DAY);
    const pressure = (goal.intensity === 'checkpoint' ? 0.4 : 1) / (1 + time) ** 0.7;
    let readyWeight = 0, minutes = 0, retentionNeeds = 0;
    const states = {};
    for (const id of material.types) {
      const state = typeState(id, rows, idx, now);
      if (material.missing.includes(id)) state.ready = false;
      states[id] = state;
      if (state.ready) readyWeight += weights[id];
      const sample = material.pool.find(q => typeOf(q) === id);
      const seconds = state.seconds || KIND_SECONDS[sample?.response?.kind] || 90;
      if (!state.ready) minutes += seconds / 60 * (state.n ? 2 : 3);
      const memory = retention(goal.cid, `type:${id}`);
      const target = 0.9;
      const risk = memory?.reps ? Math.max(0, (target - retrievability(memory, goal.dueAt, target)) / target) : 0;
      if (state.ready && risk > 0) retentionNeeds++;
      const need = state.ready ? 0 : 1;
      const uncertainty = state.ready ? 0 : 1 / (1 + state.n);
      // Normalize author weights to an average of one. Dividing by the number
      // of types would make a broad course unfairly lose to a tiny goal.
      const weight = weights[id] * material.types.length / (totalWeight || 1);
      const score = pressure * weight * (0.1 + need + 0.5 * uncertainty + 0.5 * risk);
      if (score > (priorities[id] || 0)) {
        priorities[id] = score;
        reasons[id] = `For ${goal.name || 'your learn-by goal'}`;
      }
    }
    for (const id of material.prerequisites) {
      const dependent = material.types.filter(t => idx.TYPES?.[t]?.requires?.includes(id));
      const state = typeState(id, rows, idx, now);
      const proof = rows.find(r => r.id === indirect[id]?.source);
      const validProof = proof && (!idx.BANK?.[proof.itemId] || idx.BANK[proof.itemId].contentVersion === proof.contentVersion);
      const weak = validProof && !rows.some(r => r.typeId === id && r.firstUnaided === false && r.ts > indirect[id].ts)
        ? Math.min(0.2, 1 - state.p) : 1 - state.p;
      const score = 0.25 * Math.max(0, ...dependent.map(t => priorities[t] || 0)) * weak;
      if (score > (priorities[id] || 0)) { priorities[id] = score; reasons[id] = 'Useful prerequisite'; }
    }
    for (const q of material.pool) pool.set(q.id, q);
    const readyCount = Object.values(states).filter(s => s.ready).length;
    const progress = totalWeight ? readyCount === material.types.length ? 100
      : Math.min(99, Math.floor(100 * readyWeight / totalWeight)) : 0;
    details.push({ goal, ...material, states, progress,
      minutes: Math.round(minutes), retentionNeeds, dueInDays: time });
  }
  return { priorities, reasons, details, pool: [...pool.values()] };
}
