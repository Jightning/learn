/* Concept retention after any question, regardless of where it appeared.
 *
 * Retrieval runs to a criterion of up to three correct recalls on distinct
 * items, then relearns across three spaced sessions (Rawson & Dunlosky 2011).
 * The target is bounded by the number of authored items so a one-question
 * course can still progress through spaced review.
 * Everything a criterion needs is derivable from two lists, so only those are
 * stored — a stored `durable` flag would be derived data by another name.
 */
import { review, grade, due, nextDeadline } from "./schedule.js";
import { getItem, setItem } from "./store.js";

const KEY = "retain:v1";
const CRITERION = 3;   /* distinct items recalled correctly */
const RELEARN = 3;     /* spaced sessions after criterion */

const day = t => new Date(t).toISOString().slice(0, 10);

/* How hard this course is held. A one-credit seminar does not need 0.90, and
 * an exam date turns the schedule around to aim at it. */
export const configOf = C => ({
  target: Number((C.retention || {}).target) || 0.9,
  deadline: nextDeadline((C.retention || {}).deadlines)
});

let db;
function load() {
  if (db) return db;
  try { db = JSON.parse(getItem(KEY)) || {}; } catch { db = {}; }
  return db;
}
const save = () => setItem(KEY, JSON.stringify(db));

const blank = () => ({ s: 0, d: 0, last: 0, reps: 0, items: [], relearnDays: [], ok: false,
  criterion: CRITERION });

export function get(cid, key) {
  return (load()[cid] || {})[key] || null;
}

/** A concept enters the schedule on first contact, never before — otherwise day one
 *  is a queue of every concept in every course, and the queue is the product. */
export function contact(cid, key) {
  const d = load();
  d[cid] ||= {};
  if (!d[cid][key]) { d[cid][key] = blank(); save(); }
  return d[cid][key];
}

/* One answer, as a pure function of the previous concept state. Both
   `answer` (live) and lib/replay.js (rebuilding from the log) go through this,
   so a replayed schedule is identical to the one that was lived. */
export function step(prev, { itemId, correct, conf, criterion = CRITERION,
                             target = 0.9, deadline = null, gradeSource = 'legacy', now = Date.now() }) {
  const c = prev
    ? { ...prev, items: [...(prev.items || [])], relearnDays: [...(prev.relearnDays || [])] }
    : blank();
  const previousRecall = c.last || null;
  c.delayMs = previousRecall == null ? null : Math.max(0, now-previousRecall);
  Object.assign(c, review(c.reps ? c : null, grade(correct, conf), now, target));
  c.criterion = Math.max(c.reps ? c.criterion || 1 : 1,
    Math.min(CRITERION, Math.max(1, Number(criterion) || CRITERION)));
  c.gradeSource = gradeSource;
  c.selfReportedReps = (c.selfReportedReps || 0) + Number(gradeSource === 'self');
  c.checkedReps = (c.checkedReps || 0) + Number(['deterministic-checker','human-review'].includes(gradeSource));
  c.reps++;
  c.ok = !!correct;
  if (correct) {
    if (c.items.length < c.criterion) {
      if (!c.items.includes(itemId)) c.items.push(itemId);
    } else {
      const t = day(now);
      if (c.delayMs >= 864e5 && !c.relearnDays.includes(t)) c.relearnDays.push(t);
    }
  }
  if (!correct) c.relearnDays = [];
  c.dueAt = due(c, { target, deadline });
  return c;
}

export function answer(cid, key, opts) {
  const c = contact(cid, key);
  Object.assign(c, step(c, opts));
  save();
  return c;
}

/** "new", "learning", "criterion", "durable": named in text, never by colour */
export function phase(c) {
  if (!c || !c.reps) return "new";
  if (c.items.length < (c.criterion || CRITERION)) return "learning";
  if (c.relearnDays.length >= RELEARN && c.ok) return "durable";
  return "criterion";
}

export function label(c) {
  const source = c?.selfReportedReps ? 'Self-reported review: ' : c?.reps && !c.checkedReps ? 'Earlier review history: ' : '';
  switch (phase(c)) {
    case "new": return "not started";
    case "learning": return `${source}learning, ${c.items.length} of ${c.criterion || CRITERION} items`;
    case "criterion": return `${source}at criterion, ${c.relearnDays.length} of ${RELEARN} relearn sessions`;
    default: return `${source}retained over observed review sessions`;
  }
}

export const isDue = (c, now = Date.now()) => !c || !c.reps || !c.dueAt || c.dueAt <= now;

/** Every concept encountered through any question surface and due now. */
export function dueKeys(cid, now = Date.now()) {
  return Object.entries(load()[cid] || {}).filter(([, c]) => isDue(c, now)).map(([key]) => key);
}

export function counts(cid, keys = Object.keys(load()[cid] || {})) {
  const d = load()[cid] || {};
  const n = { total: keys.length, seen: 0, criterion: 0, durable: 0, due: 0, selfReported:0 };
  for (const k of keys) {
    const c = d[k];
    if (!c) continue;                    /* not in contact: not the queue's business */
    if (isDue(c)) n.due++;
    if (!c.reps) continue;
    n.seen++;
    if (c.selfReportedReps) n.selfReported++;
    const p = phase(c);
    if (p === "durable") n.durable++;
    else if (p === "criterion") n.criterion++;
  }
  return n;
}

export function reset(cid) {
  const d = load();
  if (cid) delete d[cid]; else db = {};
  save();
}

/** Replace one course's review state wholesale. lib/replay.js is the caller. */
export function install(cid, byKey) {
  const d = load();
  d[cid] = byKey;
  save();
}
