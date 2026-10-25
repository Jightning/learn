import { append, forCourse } from './log.js';
import { ignoredAttemptIds } from './evidence.js';
import { rebuild } from './replay.js';
import { flush } from './store.js';

/* One mutation path for lessons, practice and checks. The immutable void is
 * authoritative after sync, even if an older editable answer arrives later. */
export async function ignoreAnswer({ cid, C, state }, item, attempt) {
  if (!state.on || !attempt.attemptId || !attempt.feedback) throw new Error('A saved answer is required.');
  if (!ignoredAttemptIds(forCourse(cid, C)).has(attempt.attemptId))
    append({ id: `${attempt.attemptId}:void`, course: cid, event: 'attempt-void',
      attemptId: attempt.attemptId, itemId: item.id });
  const feedback = { ...attempt.feedback, recorded: true, ignored: true };
  await state.saveAttempt(item.id, { ...attempt, feedback });
  rebuild(cid, C);
  state.refresh();
  await flush();
  return feedback;
}
