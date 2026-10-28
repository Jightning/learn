import { activityFixture } from './activities.mjs';
import { compileMastery } from '../../../src/lib/mastery-schema.js';
import { compileActivities } from '../../../src/lib/activity-schema.js';
import { masterySignatures } from '../../../src/lib/mastery-versions.js';
import { activityInputHash, activityEventCompatibility } from '../../../src/lib/activity-events.js';

export function persistenceCourse(edit = () => {}) {
  const f = activityFixture();
  f.C.code = 'synthetic';
  f.C.sections = [{ id: 's1', subs: [{ id: 's1-1' }] }];
  f.source.targets.roots = [f.source.targets.roots[0]];
  f.source.policies.policies[0].delayDays = [2];
  f.activities.activities = Array.from({ length: 4 }, (_, i) => ({
    ...structuredClone(f.activities.activities[2]), id: `task-${i}`, after: [], group: `group-${i}`
  }));
  edit(f);
  const errors = [];
  f.C.mastery = compileMastery(f.C, f.source, errors);
  f.C.activityIndex = compileActivities(f.C, f.C.mastery, f.activities, errors);
  if (errors.length) throw new Error(errors.join('; '));
  masterySignatures(f.C);
  return f.C;
}

export async function submissionFields(C, i, input = { text: `Independent explanation ${i}` }) {
  const activity = C.activityIndex.activities[`task-${i}`];
  return { event: 'activity-submission', request: { schemaVersion: 1, adapter: activity.adapter,
    courseId: C.code, activityId: activity.id, attemptId: `attempt-${i}`, nonce: `nonce-${i}`,
    contentVersion: activity.contentVersion, evidenceVersion: activity.evidenceVersion, rubricVersion: activity.rubricVersion,
    submissionHash: await activityInputHash(input), input }, compatibility: await activityEventCompatibility(C, activity.id),
    assistance: { sources: [], answerExposed: false },
    timing: { activeMs: null, setupMs: null, wallMs: null, source: 'external-report', interrupted: false },
    environment: { description: 'Synthetic environment' } };
}

export function evaluationFields(C, submission, now, outcome = 'pass') {
  const { input, ...binding } = submission.request;
  const a = C.activityIndex.activities[submission.request.activityId];
  return { event: 'activity-evaluation', submissionId: submission.id,
    result: { ...binding, status: 'complete', criteria: a.tests.flatMap(({ criteria, ...t }) => criteria.map(criterion => ({ ...t, criterion, outcome }))),
      provenance: { kind: 'reviewer-claim', reviewerId: 'human', issuedAt: now } } };
}
