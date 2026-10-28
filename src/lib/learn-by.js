/* Goals are settings. Evidence and schedules are rebuilt from the immutable log,
 * so a missed study day replans remaining work rather than creating a backlog. */
import { keys, getItem } from './store.js';
import { setPref, dropPref } from './prefs.js';
import { rangePool } from './practice-pool.js';
import { normalizeQuestion } from './questions.js';
import { skillState, provisionalDemonstrations, effectiveEvents } from './evidence.js';
import { get as retentionGet } from './retention.js';
import { retrievability } from './schedule.js';

// S10 consumes the opt-in activity queue; legacy goal scheduling stays intact.
export { masteryActionPlan } from './mastery-actions.js';

const PREFIX = 'learnby:';
const DAY = 864e5;
const KIND_SECONDS = { single: 45, multi: 75, text:45, blanks:90, number: 75, formula: 120, self: 150 };
const skillsOf = q => q.skills?.length ? q.skills : [q.typeId || q.concept || q.id];
const catalog = idx => idx.SKILLS || idx.TYPES || {};
const validBudget = (n, max) => n === undefined || (Number.isFinite(n) && n > 0 && n <= max);

export function goals(cid = null) {
  return keys().filter(k => k.startsWith(PREFIX)).flatMap(k => {
    try {
      const g = JSON.parse(getItem(k));
      const valid = g && g.id === k.slice(PREFIX.length) && typeof g.cid === 'string' &&
        typeof g.from === 'string' && typeof g.to === 'string' && Number.isFinite(g.dueAt) &&
        ['focus', 'checkpoint'].includes(g.intensity) && validBudget(g.minutesPerDay, 1440) && validBudget(g.sessionMinutes, 1440) &&
        (g.standard === undefined || typeof g.standard === 'string');
      return valid && (!cid || g.cid === cid) ? [g] : [];
    } catch { return []; }
  }).sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id));
}
export const activeGoals = (cid = null, now = Date.now()) => goals(cid).filter(g => g.dueAt > now);

export function saveGoal(goal, idx, now = Date.now()) {
  const ids = Object.keys(idx.SUBS);
  if (!goal?.cid || !ids.includes(goal.from) || !ids.includes(goal.to)) throw new Error('Choose a valid subsection range.');
  if (!Number.isFinite(goal.dueAt) || goal.dueAt <= now) throw new Error('Choose a future deadline.');
  if (!['focus', 'checkpoint'].includes(goal.intensity)) throw new Error('Choose Focus or Checkpoint.');
  if (!validBudget(goal.minutesPerDay, 1440) || !validBudget(goal.sessionMinutes, 1440)) throw new Error('Study minutes must be greater than zero and at most 1440.');
  if (goal.standard && !idx.BLUEPRINTS?.[goal.standard]) throw new Error('Choose an available assessment standard.');
  const id = goal.id || globalThis.crypto?.randomUUID?.() || `g-${now}-${Math.random().toString(36).slice(2)}`;
  const [from, to] = ids.indexOf(goal.from) <= ids.indexOf(goal.to) ? [goal.from, goal.to] : [goal.to, goal.from];
  const value = { id, cid: goal.cid, from, to, dueAt: goal.dueAt,
    intensity: goal.intensity, name: String(goal.name || '').trim().slice(0, 80) };
  for (const key of ['minutesPerDay', 'sessionMinutes', 'standard']) if (goal[key] !== undefined && goal[key] !== '') value[key] = goal[key];
  setPref(PREFIX + id, JSON.stringify(value));
  return value;
}
export const deleteGoal = id => dropPref(PREFIX + id);
export function deleteCourseGoals(cid) { for (const goal of goals(cid)) deleteGoal(goal.id); }

const selectedSubIds = (idx, goal) => {
  const ids = Object.keys(idx.SUBS), a = ids.indexOf(goal.from), b = ids.indexOf(goal.to);
  return a < 0 || b < 0 ? null : new Set(ids.slice(Math.min(a, b), Math.max(a, b) + 1));
};

export function goalMaterial(idx, goal) {
  const subs = selectedSubIds(idx, goal), types = catalog(idx);
  if (!subs) return { types: [], prerequisites: [], pool: [], missing: ['The course range changed.'], error: 'The course range changed.' };
  const scopes = new Set(subs), sections = new Set([...subs].map(id => idx.SUBS[id].sec?.id || idx.SUBS[id].section?.id));
  for (const section of sections) if (Object.entries(idx.SUBS).filter(([, x]) => (x.sec?.id || x.section?.id) === section).every(([id]) => subs.has(id))) scopes.add(section);
  if (subs.size === Object.keys(idx.SUBS).length) scopes.add('course');
  const exact = [...subs].length === 1 ? [...subs][0] : [...sections].length === 1 && scopes.has([...sections][0]) ? [...sections][0] : scopes.has('course') ? 'course' : null;
  const automatic = [scopes.has('course') ? 'course' : null, sections.size === 1 && scopes.has([...sections][0]) ? [...sections][0] : null, subs.size === 1 ? [...subs][0] : null].find(scope => scope && idx.BLUEPRINTS?.[scope]) || exact;
  const standard = goal.standard ? idx.BLUEPRINTS?.[goal.standard] : idx.BLUEPRINTS?.[automatic];
  const error = goal.standard && !standard ? 'The selected standard is no longer available.' : null;
  const scoped = Object.values(types).filter(t => t.assess !== false && t.scopes?.some(s => scopes.has(s)));
  const direct = rangePool(idx, goal.from, goal.to);
  const ids = new Set(standard?.skills || standard?.types || [...scoped.map(t => t.id), ...direct.flatMap(skillsOf)]);
  const deps = new Set(), visiting = new Set();
  const visit = id => {
    if (visiting.has(id)) throw new Error(`Cyclic skill prerequisite: ${id}`);
    if (deps.has(id)) return;
    visiting.add(id);
    for (const dep of types[id]?.requires || []) { visit(dep); deps.add(dep); }
    visiting.delete(id);
  };
  for (const id of ids) visit(id);
  // Bank records are authored data. Keep the normalized card when an item is
  // also placed in a lesson, and normalize bank-only items before selection.
  const bank = Object.values(idx.BANK || {}).map(q => normalizeQuestion(q));
  const all = [...new Map([...bank, ...(idx.PALL || []), ...(idx.QALL || [])].filter(q => !q.quarantined && (!q.use || q.use === 'practice')).map(q => [q.id, q])).values()];
  const pool = all.filter(q => skillsOf(q).some(id => ids.has(id) || deps.has(id)));
  const required = [...ids].sort();
  return { types: required, prerequisites: [...deps].filter(id => !ids.has(id)), pool,
    missing: required.filter(id => !pool.some(q => skillsOf(q).includes(id))), standard: standard || null,
    standardLabel: standard ? `Assessment: ${standard.scope || goal.standard || exact}` : 'Range plan from course requirements', error };
}

const percent = (part, total, complete) => total ? complete ? 100 : Math.min(99, Math.floor(100 * part / total)) : 0;
const rangeSum = actions => actions.reduce((r, a) => ({ lower: r.lower + a.range.lower, typical: r.typical + a.range.typical, upper: r.upper + a.range.upper }), { lower: 0, typical: 0, upper: 0 });

export function deadlinePlan(idx, courseGoals, rows, { now = Date.now(), retention = retentionGet } = {}) {
  const priorities = {}, reasons = {}, details = [], pool = new Map(), actionMap = new Map();
  const types = catalog(idx), indirect = provisionalDemonstrations(rows);
  for (const goal of courseGoals) {
    const expired = goal.dueAt <= now, at = expired ? goal.dueAt - 1 : now;
    const evidence = expired ? rows.filter(r => r.ts <= goal.dueAt) : rows;
    const material = goalMaterial(idx, goal), blueprint = material.standard;
    const weights = Object.fromEntries(material.types.map(id => [id, blueprint?.skillWeights?.[id] ?? blueprint?.typeWeights?.[id] ?? types[id]?.importance ?? 1]));
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const time = Math.max(0, (goal.dueAt - now) / DAY), pressure = (goal.intensity === 'checkpoint' ? 0.4 : 1) / (1 + time) ** 0.7;
    let supportedWeight = 0, sampledWeight = 0, retentionNeeds = 0;
    const states = {}, localActions = [];
    for (const id of material.types) {
      const state = { ...skillState(id, evidence, { bank: idx.BANK, now: at, standard: blueprint, skill: types[id] }) };
      if (material.missing.includes(id) || material.error) { state.supported = false; state.ready = false; }
      states[id] = state;
      if (state.supported) supportedWeight += weights[id];
      if (state.coverage?.sampled || state.n > 0 || state.joint?.length) sampledWeight += weights[id];
      const sample = material.pool.find(q => skillsOf(q).includes(id));
      const minutes = Math.max(0.5, (state.seconds || KIND_SECONDS[sample?.response?.kind] || 90) / 60);
      const memory = retention(goal.cid, `type:${id}`), target = blueprint?.target || 0.9;
      const risk = memory?.reps ? Math.max(0, (target - retrievability(memory, goal.dueAt, target)) / target) : 0;
      const review = state.supported && (!state.ready || risk > 0);
      if (review) retentionNeeds++;
      const weight = weights[id] * material.types.length / (totalWeight || 1);
      const score = pressure * weight * (0.1 + Number(!state.supported) + 0.5 * Number(!state.supported) / (1 + (state.n || 0)) + 0.5 * risk);
      if (!expired && score > (priorities[id] || 0)) { priorities[id] = score; reasons[id] = `For ${goal.name || 'your learn-by goal'}`; }
      if (expired || material.missing.includes(id) || material.error) continue;
      const add = (action, factor, stage, earliest = now, extra = {}) => {
        const key = `${id}:${blueprint?.version || blueprint?.scope || 'range'}:${action}${action === 'review' ? `:${Math.floor(goal.dueAt / DAY)}` : ''}`;
        const range = { lower: Math.round(minutes * factor * 0.65 * 10) / 10, typical: Math.round(minutes * factor * 10) / 10, upper: Math.round(minutes * factor * (state.n ? 1.6 : 2.1) * 10) / 10 };
        let entry = actionMap.get(key);
        if (!entry) { entry = { id: key, cid: goal.cid, skillId: id, action, help: types[id]?.teach?.[0] || sample?.help || null, stage, earliestAt: earliest, dueAt: goal.dueAt, minutes: range.typical, range, priority: score, goalIds: [], standardVersion: blueprint?.version || null, skillIds: [id], conditional: action === 'teach' || action === 'practice', ...extra }; actionMap.set(key, entry); }
        entry.goalIds.push(goal.id); entry.priority = Math.max(entry.priority, score); entry.dueAt = Math.min(entry.dueAt, goal.dueAt); entry.earliestAt = Math.min(entry.earliestAt, earliest);
        localActions.push(entry);
      };
      const atomic = state.coverage?.missingIntegrations?.length ? skillState(id, evidence, { bank: idx.BANK, now: at, skill: types[id],
        standard: { ...blueprint, requirements: { ...blueprint?.requirements, integrations: [] } } }) : state;
      if (!atomic.supported) {
        add('diagnose', 1, 0);
        // Unknown learners start with a probe; explanations are conditional on a
        // gap. The reserved time reflects that branch, not compulsory reading.
        if (types[id]?.teach?.length && (state.n || state.contradictions?.length)) add('teach', 2, 1);
        add('practice', state.n ? 2 : 3, 2);
        add('check', 2, 3);
        for (const representation of state.coverage?.missingRepresentations || []) {
          const entry = localActions.at(-1);
          entry.requiredRepresentations = [...new Set([...(entry.requiredRepresentations || []), representation])];
        }
      }
      if ((!state.supported || review) && goal.dueAt - now >= DAY) add('review', 1, 4, now + Math.min(3 * DAY, (goal.dueAt - now) / 2), { requiredRepresentations: state.coverage?.missingFreshRepresentations || [], requiredIntegrations: state.coverage?.missingFreshIntegrations || [] });
      else if (review) add('review', 1, 4);
    }
    if (!expired && !material.error) {
      const missingSets = new Map(Object.values(states).flatMap(state => state.coverage?.missingIntegrations || []).map(set => [[...set].sort().join('+'), set]));
      for (const [signature, skillIds] of missingSets) {
        const candidates = material.pool;
        const item = candidates.find(q => !q.quarantined && !q.routes?.length && !(Array.isArray(q.support) ? q.support.length : q.support) &&
          (!q.demand || q.demand === 'standard') && skillIds.every(id => skillsOf(q).includes(id)));
        if (!item) { material.missing.push(`integration:${signature}`); continue; }
        const key = `integration:${signature}:${blueprint?.version || blueprint?.scope || 'range'}`;
        let entry = actionMap.get(key);
        if (!entry) {
          const minutes = (KIND_SECONDS[item.response?.kind] || 120) / 60;
          entry = { id: key, cid: goal.cid, skillId: signature, skillIds, itemId: item.id, action: 'integrate', stage: 3.5,
            earliestAt: now, dueAt: goal.dueAt, minutes, range: { lower: minutes * 0.65, typical: minutes, upper: minutes * 2.1 },
            priority: Math.max(...skillIds.map(id => priorities[id] || 0)), goalIds: [], standardVersion: blueprint?.version || null,
            help: item.help || null, conditional: false };
          actionMap.set(key, entry);
        }
        entry.goalIds.push(goal.id); entry.dueAt = Math.min(entry.dueAt, goal.dueAt); localActions.push(entry);
      }
    }
    for (const id of material.prerequisites) {
      const state = skillState(id, evidence, { bank: idx.BANK, now: at, skill: types[id] });
      const proof = indirect[id];
      const proofRow = proof && evidence.find(r => r.id === proof.source);
      const validProof = proofRow && (!idx.BANK?.[proofRow.itemId] || idx.BANK[proofRow.itemId].contentVersion === proofRow.contentVersion) &&
        !evidence.some(r => r.typeId === id && r.firstUnaided === false && r.ts > proof.ts);
      const weak = state.supported ? 0 : validProof ? Math.min(0.2, 1 - (state.p ?? 0.5)) : 1 - (state.p ?? 0.5);
      const score = 0.25 * Math.max(0, ...material.types.map(t => priorities[t] || 0)) * weak;
      if (!expired && score > (priorities[id] || 0)) { priorities[id] = score; reasons[id] = 'Useful prerequisite'; }
    }
    if (!expired) for (const q of material.pool) pool.set(q.id, q);
    const supported = Object.values(states).filter(s => s.supported).length;
    details.push({ goal, ...material, states, expired, progress: percent(supportedWeight, totalWeight, supported === material.types.length),
      coverage: percent(sampledWeight, totalWeight, sampledWeight === totalWeight), retentionNeeds, dueInDays: time,
      actions: localActions, unsupported: material.types.filter(id => !states[id].supported),
      delayedRetention: goal.dueAt - now >= DAY ? 'opportunity' : 'unverified' });
  }
  const active = courseGoals.filter(g => g.dueAt > now), budgets = active.map(g => g.minutesPerDay).filter(Number.isFinite);
  // These goals share one learner's time. Conflicting budgets use the smaller
  // explicit daily limit; overlapping goals never create extra available time.
  const daily = budgets.length ? Math.min(...budgets) : null;
  const sessions = active.map(g => g.sessionMinutes).filter(Number.isFinite), session = sessions.length ? Math.min(...sessions) : null;
  const actions = [...actionMap.values()];
  const spentToday = studyMinutesToday(rows, now);
  allocateActions(actions, now, daily, session, spentToday);
  finalizeDetails(details, daily, now, spentToday);
  return { priorities, reasons, details, pool: [...pool.values()], actions, workRange: rangeSum(actions), minutesPerDay: daily, sessionMinutes: session, spentToday };
}


function allocateActions(actions, now, daily, session, spentToday = 0) {
  const used = new Map([[localDayStart(now), { minutes: spentToday, end: now }]]), scheduled = new Map();
  actions.sort((a, b) => a.stage - b.stage || a.dueAt - b.dueAt || b.priority - a.priority || a.id.localeCompare(b.id));
  let unbudgetedEnd = now;
  for (const action of actions) {
    const previous = [...scheduled.values()].filter(a => a.cid === action.cid && a.skillIds.some(id => action.skillIds.includes(id)) && a.stage < action.stage);
    let earliest = Math.max(now, action.earliestAt, ...previous.map(a => a.scheduledAt === null ? Infinity : (a.endsAt || a.scheduledAt + a.minutes * 6e4)));
    delete action.endsAt; delete action.allocations;
    action.scheduledAt = null; action.sessions = session ? Math.ceil(action.minutes / session) : 1;
    if (!daily) {
      earliest = Math.max(earliest, unbudgetedEnd);
      if (earliest + action.minutes * 6e4 <= action.dueAt) { action.scheduledAt = earliest; action.endsAt = earliest + action.minutes * 6e4; unbudgetedEnd = action.endsAt; }
    }
    else {
      // Calendar-day budgets survive replanning. Active time already spent
      // today reduces capacity; future local days receive their own budget.
      let left = action.minutes, cursor = earliest; const allocations = [];
      while (left > 1e-8 && cursor < action.dueAt && Number.isFinite(cursor)) {
        const start = localDayStart(cursor), day = start, end = nextLocalDay(start);
        const prior = used.get(day) || { minutes: 0, end: start };
        const wallStart = Math.max(cursor, prior.end);
        const available = Math.max(0, Math.min(daily - prior.minutes, (Math.min(end, action.dueAt) - wallStart) / 6e4));
        if (available > 0) { const take = Math.min(left, available); allocations.push({ day, minutes: take, start: wallStart, end: wallStart + take * 6e4 }); left -= take; }
        cursor = end;
      }
      if (left <= 1e-8) {
        for (const a of allocations) used.set(a.day, { minutes: (used.get(a.day)?.minutes || 0) + a.minutes, end: a.end });
        action.scheduledAt = allocations[0].start;
        action.endsAt = allocations.at(-1).end;
        action.allocations = allocations;
      }
    }
    scheduled.set(action.id, action);
  }
}

function finalizeDetails(details, daily, now, spentToday = 0) {
  for (const detail of details) {
    detail.workRange = rangeSum(detail.actions); detail.minutes = Math.round(detail.workRange.typical);
    detail.unscheduled = detail.actions.filter(a => a.scheduledAt === null).map(a => a.skillId);
    const missing = detail.missing.length || detail.error;
    detail.forecast = detail.expired ? 'expired' : missing ? 'content-gap' : !daily ? 'availability-unknown' : detail.unscheduled.length ? 'insufficient-time' : 'fits-typical-estimate';
    detail.spentToday = spentToday;
    detail.availableMinutes = daily ? availableMinutes(now, detail.goal.dueAt, daily, spentToday) : null;
    detail.nextSession = detail.actions.filter(a => a.scheduledAt !== null && a.scheduledAt < nextLocalDay(now));
  }
}

/* Schedule every visible course against one learner's time. Namespace action
 * identity and dependencies: equal skill IDs in different courses are unrelated. */
export function planAcrossCourses(books, courseGoals, rowsByCourse, options = {}) {
  const now = options.now ?? Date.now();
  const plans = books.map(book => ({ cid: book.cid, ...deadlinePlan(book.idx, courseGoals.filter(g => g.cid === book.cid), rowsByCourse[book.cid] || [], { ...options, now }) }));
  const actions = plans.flatMap(plan => plan.actions.map(action => {
    action.id = `${plan.cid}:${action.id}`; action.cid = plan.cid; return action;
  }));
  const dailyBudgets = plans.map(p => p.minutesPerDay).filter(Number.isFinite);
  const sessionBudgets = plans.map(p => p.sessionMinutes).filter(Number.isFinite);
  const minutesPerDay = dailyBudgets.length ? Math.min(...dailyBudgets) : null;
  const sessionMinutes = sessionBudgets.length ? Math.min(...sessionBudgets) : null;
  const spentToday = studyMinutesToday(Object.values(rowsByCourse).flat(), now);
  allocateActions(actions, now, minutesPerDay, sessionMinutes, spentToday);
  const details = plans.flatMap(p => p.details);
  finalizeDetails(details, minutesPerDay, now, spentToday);
  return { plans, details, actions, minutesPerDay, sessionMinutes, spentToday, workRange: rangeSum(actions) };
}


const localDayStart = time => { const date = new Date(time); date.setHours(0, 0, 0, 0); return date.getTime(); };
const nextLocalDay = time => { const date = new Date(time); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + 1); return date.getTime(); };

export function studyMinutesToday(rows, now = Date.now()) {
  const start = localDayStart(now);
  const unique = new Map(rows.map(r => [r.id || `${r.course}:${r.attemptId}:${r.ts}`, r]));
  return effectiveEvents([...unique.values()]).filter(r => r.event === 'attempt' && r.ts >= start && r.ts <= now && !r.timingFlags?.length)
    .reduce((sum, r) => sum + [r.activeMs, r.feedbackMs].reduce((total, ms) => total + (Number.isFinite(ms) && ms > 0 ? ms / 6e4 : 0), 0), 0);
}

function availableMinutes(now, due, daily, spent) {
  if (due <= now) return 0;
  const tomorrow = nextLocalDay(now), remaining = Math.max(0, daily - spent);
  if (due <= tomorrow) return Math.min(remaining, (due - now) / 6e4);
  const first = Math.min(remaining, (tomorrow - now) / 6e4), lastStart = localDayStart(due);
  const calendarNumber = time => { const d = new Date(time); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY; };
  const full = Math.max(0, calendarNumber(lastStart) - calendarNumber(tomorrow));
  return first + full * daily + Math.min(daily, (due - lastStart) / 6e4);
}
