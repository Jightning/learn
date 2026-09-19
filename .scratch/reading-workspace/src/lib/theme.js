/* theme — apply a course's accent rotation.
 *
 * The whole palette is one angle: `theme.hue` in course.yaml rotates the four
 * accent tokens together, so a course is recognisable without inventing a
 * second colour system. Lightness and chroma stay fixed, which is what keeps
 * the contrast gate green (see src/css/00-tokens.css).
 *
 * It lands on the document root, not the app tree, because overlays and the
 * scrollbar gutters render outside it.
 *
 * The author picks a rotation and the reader may overrule it. Those are two
 * different claims: the author's is "this is what the course looks like", the
 * reader's is "this is how I tell my courses apart", and the second wins
 * because the reader is the one looking at the shelf. The override is per
 * course, and it is one of the three settings that belong to the shelf rather
 * than to a device — so it travels with the backup where there is one, and is
 * stamped rather than merely stored (lib/prefs.js). It is still not written
 * into the course, so exporting one still exports the author's choice.
 */
import { getItem } from "./store.js";
import { setPref, dropPref } from "./prefs.js";

/* Eight rotations, evenly spaced, because the palette is a rotation and
   nothing else — a list of named colours would be a second colour system, and
   the angles are already the only thing a course is allowed to vary. Eight is
   as many as stay distinguishable from each other at this chroma. */
export const HUES = [0, 45, 90, 135, 180, 225, 270, 315];

const KEY = cid => `hue:${cid}`;

/** The rotation this device has chosen for a course, or null for the author's. */
export function hueFor(cid) {
  const v = getItem(KEY(cid));
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? n : null;
}

/** Choose one, or pass null to go back to the course's own. */
export function setHue(cid, h) {
  if (!cid) return;
  if (h == null) dropPref(KEY(cid));
  else if (Number.isFinite(Number(h))) setPref(KEY(cid), String(Number(h)));
}

/** Forget a choice. lib/purge.js is the caller. */
export function dropHue(cid) { if (cid) dropPref(KEY(cid)); }

/**
 * The rotation a course is actually drawn at: the reader's choice, else the
 * author's, else null for the stylesheet's own default.
 *
 * Not `Number(course && …)`: with no course that expression is null, and
 * Number(null) is 0 — a perfectly finite rotation, which is how the library
 * kept ending up in amber even after the default moved.
 */
export function hueOf(cid, course) {
  const own = hueFor(cid);
  if (own != null) return own;
  const declared = course && course.theme ? course.theme.hue : undefined;
  const n = Number(declared);
  return declared != null && declared !== "" && Number.isFinite(n) ? n : null;
}

export function applyHue(course, cid) {
  const hue = hueOf(cid, course);
  const el = document.documentElement;
  /* A rotation is set inline; anything else *removes* the property so the
     stylesheet's own default applies. It used to write 0 in that case, which is
     a rotation like any other — and 0 puts the accent in amber, so the library
     and every course without a declared hue wore a colour that reads as a
     warning on hover. */
  if (hue == null) el.style.removeProperty("--hue");
  else el.style.setProperty("--hue", String(hue));
}
