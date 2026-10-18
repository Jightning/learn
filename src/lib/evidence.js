/* Descriptive evidence rules, shared by practice, assessment and Learn-by.
 * Counts describe observations; they are not calibrated mastery probabilities. */
export const POLICY = Object.freeze({ version: 2, window: 8, decay: 0.8,
  minimumIndependent: 2, coverageEvery: 3, repairMisses: 2, repairBudget: 3,
  freshnessDays: 30, timingBatch: 5 });
export const orderEvents = rows => [...new Map(rows.map(r => [r.id, r])).values()]
  .sort((a, b) => a.ts - b.ts || String(a.id).localeCompare(String(b.id)));
export const skillsOf = r => r.skills?.length ? r.skills : r.typeId ? [r.typeId] : r.concept ? [r.concept] : [];
export const isJoint = r => skillsOf(r).length > 1 || !!r.routes?.length;
export const hasSupport = r => r.assisted || r.dependent || r.methodCued === true || (Array.isArray(r.support) ? r.support.length > 0 : !!r.support);
export function currentEvidence(r, bank) {
  const parent = r.parentId && bank?.[r.parentId];
  const q = bank?.[r.itemId] || parent;
  const expectedVersion = parent && r.stepId ? `${q.contentVersion}:step:${r.stepId}` : q?.contentVersion;
  if (r.schemaVersion === 2 && !q) return false;
  const compatibleLegacy = !r.evidenceVersion && q?.schemaVersion === 1 && q.legacyContentVersion === r.contentVersion;
  return !q || (!q.quarantined && (!expectedVersion || expectedVersion === r.contentVersion || compatibleLegacy) &&
    (!r.evidenceVersion || !q.evidenceVersion || q.evidenceVersion === r.evidenceVersion));
}
export function scoredEvents(rows) {
  const ordered = orderEvents(rows);
  const ratings = new Map(ordered.filter(r => r.event === 'rubric-score' || r.event === 'grade-revision').map(r => [r.attemptId, r]));
  const voided = new Set(ordered.filter(r => r.event === 'attempt-void').map(r => r.attemptId));
  return ordered.map(r => {
    if (r.event !== 'attempt') return r;
    if (voided.has(r.attemptId)) return { ...r, firstUnaided: null, voided: true };
    const rating = ratings.get(r.attemptId);
    if (!rating || (!r.selfChecked && rating.event !== 'grade-revision')) return r;
    return { ...r, firstUnaided: rating.correct, correct: rating.correct,
      assisted: rating.event === 'rubric-score' && r.firstUnaided == null ? false : r.assisted,
      rubricScored: true, grader: rating.grader || 'self' };
  });
}
/* Includes repetitions for recovery and retention; independence is added below. */
export function performanceEvents(rows, typeId, { bank, version } = {}) {
  const seenItems = new Set(), seenGroups = new Set(), out = [];
  for (const raw of scoredEvents(rows)) {
    if (raw.event === 'exposure') { if (raw.beforeSubmission !== false) seenItems.add(raw.itemId); continue; }
    if (raw.event !== 'attempt' || raw.voided) continue;
    const q = bank?.[raw.itemId];
    const r = { ...q, ...raw, skills: raw.skills || q?.skills, routes: raw.routes || q?.routes };
    const repeated = seenItems.has(r.itemId); seenItems.add(r.itemId);
    if (!skillsOf(r).includes(typeId) || !currentEvidence(r, bank) || (version && r.contentVersion !== version)) continue;
    const group = r.group || `${typeId}:unknown`;
    const independent = !repeated && !seenGroups.has(group);
    if (!r.skipped && r.firstUnaided != null) seenGroups.add(group);
    out.push({ ...r, repeated, independent, joint: isJoint(r), weight: 1 });
  }
  return out;
}
export function observations(rows, typeId, version) {
  return performanceEvents(rows, typeId, { version }).filter(r => r.firstUnaided != null && !r.skipped &&
    !hasSupport(r) && !r.joint && r.independent);
}
export function recentPerformance(rows, typeId, versions) {
  const all = performanceEvents(rows, typeId).filter(r => r.firstUnaided != null && !r.skipped && !hasSupport(r) && !r.joint &&
    (!versions || !Object.hasOwn(versions, r.itemId) || versions[r.itemId] === r.contentVersion));
  const recent = all.slice(-POLICY.window);
  let earned = 0, total = 0;
  recent.forEach((r, j) => { const w = POLICY.decay ** (recent.length - 1 - j); earned += w * Number(r.firstUnaided); total += w; });
  return { fraction: total ? earned / total : null, n: recent.length,
    misses: recent.slice(-2).filter(r => !r.firstUnaided).length,
    last: recent.at(-1)?.ts || 0, groups: new Set(recent.map(r => r.group)).size };
}
export const exposedItems = rows => new Set(rows.filter(r => r.event === 'exposure' || r.event === 'attempt' || r.loop === 'Q').map(r => r.itemId));
const median = values => { const a = [...values].sort((a, b) => a-b), m = Math.floor(a.length / 2);
  return a.length ? a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2 : null; };
const targetTask = r => !r.demand || r.demand === 'standard';
const reliable = r => !r.selfChecked || r.grader === 'human' || r.grader === 'reviewed-rubric';
export function skillState(id, rows, { bank, now = Date.now(), standard, skill } = {}) {
  const all = performanceEvents(rows, id, { bank });
  const valid = all.filter(r => !r.skipped && r.firstUnaided != null);
  const direct = valid.filter(r => !r.joint && !hasSupport(r));
  const measured = direct.filter(targetTask);
  const qualifying = measured.filter(r => r.independent && reliable(r));
  const lastMiss = measured.filter(r => !r.firstUnaided).at(-1)?.ts ?? -Infinity;
  const successes = qualifying.filter(r => r.firstUnaided);
  const recovered = successes.filter(r => r.ts > lastMiss);
  const requiredRepresentations = standard?.requirements?.representations?.[id] || skill?.representations || [];
  const requiredIntegrations = (standard?.requirements?.integrations || []).filter(set => set.includes(id));
  const reps = new Set(recovered.map(r => r.representation).filter(Boolean));
  const missingRepresentations = requiredRepresentations.filter(r => !reps.has(r));
  const joint = valid.filter(r => r.joint);
  const integrations = requiredIntegrations.map(set => {
    const matches = joint.filter(r => r.firstUnaided && !hasSupport(r) && targetTask(r) && reliable(r) && r.independent && !r.routes?.length &&
      set.every(s => skillsOf(r).includes(s)) && !joint.some(later => later.ts > r.ts && later.firstUnaided === false &&
        set.every(s => skillsOf(later).includes(s))));
    return { skills: set, supported: matches.length > 0, fresh: matches.some(r => now-r.ts <= POLICY.freshnessDays*864e5) };
  });
  const missingIntegrations = integrations.filter(x => !x.supported).map(x => x.skills);
  const achieved = successes.length >= POLICY.minimumIndependent;
  const supported = recovered.length >= POLICY.minimumIndependent && recovered.some(r => r.methodCued === false || r.context === 'check') && !missingRepresentations.length && !missingIntegrations.length;
  const last = measured.at(-1)?.ts || 0;
  const freshRecovered = recovered.filter(r => now-r.ts <= POLICY.freshnessDays*864e5);
  const freshReps = new Set(freshRecovered.map(r => r.representation).filter(Boolean));
  const missingFreshRepresentations = requiredRepresentations.filter(r => !freshReps.has(r));
  const missingFreshIntegrations = integrations.filter(x => !x.fresh).map(x => x.skills);
  const freshSupported = freshRecovered.length >= POLICY.minimumIndependent && freshRecovered.some(r => r.methodCued === false || r.context === 'check') &&
    !missingFreshRepresentations.length && !missingFreshIntegrations.length;
  const stale = supported && !freshSupported;
  const contradictions = lastMiss > (successes.at(-1)?.ts ?? -Infinity) || (lastMiss > -Infinity && recovered.length < POLICY.minimumIndependent)
    ? measured.filter(r => !r.firstUnaided && r.ts >= lastMiss) : [];
  const recent = measured.slice(-POLICY.window), n = recent.length;
  const p = (1 + recent.filter(r => r.firstUnaided).length) / (2 + n);
  const timing = valid.filter(r => !r.timingFlags?.length && r.activeMs > 0).map(r => r.activeMs/1000);
  const inventory = bank ? Object.values(bank).filter(q => skillsOf(q).includes(id) && !isJoint(q) && targetTask(q) && !hasSupport(q)) : null;
  const independentInventory = inventory ? new Set(inventory.map(q => q.group || `${id}:unknown`)).size : null;
  return { ready: supported && freshSupported, supported, achieved, historicalAchievement: achieved, stale,
    n, p, seconds: median(timing), observations: qualifying, practice: valid, joint, contradictions, last,
    status: supported ? stale ? 'review' : 'supported' : contradictions.length ? 'contradicted' : valid.length ? 'developing' : 'unknown',
    coverage: { sampled: measured.length > 0, independent: recovered.length, representations: [...reps],
      missingRepresentations, missingIntegrations, freshIndependent: freshRecovered.length, missingFreshRepresentations, missingFreshIntegrations, inventoryLimited: independentInventory != null && independentInventory < POLICY.minimumIndependent },
    misses: measured.slice(-2).filter(r => !r.firstUnaided).length,
    uncertainty: supported ? 'baseline-supported' : 'insufficient-independent-evidence' };
}
export function fluencyTrend(rows, typeId, group, format) {
  const usable = performanceEvents(rows, typeId).filter(r => r.firstUnaided && !hasSupport(r) && !r.joint && r.group === group &&
    r.format === format && !r.timingFlags?.length && Number.isFinite(r.activeMs) && r.activeMs > 0);
  if (usable.length < POLICY.timingBatch*2) return null;
  const logs = usable.map(r => Math.log(r.activeMs)), center = median(logs), mad = median(logs.map(t => Math.abs(t-center)));
  const filtered = mad ? usable.filter(r => Math.abs(Math.log(r.activeMs)-center) <= 3*1.4826*mad) : usable;
  if (filtered.length < POLICY.timingBatch*2) return null;
  return { rule: 'within-type-log-mad-v1', earlierMs: median(filtered.slice(-10,-5).map(r => r.activeMs)),
    recentMs: median(filtered.slice(-5).map(r => r.activeMs)), excluded: usable.length-filtered.length };
}
export function provisionalDemonstrations(rows) {
  const result = {};
  for (const r of scoredEvents(rows)) if (r.event === 'attempt' && r.firstUnaided && !hasSupport(r) && !r.skipped)
    for (const target of new Set([...(r.demonstrates || []), ...(isJoint(r) ? skillsOf(r) : [])]))
      if (target !== r.typeId || isJoint(r)) result[target] = { source: r.id, ts: r.ts, provisional: true };
  return result;
}
