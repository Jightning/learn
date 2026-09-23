/* ============================================================================
 * src/lib/cloud.js — the owner's backup, and the only thing that leaves a device
 *
 * The site is public and works entirely offline: everything a reader does lives
 * in IndexedDB, and that is the whole product for everyone except the person
 * holding the secret. This file is what that one person gets — a copy of the
 * log, the courses, learner notes and the settings that belong to the shelf
 * rather than to a device (src/lib/prefs.js), on the account's own backend, so
 * a wiped browser is a download rather than a loss.
 *
 * Three properties, in the order they mattered:
 *
 * QUOTA. Cloudflare's free tier is metered per account, so the design spends
 * requests like they are scarce. Everything except a course body is one round
 * trip; a course body is fetched only when its content hash differs; and an
 * automatic sync happens at most once a day, or not at all when there is
 * nothing to send. Two devices cost two requests a day. A reader without the
 * secret makes none, ever — `configured()` is false and no call is attempted,
 * which is what keeps a stranger from spending the budget by opening the site.
 *
 * SECURITY. The payload is AES-GCM ciphertext under a key derived from the
 * secret, so the backend stores the log without being able to read it: item,
 * confidence, outcome, and the course material itself are opaque to it. What
 * it necessarily sees is metadata — row ids, device ids, timestamps, sizes.
 * The secret is therefore a key as well as a password: lose it and the
 * ciphertext is scrap, which is why `courses/` on disk stays the real backup.
 *
 * SIMPLICITY. One secret, pasted once per device. No address, because the
 * endpoint is this same origin; no account, no login, no client to install.
 * ==========================================================================*/
import { getItem, setItem, removeItem, logRows, mergeRows, markSent, flush } from "./store.js";
import { deviceId } from "./device.js";
import { importCourse, importedIndex, filesOf, versionOf, markSynced,
         removeCourse } from "./courses.js";
import { bundledCourseIds, bundledCourseIndex, isBundledCourse } from "./bundled.js";
import { invalidate } from "./replay.js";
import { purge } from "./purge.js";
import { deriveKey, seal as sealBytes, open as openBytes, versionOfFiles } from "./seal.js";
import { mine as myPrefs, apply as applyPrefs, isNotePref } from "./prefs.js";

const SECRET = "cloud:secret";
const CURSOR = "cloud:cursor";      /* server-assigned seq, never a clock */
const LAST   = "cloud:last";        /* last successful sync, ms */
const BIN    = "cloud:deletes";     /* removals waiting to be told to the server */
const SEEN   = "cloud:bin";         /* the account's bin, as of the last sync */

/* A day between automatic syncs. The number is a quota decision rather than a
   freshness one: answers are already durable locally the moment they are made,
   so syncing more often buys a shorter window on device loss and costs a
   multiple of the request budget. Manual sync exists for when that window
   matters — before wiping a phone, say. */
const AUTO_MS = 24 * 60 * 60 * 1000;

export const configured = () => !!getItem(SECRET);
export const lastSync = () => Number(getItem(LAST)) || 0;

/* What the account had in its bin when this device last looked. Kept locally so
   the panel can offer a restore on a cold page load: a safety net you can only
   see in the seconds after pressing a button is not one. */
export const bin = () => { try { return JSON.parse(getItem(SEEN)) || []; } catch { return []; } };

export function configure(secret) {
  const s = (secret || "").trim();
  if (s) setItem(SECRET, s); else removeItem(SECRET);
  key = null;                       /* re-derive on next use */
  /* Written through rather than left to the debounce. Every other write can
     wait 400ms because losing one is losing one answer; losing this is a device
     that silently stopped being connected, or one that still is after you told
     it to forget. */
  return flush();
}

/* The key, derived once per secret and held in memory. Derivation is
   deliberately slow (lib/seal.js), so it must not happen per row. */
let key = null;
const sealer = async () => {
  if (!key) key = await deriveKey(getItem(SECRET));
  return key;
};
const seal = async value => sealBytes(await sealer(), value);
const open = async text => openBytes(await sealer(), text);

/* Settings from the account, opened. One that will not open is one written
   under a different secret: it is skipped rather than allowed to abort a sync
   that is mostly about other things. */
const opened = async (prefs = []) => {
  const out = [];
  for (const p of prefs) {
    try { out.push({ k: p.k, ts: p.ts, v: await open(p.enc) }); }
    catch { console.warn(`setting ${p.k}: could not be decrypted with this secret`); }
  }
  return out;
};

/* ----------------------------------------------------------------- calling --*/
class Unauthorized extends Error {}

async function call(path, payload) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json",
               authorization: `Bearer ${getItem(SECRET) || ""}` },
    body: JSON.stringify(payload)
  });
  if (res.status === 401 || res.status === 404) throw new Unauthorized();
  if (!res.ok) throw new Error(`sync ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------- deletions ---
 * A course removed here has to be removed everywhere, so the id is queued and
 * carried on the next sync. It is queued rather than sent immediately for the
 * same reason everything else is: a delete is not worth a request of its own.
 */
const queued = () => { try { return JSON.parse(getItem(BIN)) || []; } catch { return []; } };

export function queueDelete(cid) {
  if (!configured()) return;
  const q = queued();
  if (!q.includes(cid)) setItem(BIN, JSON.stringify([...q, cid]));
}

/* --------------------------------------------------------------- courses ---*/

/* Whether a course this device holds has to be sent up.
 *
 * The account's listing is the only authority on what the account has. A local
 * `version` is a note about where a course *came from*, and it was wrong to
 * read it as "the account has this": a course pulled from a different server
 * carries that server's hash, so every course looked synced and nothing was
 * ever offered. Pure, and separated out, because the truth table is the bug.
 */
export function needsUpload(remote, localVersion, contentVersion) {
  /* Tombstoned there, and this device is holding a copy. Which copy decides
     what happens, and `localVersion` is what tells them apart:

       null  — hand-installed here and never acknowledged by the account. The
               reader imported it, which they did *after* the deletion or the
               deletion would have taken it. Sending it up is what they asked
               for, and /api/course clears the tombstone on a put for exactly
               this reason ("a restore by any other name").
       set   — it came down from this account. The deletion is about this very
               copy, so re-uploading it would undo another device's removal.

     Reading both as "never resurrect" is what made a re-import vanish: the
     upload was skipped, and pullCourses below then purged the fresh copy and
     its answers on the strength of a tombstone that predated it. */
  if (remote && remote.deleted) return localVersion == null;
  if (!remote) return true;                         /* the account has never seen it */
  if (remote.version === contentVersion) return false;      /* the same bytes, both ends */

  /* The two copies differ, and "differs" is all a content hash can say: it is a
     digest, not a clock, so it reads the same from the stale end as from the
     fresh one. Treating that as "the account has an older copy" is what made a
     device holding last week's course hand it up — the account's newer body was
     replaced by the stale one, and pullCourses then skipped the course because
     this device had just sent it. One device backing up after another undid it.

     The question a device *can* answer is whether it changed its own copy.
     `localVersion` is the version the account last acknowledged for this copy,
     so content that still hashes to it has not been touched here: the
     difference is the account's doing, and the account's copy is the one to
     keep. `null` is the other case — hand-installed and never acknowledged,
     which is the reader saying this is the copy they want. */
  return localVersion !== contentVersion;
}

/** Hand up anything the account does not have, or holds an older copy of. */
async function pushCourses(listing) {
  const there = new Map(listing.map(c => [c.id, c]));
  const sent = [];
  for (const id of Object.keys(importedIndex())) {
    if (isBundledCourse(id)) continue;
    const remote = there.get(id);
    /* The cheap path first: the account lists this course at exactly the
       version this device recorded, so there is nothing to hash and nothing to
       send. Only a course that might differ costs a digest. */
    if (remote && !remote.deleted && versionOf(id) === remote.version) continue;

    const files = filesOf(id);
    if (!files) continue;
    const version = await versionOfFiles(files);
    if (!needsUpload(remote, versionOf(id), version)) {
      /* Only when the account really is holding these bytes. The other reason
         to decline is that the account is *ahead*, and stamping the local copy
         then would record an upload that never happened; the pull below is
         what settles that one. */
      if (remote && !remote.deleted && remote.version === version) markSynced(id, version);
      continue;
    }
    await call("/api/course", { op: "put", id, version, enc: await seal(files) });
    markSynced(id, version);
    sent.push(id);
  }
  return sent;
}

/** Take down anything new, and apply the account's deletions locally.
 *  `sent` is what pushCourses just handed up. The listing came back *before*
 *  that, so every entry for one of those ids is stale in both directions: its
 *  tombstone has since been cleared by the put, and its version is the one the
 *  upload replaced. Acting on either is acting on the past — it purged a course
 *  that had just been restored, and re-fetched a body this device is the source
 *  of, then filed it under the old version so the next sync uploaded it again. */
async function pullCourses(listing, taken, sent = []) {
  const justSent = new Set(sent);
  const installed = [], removed = [];
  for (const c of listing) {
    if (justSent.has(c.id)) continue;
    const here = versionOf(c.id);
    if (isBundledCourse(c.id)) continue;
    const holding = !!importedIndex()[c.id];

    if (c.deleted) {
      /* The account says this is gone. Removing it here is what makes a
         deletion on one device mean anything on the others — and that has to
         include the answers, or the two devices disagree about what Remove
         did. The device that pressed the button purged (lib/purge.js); this
         one does the same thing to its own copy. */
      if (holding) {
        await purge(c.id, (importedIndex()[c.id] || {}).code);
        removeCourse(c.id); removed.push(c.id);
      }
      continue;
    }
    if (here === c.version) continue;

    const got = await call("/api/course", { op: "get", id: c.id });
    if (!got || !got.enc) continue;
    const files = await open(got.enc);
    const r = importCourse(c.id, files, taken, c.version);
    if (r.ok) installed.push(c.id);
    else console.warn(`${c.id}: ${r.errors.join("; ")}`);
  }
  return { installed, removed };
}

/* ------------------------------------------------------------------ sync ---*/
let running = false;

/**
 * One round trip for the log and the listing, then course bodies only where a
 * version differs. `manual` bypasses the once-a-day rule; nothing else does.
 */
export async function sync({ manual = false } = {}) {
  if (running || !configured() || !navigator.onLine) return null;

  const pending = logRows().filter(r => !r.sent && String(r.id).startsWith(deviceId() + ":"));
  const dropped = queued();
  const due = Date.now() - lastSync() > AUTO_MS;
  /* The cheapest request is the one not made. Automatic syncs run when the day
     is up; anything the reader asked for runs immediately. */
  if (!manual && !due && !dropped.length) return null;

  running = true;
  try {
    await flush();
    const dev = deviceId();
    const sealed = await Promise.all(
      pending.map(async r => ({ id: r.id, ts: r.ts, enc: await seal(r) })));

    /* Notes and settings ride along with the rows. Each note anchor is its own
       key, so editing one block cannot overwrite a note edited elsewhere. The
       account keeps whichever stamp is later per key; deleted notes travel as
       encrypted null tombstones so an offline device cannot resurrect them. */
    const sealedPrefs = await Promise.all(
      myPrefs().map(async p => ({ k: p.k, ts: p.ts, enc: await seal(p.v ?? null) })));

    let cursor = Number(getItem(CURSOR)) || 0;
    let merged = 0, listing = [], pages = 0, wrote = 0, settings = 0, notes = false;
    /* Which courses the merged rows belong to: an open course has to be
       refolded rather than merely repainted, or it shows yesterday's schedule
       until the reader navigates away and back. */
    const touched = new Set();

    /* A backlog drains over pages; everything else rides the first one. */
    for (;;) {
      const res = await call("/api/sync", {
        device: dev, since: cursor,
        rows: pages === 0 ? sealed : [],
        deletes: pages === 0 ? dropped : [],
        prefs: pages === 0 ? sealedPrefs : [],
        restores: []
      });
      if (pages === 0) {
        wrote = res.written || 0;
        if (sealed.length) markSent(pending.map(r => r.id));
        if (dropped.length) removeItem(BIN);
        listing = res.courses || [];
        const accountPrefs = await opened(res.prefs);
        settings = applyPrefs(accountPrefs);
        notes = settings > 0 && accountPrefs.some(p => isNotePref(p.k));
      }
      const plain = [];
      for (const r of res.rows || []) {
        try { plain.push(await open(r.enc)); }
        catch { console.warn(`row ${r.id}: could not be decrypted with this secret`); }
      }
      if (plain.length) {
        merged += mergeRows(plain);
        for (const r of plain) if (r.course) { invalidate(r.course); touched.add(r.course); }
      }
      cursor = Number(res.cursor) || cursor;
      setItem(CURSOR, String(cursor));
      if (!res.more || ++pages > 100) break;
    }

    const uploaded = await pushCourses(listing);
    const taken = { ids: [...bundledCourseIds(), ...Object.keys(importedIndex())], codes: {} };
    for (const [cid, e] of Object.entries(bundledCourseIndex())) if (e.code) taken.codes[e.code] = cid;
    for (const [cid, e] of Object.entries(importedIndex())) if (e.code) taken.codes[e.code] = cid;
    const { installed, removed } = await pullCourses(listing, taken, uploaded);

    setItem(LAST, String(Date.now()));
    setItem(SEEN, JSON.stringify(listing.filter(c => c.deleted)));
    if (merged || installed.length || removed.length || settings)
      dispatchEvent(new CustomEvent("learn:synced", {
        detail: { merged, installed, removed, settings, notes, courses: [...touched] } }));

    return { ok: true, sent: wrote, merged, uploaded, installed, removed, settings, notes,
             bin: listing.filter(c => c.deleted) };
  } catch (e) {
    /* Cursors are only advanced on success, so a failure costs nothing but the
       attempt: the next sync resumes exactly where this one stopped. */
    return { ok: false, unauthorized: e instanceof Unauthorized, error: e.message };
  } finally {
    running = false;
  }
}

/** Bring a course back out of the bin. The body is still there until it is purged. */
export async function restore(cid) {
  if (!configured()) return null;
  if (isBundledCourse(cid)) return { ok: false, error: "that course is bundled with the site and is restored by deploying the site" };
  try {
    const res = await call("/api/sync", { device: deviceId(), since: Number(getItem(CURSOR)) || 0,
                                          rows: [], deletes: [], restores: [cid] });
    const taken = { ids: [...bundledCourseIds(), ...Object.keys(importedIndex())], codes: {} };
    const { installed } = await pullCourses((res.courses || []).filter(c => c.id === cid), taken);
    return { ok: true, installed };
  } catch (e) {
    return { ok: false, unauthorized: e instanceof Unauthorized, error: e.message };
  }
}

/** On load, once a day, and only for the owner. No listeners, no polling. */
export function auto() {
  if (!configured()) return;
  sync();
}
