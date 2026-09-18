/* ============================================================================
 * src/lib/prefs.js — the few settings that follow the reader between devices
 *
 * Almost everything the browser holds about a reader is per device on purpose:
 * where they were in a course, how deep they read it, which lane they are in.
 * Three settings are not, because they are statements about the *shelf* rather
 * than about the device looking at it — the colour a course is tinted, the
 * order the cards sit in, and which bundled ones are dismissed. A reader who
 * arranges their shelf on a laptop and then opens a phone is looking at the
 * same shelf, and it used to be someone else's.
 *
 * Two devices can both set the same thing, so there has to be a rule. The rule
 * is the latest write wins, per key: each change is stamped when it is made and
 * the account keeps the higher stamp. That is weaker than the log's union —
 * one of the two colours is genuinely lost — but a colour is a preference with
 * no history to preserve, and anything stronger would mean a merge dialog for
 * a thing the reader can simply set again.
 *
 * It is per key rather than one settings blob for the reason the course bodies
 * had to learn the hard way: a whole-document last-write-wins lets a device
 * that has not looked in a week overwrite everything with what it remembers.
 * A key nobody touched is a key nobody overwrites.
 *
 * Clearing one is a write too — `null` with a stamp — or a device that never
 * heard about the clearing would hand the old value straight back.
 * ==========================================================================*/
import { getItem, setItem, removeItem, keys } from "./store.js";

/* When this device last changed each key. Its own key is not a preference and
   never travels: it is this device's account of what it did. */
const STAMPS = "pref:stamps";

/* What travels. A short list on purpose — every addition is a thing that can
   arrive from another device and surprise someone. */
const SYNCED = [/^hue:/, /^order:v1$/, /^hidden:v1$/];

export const isPref = k => typeof k === "string" && SYNCED.some(re => re.test(k));

const stamps = () => { try { return JSON.parse(getItem(STAMPS)) || {}; } catch { return {}; } };
const write = s => setItem(STAMPS, JSON.stringify(s));

/* How old this device's opinion is.
 *
 * `0` is "no opinion" and loses to anything. `1` is the value that was already
 * here when this device learned to stamp — a real preference with an unknown
 * date, so it beats no opinion at all and loses to every dated change. Without
 * it the settings a reader made before this shipped would never have travelled,
 * because a stamp of 0 can never be greater than a stamp of 0. */
const tsOf = (s, k) => (s[k] != null ? Number(s[k]) : (getItem(k) != null ? 1 : 0));

/** Set one, and record when. The three modules that own these keys call this
 *  rather than store.setItem, so a change cannot be made without a stamp. */
export function setPref(k, v) {
  if (!isPref(k)) throw new Error(`${k} is not a synced preference`);
  setItem(k, v);
  const s = stamps(); s[k] = Date.now(); write(s);
}

/** Clear one. A tombstone, not an absence — see the header. */
export function dropPref(k) {
  if (!isPref(k)) throw new Error(`${k} is not a synced preference`);
  removeItem(k);
  const s = stamps(); s[k] = Date.now(); write(s);
}

/** Everything this device has an opinion about, cleared ones included. */
export function mine() {
  const s = stamps();
  const all = new Set([...keys().filter(isPref), ...Object.keys(s).filter(isPref)]);
  return [...all].map(k => ({ k, v: getItem(k), ts: tsOf(s, k) }));
}

/**
 * Take the account's copy of each key where it is newer than this device's.
 * Returns how many actually changed, so the caller knows whether to repaint.
 */
export function apply(incoming) {
  const s = stamps();
  let n = 0;
  for (const p of incoming || []) {
    if (!p || !isPref(p.k)) continue;
    const ts = Number(p.ts) || 0;
    if (ts <= tsOf(s, p.k)) continue;
    if (p.v == null) removeItem(p.k); else setItem(p.k, String(p.v));
    s[p.k] = ts; n++;
  }
  if (n) write(s);
  return n;
}
