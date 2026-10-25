import { ignoredAttemptIds } from './evidence.js';
const questionId = q => q.item ? `${q.cid}:${q.item.id}` : q.id;

/* Keep navigation and the visible response, but retract its result and any
 * unattempted retry that was queued solely because of that result. */
export function ignoreSessionAnswer(run, itemId) {
  if (!run) return run;
  const sources = run.retrySources || {};
  const removed = new Set(run.items.slice(run.at + 1).map(questionId)
    .filter(id => sources[id]?.itemId === itemId));
  const released = new Set([...removed].map(id => sources[id].key));
  return { ...run,
    results: [...run.results.filter(r => r.id !== itemId), { ...run.results.find(r => r.id === itemId),
      id: itemId, ignored: true, correct: null, firstUnaided: null, selfChecked: false, score: null, maxScore: null }],
    items: run.items.filter((q, i) => i <= run.at || !removed.has(questionId(q))),
    retries: (run.retries || []).filter(key => !released.has(key)),
    retryIds: (run.retryIds || []).filter(id => !removed.has(id)),
    retrySources: Object.fromEntries(Object.entries(sources).filter(([id]) => !removed.has(id)))
  };
}

export function reconcileSession(run, rows) {
  if (!run) return run;
  const ignored = ignoredAttemptIds(rows);
  for (const result of run.results || []) {
    const attemptId = result.attemptId || rows.find(r => r.event === 'attempt' &&
      r.itemId === result.id && r.sessionId === run.sessionId)?.attemptId;
    if (ignored.has(attemptId)) run = ignoreSessionAnswer(run, result.id);
  }
  return run;
}
