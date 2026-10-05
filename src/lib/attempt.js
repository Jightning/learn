/* An attempt survives navigation/reload; its identity owns completion/exposure rows. */
import { deviceId } from './device.js';
export const sessionId = () => `${deviceId()}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
export function newAttempt(signature, session, now = Date.now()) {
  return { signature, attemptId: sessionId(), sessionId: session || sessionId(), started: now,
    progress: { used: 0, rejected: [], combinations: [], firstUnaided: null }, activeMs: 0,
    timingFlags: [], exposed: false, feedback: null };
}
/* Hidden/blurred time is excluded, long uninterrupted gaps remain uncertain thinking time. */
export function activeClock(now = Date.now(), initialFlags = []) {
  let last = now, foreground = true, stopped = false, ms = 0;
  const flags = new Set(initialFlags);
  return {
    update(visible, at = Date.now()) {
      if (!stopped && foreground) { ms += Math.max(0, at-last); if (at-last > 300000) flags.add('long-inactivity-uncertain'); }
      if (!visible) flags.add('interrupted');
      foreground = visible; last = at;
    },
    stop(at = Date.now()) { this.update(foreground, at); stopped = true; return { activeMs: ms, timingFlags: [...flags] }; }
  };
}
