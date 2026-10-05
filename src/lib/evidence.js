/* Evidence is descriptive; the recent fraction is never a passing probability. */
export const POLICY = Object.freeze({ version: 1, window: 8, decay: 0.8,
  coverageEvery: 3, repairMisses: 2, freshnessDays: 30, timingBatch: 5 });
export const orderEvents = rows => [...new Map(rows.map(r => [r.id, r])).values()]
  .sort((a, b) => a.ts - b.ts || String(a.id).localeCompare(String(b.id)));

export function scoredEvents(rows) {
  const ratings = new Map(orderEvents(rows).filter(r=>r.event === 'rubric-score').map(r=>[r.attemptId,r]));
  return orderEvents(rows).map(r=>r.event === 'attempt' && r.selfChecked && r.firstUnaided == null && ratings.has(r.attemptId)
    ? { ...r, firstUnaided: ratings.get(r.attemptId).correct, correct: ratings.get(r.attemptId).correct, assisted: false, rubricScored: true } : r);
}
export function observations(rows, typeId, version) {
  const seenItems = new Set(), seenGroups = new Set(), out = [];
  for (const r of scoredEvents(rows)) {
    if (r.event === 'exposure') { if (r.beforeSubmission !== false) seenItems.add(r.itemId); continue; }
    if (r.typeId !== typeId || (version && r.contentVersion !== version)) continue;
    const repeated = seenItems.has(r.itemId); seenItems.add(r.itemId);
    const group = `${r.sessionId}:${r.group || `${typeId}:default`}`;
    if (r.firstUnaided == null || r.skipped || r.assisted || repeated || seenGroups.has(group)) continue;
    seenGroups.add(group); out.push({ ...r, weight: r.selfChecked ? 0.5 : 1 });
  }
  return out;
}
export function recentPerformance(rows, typeId, versions) {
  const all = observations(rows, typeId).filter(r => !versions || versions[r.itemId] === r.contentVersion), recent = all.slice(-POLICY.window);
  let earned = 0, total = 0;
  recent.forEach((r, j) => { const w = r.weight * POLICY.decay ** (recent.length - 1 - j);
    earned += w * Number(r.firstUnaided); total += w; });
  return { fraction: total ? earned / total : null, n: recent.length,
    misses: recent.slice(-2).filter(r => !r.firstUnaided).length,
    last: recent.at(-1)?.ts || 0, groups: new Set(recent.map(r => r.group)).size };
}
export const exposedItems = rows => new Set(rows.filter(r => r.event === 'exposure' || r.event === 'attempt' || r.loop === 'Q').map(r => r.itemId));

const median = values => { const a = [...values].sort((a,b) => a-b), m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2; };
export function fluencyTrend(rows, typeId, group, format) {
  const usable = observations(rows, typeId).filter(r => r.firstUnaided && r.group === group &&
    r.format === format && !r.timingFlags?.length && Number.isFinite(r.activeMs) && r.activeMs > 0);
  if (usable.length < POLICY.timingBatch * 2) return null;
  const logs = usable.map(r => Math.log(r.activeMs)), center = median(logs), mad = median(logs.map(t => Math.abs(t-center)));
  const filtered = mad ? usable.filter(r => Math.abs(Math.log(r.activeMs)-center) <= 3 * 1.4826 * mad) : usable;
  if (filtered.length < POLICY.timingBatch * 2) return null;
  return { rule: 'within-type-log-mad-v1', earlierMs: median(filtered.slice(-10,-5).map(r=>r.activeMs)),
    recentMs: median(filtered.slice(-5).map(r=>r.activeMs)), excluded: usable.length-filtered.length };
}

/* Additional observable skills remain provisional: never an outcome or schedule. */
export function provisionalDemonstrations(rows) {
  const result = {};
  for (const typeId of new Set(rows.map(r=>r.typeId).filter(Boolean))) {
    for (const r of observations(rows,typeId)) if (r.firstUnaided)
      for (const target of new Set(r.demonstrates || [])) if (target !== typeId) result[target] = { source: r.id, ts: r.ts, provisional: true };
  }
  return result;
}
