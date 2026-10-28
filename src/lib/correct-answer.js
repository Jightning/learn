import { append, forCourse } from './log.js';
import { scoredEvents } from './evidence.js';
import { rebuild } from './replay.js';
import { flush } from './store.js';

/* Keep the checker result immutable; all consumers project the learner revision. */
export async function correctAnswer({ cid, C, state }, item, attempt) {
  if (!state.on || !attempt.attemptId || !attempt.feedback || attempt.feedback.skipped || attempt.feedback.ignored)
    throw new Error('A submitted answer is required.');
  const rows = forCourse(cid, C);
  const original = scoredEvents(rows).find(r => r.event === 'attempt' && r.attemptId === attempt.attemptId);
  if (!original || original.voided) throw new Error('A recorded answer is required.');
  if (!rows.some(r => r.id === `${attempt.attemptId}:correct`))
    append({ id: `${attempt.attemptId}:correct`, course: cid, event: 'grade-revision',
      attemptId: attempt.attemptId, itemId: item.id, correct: true, selfChecked: true,
      grader: 'self', gradeSource: 'self', score: original.maxScore || 1, maxScore: original.maxScore || 1,
      criteria: (original.criteria || []).map(c => ({ ...c, correct: true, score: c.maxScore })) });
  const feedback = { ...attempt.feedback, recorded: true, correct: true, gradeRevised: true,
    gradeSource: 'self', score: original.maxScore || 1, maxScore: original.maxScore || 1 };
  await state.saveAttempt(item.id, { ...attempt, feedback });
  rebuild(cid, C);
  state.refresh();
  await flush();
  return feedback;
}
