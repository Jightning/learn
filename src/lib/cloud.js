/* ============================================================================
 * src/lib/cloud.js — the owner's backup, and the only thing that leaves a device
 *
 * The site is public and works entirely offline: everything a reader does lives
 * in IndexedDB, and that is the whole product for everyone except the person
 * holding the secret. This file is what that one person gets — a copy of the
 * log, courses and saved learner state (src/lib/prefs.js), on the account's own backend, so
 * a wiped browser is a download rather than a loss.
 *
 * Three properties, in the order they mattered:
 *
 * QUOTA. Cloudflare's free tier is metered per account, so the design spends
 * requests like they are scarce. Log and preferences use bounded pages; a course body is fetched only when its content hash differs; and an
 * automatic sync happens at most once a day. Requests depend on backlog size. A reader without the
 * secret makes none, ever — `configured()` is false and no call is attempted,
 * which is what keeps a stranger from spending the budget by opening the site.
 *
 * SECURITY. The payload is AES-GCM ciphertext under a key derived from the
 * secret, so the backend stores encrypted payloads, but knows the shared secret: item,
 * confidence, outcome and course material are protected at rest, not from the server. What
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
import { syncBatches } from "./sync-batches.js";
import { migrateLearnerPrefs, preserveReplacedAnswers } from "./learner-prefs.js";
import { forget } from "./state.js";
import { masterySyncPrefs, isActivityRow, stageMasteryPage, finishMasterySync, isMasteryPref } from "./mastery-sync.js";

const SECRET = "cloud:secret";
const CURSOR = "cloud:cursor";      /* server-assigned seq, never a clock */
const LAST   = "cloud:last";        /* last successful sync, ms */
const BIN    = "cloud:deletes";     /* removals waiting to be told to the server */
const ACKS   = "cloud:pref-acks";
const SEEN   = "cloud:bin";         /* the account's bin, as of the last sync */

/* A day between automatic syncs. The number is a quota decision rather than a
   freshness one: answers are already durable locally the moment they are made,
   so syncing more often buys a shorter window on device loss and costs a
   multiple of the request budget. Manual sync exists for when that window
   matters — before wiping a phone, say. */
const AUTO_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

export const configured = () => !!getItem(SECRET);
export const lastSync = () => Number(getItem(LAST)) || 0;

/* What the account had in its bin when this device last looked. Kept locally so
   the panel can offer a restore on a cold page load: a safety net you can only
   see in the seconds after pressing a button is not one. */
export const bin = () => { try { return JSON.parse(getItem(SEEN)) || []; } catch { return []; } };

export function configure(secret) {
  const s = (secret || "").trim();
  if (s !== getItem(SECRET)) { removeItem(CURSOR); removeItem(ACKS); removeItem(LAST); removeItem("cloud:clock-offset"); }
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
  // Cache the pending derivation too: a full course encrypts many answers in
  // parallel, and must not run the expensive password derivation per answer.
  if (!key) key = deriveKey(getItem(SECRET)).catch(e => { key = null; throw e; });
  return key;
};
const seal = async value => sealBytes(await sealer(), value);
const open = async text => openBytes(await sealer(), text);

/* Versioned envelopes bind values to their routing metadata; old ciphertext
   remains readable. Never skip an unreadable record and acknowledge its cursor. */
const sealRecord = (kind, identity, ts, rev, value) => seal({ syncEnvelope: 2, kind, identity, ts, rev, value });
async function openRecord(kind, identity, ts, rev, enc) {
  let value;
  try { value = await open(enc); }
  catch { throw new Error(`could not decrypt backup ${kind} ${identity}; download remains retryable`); }
  if (value?.syncEnvelope !== 2) return value;
  if (value.kind !== kind || value.identity !== identity || value.ts !== ts || value.rev !== rev)
    throw new Error("backup record metadata does not match its encrypted envelope");
  return value.value;
}
let applyCourses = async () => {};
export const setSyncCourseLoader = callback => { applyCourses = callback; };

/* ----------------------------------------------------------------- calling --*/
class Unauthorized extends Error {}

async function call(path, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(path, {
      method:"POST", headers:{ "content-type":"application/json", authorization:`Bearer ${getItem(SECRET) || ""}` },
      body:JSON.stringify(payload), signal:controller.signal
    });
    if (res.status === 401 || res.status === 404) throw new Unauthorized();
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.error || `sync ${res.status}`);
    }
    const result = await res.json();
    if (Number.isSafeInteger(result.now)) result.clockOffset = result.now - Math.round((started + Date.now()) / 2);
    return result;
  } catch (e) {
    if (controller.signal.aborted) throw new Error("request timed out");
    throw e;
  } finally { clearTimeout(timeout); }
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
      if (remote && !remote.deleted && remote.version === version) await markSynced(id, version);
      continue;
    }
    await call("/api/course", { op: "put", id, version, enc: await seal(files) });
    await markSynced(id, version);
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
        await removeCourse(c.id); removed.push(c.id);
      }
      continue;
    }
    if (here === c.version) continue;

    const got = await call("/api/course", { op: "get", id: c.id });
    if (!got || !got.enc) continue;
    const files = await open(got.enc);
    const r = await importCourse(c.id, files, taken, c.version);
    if (r.ok) installed.push(c.id);
    else throw new Error(`${c.id}: ${r.errors.join("; ")}`);
  }
  return { installed, removed };
}

/* ------------------------------------------------------------------ sync ---*/
let running = null;

export function sync({ manual = false } = {}) {
  if (running) return manual ? running.then(() => sync({ manual: true })) : running;
  running = runSync({ manual }).finally(() => { running = null; });
  return running;
}

/**
 * Bounded pages for the log, preferences and listing; course bodies only
 * where a version differs. `manual` bypasses the once-a-day rule; nothing else does.
 */
async function runSync({ manual = false } = {}) {
  if (!configured()) return manual ? { ok:false, error:"connect this device first" } : null;
  if (!navigator.onLine) return { ok:false, error:"this device is offline; reconnect and try again" };

  const lastBefore = lastSync();
  const pending = logRows().filter(r => !r.sent);
  const dropped = queued();
  const due = Date.now() - lastSync() > AUTO_MS;
  /* The cheapest request is the one not made. Automatic syncs run when the day
     is up; anything the reader asked for runs immediately. */
  if (!manual && !due && !dropped.length) return null;

  try {
    await flush();
    const dev = deviceId();
    const originals = new Map();
    const sealed = await Promise.all(pending.map(async r => {
      // Imported/legacy logs retain their event identity inside the envelope.
      // The transport record belongs to the device backing up that import.
      const id = r.id.startsWith(dev + ':') ? r.id : `${dev}:import:${r.id}`;
      originals.set(id, r.id);
      return { id, ts: r.ts, enc: await sealRecord("row", id, r.ts, "", r) };
    }));

    /* Notes and settings ride along with the rows. Each note anchor is its own
       key, so editing one block cannot overwrite a note edited elsewhere. The
       account keeps whichever stamp is later per key; deleted notes travel as
       encrypted null tombstones so an offline device cannot resurrect them. */
    migrateLearnerPrefs();
    let acknowledgments;
    try { acknowledgments = JSON.parse(getItem(ACKS)) || {}; } catch { acknowledgments = {}; }
    const prefVersions = new Map();
    const sealedPrefs = (await Promise.all([...myPrefs(), ...masterySyncPrefs()].map(async p => {
      const version = await versionOfFiles({ value:p.v, stamp:p.ts, revision:p.rev });
      prefVersions.set(p.k, version);
      if (acknowledgments[p.k] === version) return null;
      return { k:p.k, ts:p.ts, rev:p.rev, enc:await sealRecord("pref", p.k, p.ts, p.rev, p.v ?? null) };
    }))).filter(Boolean);
    const batches = syncBatches(sealed, sealedPrefs);

    let cursor = Number(getItem(CURSOR)) || 0;
    let merged = 0, listing = [], pages = 0, wrote = 0, settings = 0, notes = false;
    let prefAfter = "";
    /* Which courses the merged rows belong to: an open course has to be
       refolded rather than merely repainted, or it shows yesterday's schedule
       until the reader navigates away and back. */
    const touched = new Set();

    /* Upload and download backlogs drain independently. Only acknowledge the
       batch that succeeded, so a later failure leaves the rest retryable. */
    for (;;) {
      const batch = batches[pages] || { rows: [], prefs: [] };
      const res = await call("/api/sync", {
        protocol: 2, device: dev, since: cursor, prefAfter,
        rows: batch.rows,
        deletes: pages === 0 ? dropped : [],
        prefs: batch.prefs,
        restores: []
      });
      if (res.protocol !== 2 || !res.accepted ||
          batch.rows.some(r => !res.accepted.rows?.includes(r.id)) ||
          batch.prefs.some(p => !res.accepted.prefs?.includes(p.k)) ||
          (pages === 0 && dropped.some(id => !res.accepted.deletes?.includes(id))))
        throw new Error("backup server did not acknowledge every record; update the server and retry");
      for (const p of batch.prefs) acknowledgments[p.k] = prefVersions.get(p.k);
      setItem(ACKS, JSON.stringify(acknowledgments));
      if ((res.more && !(res.cursor > cursor)) || (res.prefsMore && !(res.prefAfter > prefAfter)))
        throw new Error("backup download did not advance; retry after updating the server");
      wrote += res.accepted.rows.length;
      if (batch.rows.length) markSent(batch.rows.map(r => originals.get(r.id)));
      if (pages === 0 && dropped.length) {
        const sent = new Set(dropped);
        setItem(BIN, JSON.stringify(queued().filter(id => !sent.has(id))));
      }
      listing = res.courses || [];
      const accountPrefs = await Promise.all((res.prefs || []).map(async p => ({
        k:p.k, ts:p.ts, rev:p.rev || "", v:await openRecord("pref", p.k, p.ts, p.rev || "", p.enc)
      })));
      const plain = await Promise.all((res.rows || []).map(async r => {
        const value = await openRecord("row", r.id, r.ts, "", r.enc);
        if (!value || typeof value.id !== "string" || !Number.isSafeInteger(value.ts) || value.ts !== r.ts ||
            (value.id !== r.id && !r.id.endsWith(":import:" + value.id))) throw new Error("invalid answer record in backup");
        return { ...value, sent:1 };
      }));
      stageMasteryPage(plain, accountPrefs);
      const regularPrefs = accountPrefs.filter(p => !isMasteryPref(p.k));
      preserveReplacedAnswers(regularPrefs);
      const changed = applyPrefs(regularPrefs);
      settings += changed;
      if (changed) forget();
      notes ||= changed > 0 && accountPrefs.some(p => isNotePref(p.k));
      if (plain.length) {
        merged += mergeRows(plain.filter(r => !isActivityRow(r)));
        for (const r of plain.filter(r => !isActivityRow(r))) if (r.course) { invalidate(r.course); touched.add(r.course); }
      }
      const previous = cursor;
      cursor = Number(res.cursor) || cursor;
      setItem(CURSOR, String(cursor));
      try { await flush(); }
      catch (e) { setItem(CURSOR, String(previous)); throw e; }
      if (Number.isSafeInteger(res.now)) setItem("cloud:clock-offset", String(res.clockOffset));
      prefAfter = res.prefAfter || prefAfter;
      pages++;
      if (!res.more && !res.prefsMore && pages >= batches.length) break;
    }

    const mastery = await finishMasterySync(new Set(listing.filter(c => c.deleted).map(c => c.id)));
    merged += mastery.merged;
    for (const cid of mastery.courses) { invalidate(cid); touched.add(cid); }
    settings += mastery.courses.length;
    await flush();
    const uploaded = await pushCourses(listing);
    const taken = { ids: [...bundledCourseIds(), ...Object.keys(importedIndex())], codes: {} };
    for (const [cid, e] of Object.entries(bundledCourseIndex())) if (e.code) taken.codes[e.code] = cid;
    for (const [cid, e] of Object.entries(importedIndex())) if (e.code) taken.codes[e.code] = cid;
    const { installed, removed } = await pullCourses(listing, taken, uploaded);

    await applyCourses();
    setItem(LAST, String(Date.now()));
    setItem(SEEN, JSON.stringify(listing.filter(c => c.deleted)));
    await flush();
    if (merged || installed.length || removed.length || settings)
      dispatchEvent(new CustomEvent("learn:synced", {
        detail: { merged, installed, removed, settings, notes, courses: [...touched] } }));

    return { ok: true, sent: wrote, merged, uploaded, installed, removed, settings, notes,
             bin: listing.filter(c => c.deleted) };
  } catch (e) {
    setItem(LAST, String(lastBefore));
    // Earlier pages may already be durable. Refresh those results even if a
    // later page fails; failed pages retain their previous cursor for retry.
    try {
      await applyCourses();
      await flush();
      dispatchEvent(new CustomEvent("learn:synced", { detail:{ merged:0, settings:1, courses:[], installed:[], removed:[] } }));
    } catch { /* Preserve the original backup error. */ }
    return { ok: false, unauthorized: e instanceof Unauthorized, error: e.message };
  }
}

/** Bring a course back out of the bin. The body is still there until it is purged. */
export async function restore(cid) {
  if (!configured()) return null;
  if (isBundledCourse(cid)) return { ok: false, error: "that course is bundled with the site and is restored by deploying the site" };
  try {
    const res = await call("/api/sync", { protocol:2, device: deviceId(), since: Number(getItem(CURSOR)) || 0,
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
