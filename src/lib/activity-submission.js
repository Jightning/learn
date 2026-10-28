import { activityInputHash, activityEventCompatibility } from './activity-events.js';
import { validateAdapterRequest } from './activity-adapters.js';
import { recordActivityEvent, saveActivityDraft, rebuildActivityState } from './mastery-state.js';
import { flush } from './store.js';

export const submissionSession = activity => `submission:${activity.id}:${activity.evidenceVersion}:${activity.rubricVersion}`;
const activityFor = (C, id) => {
  const activity = C.activityIndex?.activities[id];
  if (!activity || !['external-lab', 'written-defense'].includes(activity.kind) || activity.availability !== 'available')
    throw new Error('External submission or written defense required');
  return activity;
};
export const submissionsFor = (state, id) => state.rows.filter(r => r.event === 'activity-submission' && r.request.activityId === id);

// Follow-up provenance is a reviewer claim. It never supplies verification IDs.
export function defenseComplete(state, id) {
  const rows = submissionsFor(state, id);
  const initial = rows.filter(row => !row.request.input.followup).at(-1);
  return !!initial && rows.some(row => row.request.input.followup?.submissionHash === initial.request.submissionHash && rows.indexOf(row) > rows.indexOf(initial));
}

export function feedbackReady(C, state, id) {
  const activity = activityFor(C, id);
  const defenses = activity.kind === 'written-defense' ? [activity] : Object.values(C.activityIndex.activities)
    .filter(a => a.kind === 'written-defense' && a.after.includes(id));
  return defenses.every(a => {
    const initial = submissionsFor(state, a.id).filter(r => !r.request.input.followup).at(-1);
    const dependencies = a.after.flatMap(id => submissionsFor(state, id));
    return defenseComplete(state, a.id) && dependencies.every(row => state.rows.indexOf(row) < state.rows.indexOf(initial));
  });
}

export async function saveSubmissionDraft(cid, C, id, input, context) {
  activityFor(C, id);
  await saveActivityDraft(cid, C, id, input, { context });
  await flush();
}

export async function commitSubmission(cid, C, id, input, context, attempt = crypto.randomUUID()) {
  input = structuredClone(input); context = structuredClone(context);
  const activity = activityFor(C, id), now = Date.now();
  const state = await rebuildActivityState(cid, C, { now });
  const request = { schemaVersion: 1, adapter: activity.adapter, courseId: C.code, activityId: id,
    attemptId: attempt, nonce: attempt, contentVersion: activity.contentVersion,
    evidenceVersion: activity.evidenceVersion, rubricVersion: activity.rubricVersion,
    submissionHash: await activityInputHash(input), input };
  const errors = [];
  if (!validateAdapterRequest(request, activity, errors)) throw new Error(errors.join('; '));
  if (input.followup && submissionsFor(state, id).filter(r => !r.request.input.followup).at(-1)?.request.submissionHash !== input.followup.submissionHash)
    throw new Error('Save the initial explanation before answering its follow-up');
  if (submissionsFor(state, id).some(r => r.request.submissionHash === request.submissionHash))
    throw new Error('This input is already committed; start changed work as a new attempt');
  const row = await recordActivityEvent(cid, C, { event: 'activity-submission', request,
    compatibility: await activityEventCompatibility(C, id), assistance: context.assistance,
    timing: context.timing, environment: context.environment }, { now, sessionId: submissionSession(activity) });
  await flush();
  await saveSubmissionDraft(cid, C, id, null);
  return row;
}

export async function importSubmissionResult(cid, C, submissionId, result) {
  const now = Date.now(), state = await rebuildActivityState(cid, C, { now });
  const submission = state.rows.find(r => r.id === submissionId && r.event === 'activity-submission');
  if (!submission || !feedbackReady(C, state, submission.request.activityId)) throw new Error('Save the written defense and fresh follow-up before feedback');
  if (state.rows.some(r => r.event === 'activity-evaluation' && r.submissionId === submissionId)) throw new Error('A result is already recorded for this submission');
  const activity = activityFor(C, submission.request.activityId);
  const row = await recordActivityEvent(cid, C, { event: 'activity-evaluation', submissionId, result },
    { now, sessionId: submissionSession(activity) });
  await flush();
  return row;
}

export async function revealSubmissionFeedback(cid, C, evaluationId) {
  const state = await rebuildActivityState(cid, C, { now: Date.now() });
  const evaluation = state.rows.find(r => r.event === 'activity-evaluation' && r.id === evaluationId);
  const submission = evaluation && state.rows.find(r => r.id === evaluation.submissionId);
  if (!submission || !feedbackReady(C, state, submission.request.activityId)) throw new Error('Save the written defense and fresh follow-up before feedback');
  if (!state.rows.some(r => r.event === 'activity-feedback' && r.evaluationId === evaluationId)) {
    await recordActivityEvent(cid, C, { event: 'activity-feedback', evaluationId },
      { sessionId: submissionSession(activityFor(C, submission.request.activityId)) });
  }
  await flush();
}
