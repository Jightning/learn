import { rebuildActivityState } from './mastery-state.js';
import { masteryActionPlan } from './mastery-actions.js';
import { readLearner, writeLearner } from './learner-prefs.js';
import { getItem, flush } from './store.js';

const key = cid => `study:${cid}`;
const reset = cid => Number(getItem(`reset:${cid}`)) || 0;
export function pathSettings(cid) {
  const saved = readLearner(key(cid), 'policy', 'mastery-path', null, reset(cid));
  return { wave: Number.isSafeInteger(saved?.wave) && saved.wave > 0 ? saved.wave : 1,
    minutes: [15, 30, 60, 120].includes(saved?.minutes) ? saved.minutes : 30,
    placement: saved?.placement === true };
}
export async function savePathSettings(cid, settings) {
  writeLearner(key(cid), 'policy', 'mastery-path', settings);
  await flush();
}
export async function exposeLesson(cid, lesson) {
  writeLearner(key(cid), 'policy', `exposure:${lesson}`, true);
  await flush();
}
export function availableEnvironment(cid, C) {
  return new Set(Object.values(C.activityIndex.activities).flatMap(a => a.environment?.capabilities || [])
    .filter(id => readLearner(key(cid), 'policy', `environment:${id}`, false, reset(cid)) === true));
}
export async function setEnvironment(cid, capability, available) {
  writeLearner(key(cid), 'policy', `environment:${capability}`, available === true);
  await flush();
}
export async function loadMasteryPath(cid, C, now = Date.now()) {
  if (!C.mastery) return null;
  const settings = pathSettings(cid);
  const lessons = [...new Set(Object.values(C.activityIndex.activities).map(a => a.lesson))];
  const exposure = new Set(lessons.filter(id => readLearner(key(cid), 'policy', `exposure:${id}`, false, reset(cid)) === true));
  const state = await rebuildActivityState(cid, C, { now });
  if (!state?.projection) throw new Error('Mastery evidence could not be rebuilt');
  // Unknown reading estimates stay unknown; do not manufacture a duration.
  const plan = await masteryActionPlan(C, state.projection, state.rows, {
    ...settings, now, environment: availableEnvironment(cid, C), availableSeconds: settings.minutes * 60, exposure
  });
  if (!plan) throw new Error('Required action plan could not be validated');
  return { state, plan, settings };
}
export const actionHref = (cid, action) => `#/${encodeURIComponent(cid)}/activity/${encodeURIComponent(action.id)}`;
export function reasonText(reason) {
  const labels = {
    'teaching-exposure': 'Read the lesson first', 'prerequisite-anchor': 'Prerequisite evidence needed',
    'prior-activity': 'Earlier activity needed', 'sequence-gate': 'Earlier required step needed',
    'adapter-unavailable': 'Activity adapter unavailable', 'environment-unavailable': 'Required environment unavailable',
    'exhausted-inventory': 'Fresh inventory exhausted', 'unknown-duration': 'Duration unknown',
    'session-too-short': 'Choose a longer session', 'session-capacity': 'Fits a later session',
    'awaiting-delay-evidence': 'Independent evidence needed before delay starts',
    'awaiting-review': 'Awaiting verified review', 'review-unavailable': 'Reviewer unavailable',
    'execution-error': 'Check the execution environment', 'repair-limit': 'Request review before retrying',
    'repair-needed': 'Review another explanation', 'future-wave': 'Choose a later wave'
  };
  if (reason.code === 'waiting-for-delay') return `Waiting until ${new Date(reason.readyAt).toLocaleString()}`;
  return labels[reason.code] || reason.code;
}
