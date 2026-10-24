/* Durable wall deadlines enforce limits; active study time is measured elsewhere.
 * A local clock is useful for practice, not a proctoring authority. */
export function validateTiming(value, where, errors) {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(k => !['limitSeconds', 'mode'].includes(k)) ||
      !Number.isFinite(value.limitSeconds) || value.limitSeconds <= 0 || value.limitSeconds > 86400 ||
      (value.mode !== undefined && !['strict', 'pacing'].includes(value.mode)))
    errors.push(`${where}: timing needs limitSeconds in (0, 86400] and optional strict or pacing mode`);
}

export function beginTiming({ limitSeconds, mode = 'strict', multiplier = 1 }, now = Date.now()) {
  const errors = []; validateTiming({ limitSeconds, mode }, 'timing', errors);
  if (errors.length || !Number.isFinite(multiplier) || multiplier < 1 || multiplier > 10 || !Number.isFinite(now))
    throw new Error('Valid timing policy and accommodation multiplier (1–10) required');
  return { version: 1, startedAt: now, deadlineAt: now + limitSeconds * multiplier * 1000,
    limitSeconds, multiplier, mode, lastAt: now, valid: true };
}

export function timingSnapshot(timing, now = Date.now()) {
  if (!timing) return null;
  if (timing.version !== 1 || !Number.isFinite(timing.startedAt) || !Number.isFinite(timing.deadlineAt) ||
      timing.deadlineAt <= timing.startedAt || !Number.isFinite(now)) throw new Error('Invalid saved timing state');
  // Never regain time when the wall clock moves backwards across a reload.
  const at = Math.max(now, timing.lastAt || timing.startedAt);
  const valid = timing.valid !== false && now >= (timing.lastAt || timing.startedAt);
  const remainingMs = Math.max(0, timing.deadlineAt - at);
  return { ...timing, lastAt: at, valid, remainingMs, expired: remainingMs === 0,
    enforce: timing.mode === 'strict' && remainingMs === 0 };
}

export function effectiveTiming(itemTiming, assessmentTiming, now = Date.now()) {
  const parts = [itemTiming, assessmentTiming].filter(Boolean).map(t => timingSnapshot(t, now));
  if (!parts.length) return null;
  const strict = parts.filter(t => t.mode === 'strict');
  const source = (strict.length ? strict : parts).sort((a, b) => a.deadlineAt - b.deadlineAt)[0];
  return { ...source, valid: parts.every(t => t.valid) };
}

export function timingClock(wall = Date.now(), monotonic = performance.now()) {
  let valid = true;
  return (nextWall = Date.now(), nextMonotonic = performance.now()) => {
    const elapsed = Math.max(0, nextMonotonic-monotonic), expected = wall+elapsed;
    valid &&= Math.abs(nextWall-expected) < 2000;
    return { now: expected, valid };
  };
}
