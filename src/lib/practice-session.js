import { ignoredAttemptIds, scoredEvents } from './evidence.js';
const questionId = q => q.item ? `${q.cid}:${q.item.id}` : q.id;

/* Keep navigation and the visible response, but retract its result and any
 * unattempted retry that was queued solely because of that result. */
export function ignoreSessionAnswer(run, itemId) {
  return reviseSessionAnswer(run, itemId, { ignored: true, correct: null, firstUnaided: null,
    selfChecked: false, score: null, maxScore: null });
}

export function reviseSessionAnswer(run, itemId, outcome) {
  if (!run) return run;
  const sources = run.retrySources || {};
  const removed = new Set(run.items.slice(run.at + 1).map(questionId)
    .filter(id => sources[id]?.itemId === itemId));
  const released = new Set([...removed].map(id => sources[id].key));
  return { ...run,
    results: [...run.results.filter(r => r.id !== itemId), { ...run.results.find(r => r.id === itemId),
      id: itemId, ...outcome }],
    items: run.items.filter((q, i) => i <= run.at || !removed.has(questionId(q))),
    retries: (run.retries || []).filter(key => !released.has(key)),
    retryIds: (run.retryIds || []).filter(id => !removed.has(id)),
    retrySources: Object.fromEntries(Object.entries(sources).filter(([id]) => !removed.has(id)))
  };
}

export function reconcileSession(run, rows) {
  if (!run) return run;
  const ignored = ignoredAttemptIds(rows);
  const revised = new Map(scoredEvents(rows).filter(r => r.event === 'attempt' && r.gradeRevised).map(r => [r.attemptId, r]));
  for (const result of run.results || []) {
    const attemptId = result.attemptId || rows.find(r => r.event === 'attempt' &&
      r.itemId === result.id && r.sessionId === run.sessionId)?.attemptId;
    if (ignored.has(attemptId)) run = ignoreSessionAnswer(run, result.id);
    else if (revised.has(attemptId)) {
      const r = revised.get(attemptId);
      run = reviseSessionAnswer(run, result.id, { correct: r.correct, firstUnaided: r.firstUnaided,
        gradeRevised: true, gradeSource: r.gradeSource, selfChecked: r.selfChecked, score: r.score, maxScore: r.maxScore, status: r.status });
    }
  }
  return run;
}
