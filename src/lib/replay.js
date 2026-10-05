/* ============================================================================
 * src/lib/replay.js — rebuild learner state from the outcome log
 *
 * Two devices cannot merge mutable state. If the phone and the laptop each
 * advanced a concept's FSRS stability, there is no principled way to combine
 * the two numbers, and picking one silently discards a session.
 *
 * The log has no such problem: rows are immutable, timestamped, and owned by
 * exactly one device, so merging is a union. Everything else is *derived* —
 * Loop A's per-question rows and Loop B's per-concept schedule are both a fold
 * over the log in timestamp order. Sync therefore moves only the log, and this
 * file recomputes the rest.
 *
 * The fold is exact because the transitions are pure and the scheduler takes
 * `now` as an argument: `retention.step` and `state.rateStep` are the same
 * functions the live path uses, fed logged timestamps instead of the clock.
 *
 * A checkpoint keeps it cheap. Replaying a year of rows on every load would be
 * slow, so the result is snapshotted with a watermark and later replays start
 * from there.
 * ==========================================================================*/
import { getItem, setItem, removeItem, logRows } from "./store.js";
import { step as retentionStep, install as installRetention, configOf } from "./retention.js";
import { migrateLegacyRows } from "./question-aliases.js";
import { orderEvents, scoredEvents } from "./evidence.js";
import { rateStep, forget, keyFor } from "./state.js";

const DAY = 864e5;
const ckptKey = cid => `ckpt:${cid}`;

const readCkpt = cid => {
  try { return JSON.parse(getItem(ckptKey(cid))) || null; } catch { return null; }
};

/**
 * Fold `rows` (one course, ascending ts) onto a starting state.
 * Pure: no storage, no clock. Exported for tests.
 */
export function fold(rows, cfg, start = { retain: {}, study: {} }) {
  const retain = { ...start.retain };
  const study = { ...start.study };
  let last = start.ts || 0;
  const sessions = new Set(start.sessions || []);

  for (const r of scoredEvents(rows)) {
    if (r.ts < last) continue;
    last = r.ts;

    if (r.event === "exposure") continue;
    if (r.loop === "Q") {
      if (r.itemId) study[r.itemId] = rateStep(study[r.itemId] || null, null, r.correct, r.ts);
      const key = r.typeId ? `type:${r.typeId}` : r.concept;
      const session = `${key}:${r.sessionId}`;
      const eligible = !r.typeId || (r.firstUnaided != null && !r.assisted && !r.skipped && !sessions.has(session));
      if (key && eligible) retain[key] = retentionStep(retain[key] || null, {
        itemId: r.itemId, correct: r.typeId ? r.firstUnaided : r.correct, conf: null, criterion: r.criterion,
        target: cfg.target, deadline: cfg.deadline, now: r.ts
      });
      if (r.typeId && eligible) sessions.add(session);
    } else if (r.loop === "B" && r.concept) {
      retain[r.concept] = retentionStep(retain[r.concept] || null, {
        itemId: r.itemId, correct: r.correct, conf: r.confidence,
        target: cfg.target, deadline: cfg.deadline, now: r.ts
      });
    } else if (r.loop === "A" && r.itemId) {
      /* The quiz records prediction and outcome in one row. */
      study[r.itemId] = rateStep(study[r.itemId] || null,
        r.confidence == null ? null : r.confidence === "sure",
        r.correct, r.ts);

      /* T18: a confident miss recruits the concept into Loop B at a short
         interval. It is re-derived rather than logged, because the event that
         causes it is already here. */
      if (r.concept && r.confidence === "sure" && !r.correct) {
        const c = retain[r.concept] || null;
        retain[r.concept] = { ...(c || blankish()), dueAt: r.ts + DAY };
      }
    }
  }
  return { retain, study, ts: last, sessions: [...sessions] };
}

const blankish = () =>
  ({ s: 0, d: 0, last: 0, reps: 0, items: [], relearnDays: [], ok: false });

/**
 * Rebuild one course from the log and write it back.
 * `course` is the loaded course object; `cid` its folder id.
 */
export function rebuild(cid, course) {
  const cfg = configOf(course);
  let prior = readCkpt(cid);
  const allRows = migrateLegacyRows(logRows().filter(r => r.course === cid), course.legacyQuestionAliases);
  const mappingVersion = JSON.stringify(course.legacyQuestionAliases || {});
  const covered = new Set(prior?.eventIds || []);
  let rows = allRows.filter(r=>!covered.has(r.id));
  if (prior && (prior.mappingVersion !== mappingVersion || !prior.eventIds ||
    rows.some(r=>r.ts <= prior.ts || r.event === 'rubric-score'))) { prior = null; rows = allRows; }
  // An imported older row, tied timestamp or new alias needs a complete fold.
  const next = rows.length || !prior ? fold(rows, cfg, prior || undefined) : prior;
  next.eventIds = allRows.map(r=>r.id);
  next.mappingVersion = mappingVersion;
  installRetention(cid, next.retain);

  // Local lesson answers are not scheduling data and never enter the sync log.
  let answers, policy, legacy, session;
  try { const stored = JSON.parse(getItem(keyFor(cid, course.code))); answers = stored?.answers; policy = stored?.policy; legacy = stored?.q; session = stored?.session; } catch {}
  for (const [oldId, newId] of Object.entries(course.legacyQuestionAliases || {})) {
    if (legacy?.[oldId] && !legacy[newId]) legacy[newId] = legacy[oldId];
    if (answers?.[oldId] && !answers[newId]) answers[newId] = answers[oldId];
  }
  setItem(keyFor(cid, course.code), JSON.stringify({ q: { ...legacy, ...next.study }, ...(answers && { answers }), ...(policy && { policy }), ...(session && { session }) }));
  setItem(ckptKey(cid), JSON.stringify(next));
  forget(cid);
  return next;
}

/** Drop a checkpoint, so the next rebuild folds that course's whole log. */
export const invalidate = cid => removeItem(ckptKey(cid));
