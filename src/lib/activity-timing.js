const stamp = n => Number.isSafeInteger(n) && n >= 0;
const validRange = r => Array.isArray(r) && r.length === 2 && r.every(n => Number.isFinite(n) && n >= 0) && r[0] <= r[1];

/** Explicit work intervals exclude pauses/background time. A caller must close
 * the current interval on interruption; wall time alone never estimates work. */
export function measuredActivityTiming(intervals, { startedAt, endedAt, interrupted = false } = {}) {
  if (!stamp(startedAt) || !stamp(endedAt) || endedAt < startedAt || typeof interrupted !== 'boolean' ||
      !Array.isArray(intervals) || intervals.length > 1000) throw new Error('Bounded intervals and explicit clock bounds required');
  let cursor = startedAt, activeMs = 0, setupMs = 0;
  for (const interval of intervals) {
    if (!['active', 'setup'].includes(interval.phase) || !stamp(interval.start) || !stamp(interval.end) ||
        interval.start < cursor || interval.end < interval.start || interval.end > endedAt)
      throw new Error('Ordered nonoverlapping work intervals required');
    if (interval.phase === 'active') activeMs += interval.end - interval.start;
    else setupMs += interval.end - interval.start;
    cursor = interval.end;
  }
  return { activeMs, setupMs, wallMs: endedAt - startedAt, source: 'measured', interrupted };
}

/** External durations remain explicit reports even when entered by this device. */
export function reportedActivityTiming({ activeMs = null, setupMs = null, wallMs = null, interrupted = false } = {}) {
  if (![activeMs, setupMs, wallMs].every(n => n === null || stamp(n)) || typeof interrupted !== 'boolean' ||
      wallMs !== null && activeMs !== null && setupMs !== null && activeMs + setupMs > wallMs)
    throw new Error('Valid reported durations required');
  return { activeMs, setupMs, wallMs, source: 'external-report', interrupted };
}

// Observations can widen an authored range, never squeeze a lab to fit a budget.
// Interrupted attempts are useful time records but incomplete duration samples.
export function activityTimeRange(authored, observations = []) {
  if (authored !== undefined && !validRange(authored)) throw new Error('Valid authored seconds range required');
  const samples = observations.filter(o => !o.interrupted && o.ms !== null && stamp(o.ms));
  const values = samples.map(o => o.ms / 1000);
  if (authored) values.push(...authored);
  if (!values.length) return null;
  const lower = Math.min(...values), upper = Math.max(...values);
  return { lower, typical: values.reduce((sum, n) => sum + n, 0) / values.length, upper,
    sources: [...new Set([...(authored ? ['authored'] : []), ...samples.map(o => o.source)])] };
}
