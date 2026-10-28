/* Answers are independent keys: editing question A cannot overwrite B. The
 * study snapshot remains a local read model for scheduling and older builds. */
import { getItem, setItem, keys } from './store.js';
import { setPref, dropPref, hasPref, apply, prefTimestamp, mine } from './prefs.js';

export const learnerKey = (studyKey, kind, id = '') =>
  `learner:${encodeURIComponent(studyKey)}:${kind}:${encodeURIComponent(id)}`;

export function readLearner(studyKey, kind, id, fallback, resetAt = 0) {
  const key = learnerKey(studyKey, kind, id);
  if (!hasPref(key)) return fallback;
  if (resetAt && prefTimestamp(key) <= resetAt) return null;
  try { return JSON.parse(getItem(key)); } catch { return null; }
}

export function writeLearner(studyKey, kind, id, value) {
  const key = learnerKey(studyKey, kind, id);
  if (value == null) dropPref(key); else setPref(key, JSON.stringify(value));
}

/* Old saved answers must travel even if their course has not been opened.
 * Stamp unknown dates as 1, so they lose to every actual dated edit/deletion. */
export function migrateLearnerPrefs() {
  for (const key of keys().filter(k => k.startsWith('study:'))) {
    let data;
    try { data = JSON.parse(getItem(key)); } catch { continue; }
    for (const [kind, values] of [['answer', data?.answers], ['rating', data?.q],
      ['policy', { '': data?.policy }], ['session', { '': data?.session }]]) {
      for (const [id, value] of Object.entries(values || {})) {
        const target = learnerKey(key, kind, id);
        if (value != null && !hasPref(target)) seed(target, JSON.stringify(value));
      }
    }
  }
}

const seed = (k, v) => apply([{ k, v, ts: 1 }]);

export function learnerRatings(studyKey) {
  const prefix = learnerKey(studyKey, 'rating');
  return Object.fromEntries(keys().filter(k => k.startsWith(prefix)).flatMap(k => {
    try { return [[decodeURIComponent(k.slice(prefix.length)), JSON.parse(getItem(k))]]; }
    catch { return []; }
  }));
}

export function dropLearner(studyKey) {
  const prefix = `learner:${encodeURIComponent(studyKey)}:`;
  for (const key of keys()) if (key.startsWith(prefix)) dropPref(key);
}

/* A reviewed alias applies to received independent keys as well as snapshots.
 * Keep the original timestamp/revision, including tombstones, so migration
 * cannot turn an old answer into a newer edit or resurrect a cleared answer. */
export function migrateLearnerAliases(studyKey, aliases = {}) {
  const saved = new Map(mine().map(p => [p.k, p]));
  for (const [oldId, id] of Object.entries(aliases)) {
    for (const kind of ['answer', 'rating']) {
      const old = saved.get(learnerKey(studyKey, kind, oldId));
      if (old) {
        const incoming = [{ ...old, k:learnerKey(studyKey, kind, id) }];
        preserveReplacedAnswers(incoming);
        apply(incoming);
      }
    }
  }
}

export function answerHistory(studyKey, questionId) {
  const prefix = learnerKey(studyKey, 'history');
  return keys().filter(k => k.startsWith(prefix)).flatMap(k => {
    try { const saved = JSON.parse(getItem(k)); return saved?.questionId === questionId ? [saved.attempt] : []; }
    catch { return []; }
  });
}

/* A received answer to a different version must not erase the local version's
 * response before it can be archived by saveAttempt. Do not archive deletions. */
export function preserveReplacedAnswers(incoming) {
  const local = new Map(mine().map(p => [p.k, p]));
  for (const p of incoming) {
    const match = /^learner:([^:]+):answer:(.*)$/.exec(p.k);
    const previous = local.get(p.k);
    if (!match || !previous?.v || p.v == null || p.ts < previous.ts ||
        (p.ts === previous.ts && (p.rev || '') <= (previous.rev || ''))) continue;
    try {
      const old = JSON.parse(previous.v), next = JSON.parse(p.v);
      if (!old || !next || old.signature === next.signature) continue;
      const studyKey = decodeURIComponent(match[1]), questionId = decodeURIComponent(match[2]);
      writeLearner(studyKey, 'history', `${questionId}:${old.attemptId || old.started || 'legacy'}`, {questionId,attempt:old});
    } catch { /* Legacy malformed snapshots have no recoverable answer. */ }
  }
}

/* These envelopes own their edit stamps. mastery-sync.js transports them
 * independently of prefs.isPref, including embedded null tombstones. */
export function writeActivityDraft(cid, identity, value, ts) {
  const key = learnerKey(`mastery:${cid}`, 'activity-draft', identity);
  const previous = readActivityDrafts(cid).find(p => p.k === key);
  const record = { k: key, ts: Math.max(ts, (previous?.ts || 0) + 1),
    rev: crypto.randomUUID(), value };
  setItem(key, JSON.stringify(record));
  return record;
}

export function readActivityDrafts(cid) {
  const prefix = learnerKey(`mastery:${cid}`, 'activity-draft');
  return keys().filter(k => k.startsWith(prefix)).sort().map(k => {
    try { return JSON.parse(getItem(k)); }
    catch { throw new Error('Unreadable activity draft; preserve storage and restore a valid backup'); }
  });
}
