/* Answers are independent keys: editing question A cannot overwrite B. The
 * study snapshot remains a local read model for scheduling and older builds. */
import { getItem, keys } from './store.js';
import { setPref, dropPref, hasPref, apply, prefTimestamp } from './prefs.js';

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
