/* ============================================================================
 * src/lib/store.js — durable local storage, mirrored in memory
 *
 * localStorage was the wrong home for this and mobile is where it shows.
 * Web Storage caps at 10 MiB; the outcome log alone reaches ~4MB at CAP, and
 * every writer swallowed its own failure:
 *
 *     try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {}
 *
 * On a phone that is silent data loss — progress stops persisting with no
 * error and no symptom. Worse, the log re-serialised megabytes on every single
 * answer.
 *
 * IndexedDB fixes the quota. Two decisions make it fit the existing code:
 *
 *   1. **Memory is the read model.** Everything is loaded once at boot, so
 *      reads stay synchronous. Progress writes update memory immediately and
 *      reach disk on a debounce; course changes enter memory on transaction
 *      commit so the shelf only shows persisted courses.
 *   2. **The log gets its own store**, one record per row, so appending costs
 *      one small put rather than a rewrite of the whole array.
 *
 * Failures are no longer swallowed. `onError` reports them once so the app can
 * say so, because a study tool that quietly forgets is worse than one that
 * admits it cannot save.
 * ==========================================================================*/
const DB = "learn";
const VERSION = 2;
const KV = "kv";
const LOG = "log";
const COURSES = "courses";
const FLUSH_MS = 400;

/* localStorage keys this owns, for the one-time migration. */
const MINE = [/^study:/, /^retain:v1$/, /^log:v1$/, /^note:/, /^saved:/, /^why:/, /^lane:/,
              /^contentZoom$/, /^tuckSidebar$/];

let db = null;
let mem = new Map();      /* kv mirror */
let rows = [];            /* log mirror, ascending by ts */
let books = new Map();    /* imported courses, by id */
let dirty = new Set();
let pending = [];
let timer = null;
let listeners = [];
let flushing = null;
let deleting = null;

export const onError = fn => { listeners.push(fn); };
const fail = e => { listeners.forEach(fn => { try { fn(e); } catch {} }); };

const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, VERSION);
  r.onupgradeneeded = () => {
    const d = r.result;
    if (!d.objectStoreNames.contains(KV)) d.createObjectStore(KV);
    if (!d.objectStoreNames.contains(LOG)) d.createObjectStore(LOG, { keyPath: "id" });
    if (!d.objectStoreNames.contains(COURSES)) d.createObjectStore(COURSES, { keyPath: "id" });
  };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

const readAll = store => new Promise((res, rej) => {
  const out = [];
  const r = db.transaction(store).objectStore(store).openCursor();
  r.onsuccess = () => {
    const c = r.result;
    if (!c) return res(out);
    out.push({ key: c.key, value: c.value });
    c.continue();
  };
  r.onerror = () => rej(r.error);
});

/* Everything the old build wrote, moved across once. The originals are left
   in place: a downgrade should find its data, and 10 MiB is not worth the
   risk of deleting the only copy of a semester of review. */
function migrate() {
  let moved = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !MINE.some(re => re.test(k)) || mem.has(k)) continue;
      if (k === "log:v1") {
        /* Rows written before sync existed carry no id, and the log store is
           keyed on one. Deriving it from the timestamp and position keeps a
           re-run idempotent instead of duplicating a reader's history. */
        let legacy = [];
        try { legacy = JSON.parse(localStorage.getItem(k)) || []; }
        catch (e) { fail(new Error("could not read the existing log: " + e.message)); }
        legacy.forEach((r, n) => {
          if (r && typeof r === "object") appendRow(r.id ? r : { ...r, id: `legacy:${r.ts || 0}:${n}` });
        });
      } else {
        mem.set(k, localStorage.getItem(k));
        dirty.add(k);
      }
      moved++;
    }
  } catch { /* storage disabled entirely — memory still works for this session */ }
  return moved;
}

/* Courses now live here, not just progress, so eviction costs material rather
   than a schedule. Browsers discard IndexedDB for origins under storage
   pressure unless the origin is "persisted"; asking is free and, on Chrome,
   granted automatically for an installed or frequently-used site. Safari grants
   it far more sparingly, which is why Add to Home Screen still matters more. */
/* Whether "not persisted" is worth telling the reader about.
 *
 * `navigator.storage.persist()` is a request, and Chrome answers it from
 * engagement heuristics the reader can neither see nor satisfy on demand — a
 * bookmark is one signal among several and frequently not enough. Reporting
 * that denial as a warning handed a desktop reader an alarm with no action
 * attached to it, which is the definition of noise.
 *
 * WebKit is the case where the warning earns its place: it deletes all
 * script-writable storage for an origin with no user interaction in seven
 * days, spaced repetition schedules intervals well past that, and adding the
 * site to the Home Screen is exempt. There the sentence names a real rule and
 * a real fix, so that is the only place it is shown.
 */
const webkitEviction = () => {
  const ua = navigator.userAgent || "";
  const ios = /iP(hone|ad|od)/.test(ua) ||
              (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
  return ios || safari;
};

/* Already installed? Then the advice has been taken, and WebKit's seven-day
   rule no longer applies to this origin. `display-mode: standalone` is the
   standard signal and `navigator.standalone` is the older iOS one; Safari
   answers only the second on some versions, so both are asked. */
const installed = () =>
  navigator.standalone === true ||
  (typeof matchMedia === "function" &&
   ["standalone", "fullscreen", "minimal-ui"].some(m => matchMedia(`(display-mode: ${m})`).matches));

export async function evictionRisk() {
  if (installed()) return false;
  return (await durable()) === false && webkitEviction();
}

export async function durable() {
  if (!navigator.storage || !navigator.storage.persisted) return null;
  try {
    if (await navigator.storage.persisted()) return true;
    return navigator.storage.persist ? await navigator.storage.persist() : null;
  } catch { return null; }
}

/** Open, load into memory, migrate on first run. Call once, before render. */
export async function init() {
  try {
    db = await open();
    for (const { key, value } of await readAll(KV)) mem.set(key, value);
    rows = (await readAll(LOG)).map(r => r.value).sort((a, b) => a.ts - b.ts || String(a.id).localeCompare(String(b.id)));
    for (const { value } of await readAll(COURSES)) books.set(value.id, value);
  } catch (e) {
    db = null;
    fail(e);
  }
  if (!mem.size && !rows.length) { if (migrate()) schedule(); }
  return { keys: mem.size, rows: rows.length, courses: books.size };
}

function schedule() {
  if (timer || !db) return;
  timer = setTimeout(() => { timer = null; flush().catch(() => {}); }, FLUSH_MS);
}

/** Force everything to disk. Call on pagehide, and before syncing. */
export function flush() {
  if (deleting) return deleting.then(() => flush());
  if (flushing) return flushing.then(() => flush());
  if (!db || (!dirty.size && !pending.length)) return Promise.resolve();
  const keys = [...dirty], add = pending;
  dirty = new Set(); pending = [];
  const write = new Promise((res, rej) => {
    let tx;
    let failed = false;
    const restore = e => {
      if (failed) return;
      failed = true;
      keys.forEach(k => dirty.add(k)); pending = add.concat(pending);
      fail(e); rej(e);
    };
    try {
      tx = db.transaction([KV, LOG], "readwrite");
      const kv = tx.objectStore(KV), log = tx.objectStore(LOG);
      for (const k of keys) mem.has(k) ? kv.put(mem.get(k), k) : kv.delete(k);
      for (const r of add) log.put(r);
      tx.oncomplete = () => res();
      tx.onabort = () => restore(tx.error || new Error("storage write aborted"));
    } catch (e) {
      if (tx) tx.abort();
      restore(e);
    }
  });
  flushing = write.finally(() => { flushing = null; });
  return flushing;
}

/* ------------------------------------------------- the localStorage shape --
 * Same names and same synchronous contract, so swapping a module over is a
 * one-line change at the top of the file.
 */
export const getItem = k => (mem.has(k) ? mem.get(k) : null);

/* Every key currently held. Two of the per-course stores — notes and reasons —
   are families of keys rather than one, so erasing a course (lib/purge.js)
   has to look for a prefix instead of asking for a name it already knows. */
export const keys = () => [...mem.keys()];

export function setItem(k, v) {
  mem.set(k, String(v));
  dirty.add(k);
  schedule();
}

export function removeItem(k) {
  mem.delete(k);
  dirty.add(k);
  schedule();
}

/* ---------------------------------------------------- imported courses --
 * Held in memory so the library index stays synchronous; a course is text and
 * a big one is under half a megabyte, so the whole shelf costs little.
 */
export const allBooks = () => [...books.values()];
export const getBook = id => books.get(id) || null;

function writeBook(change, commit) {
  /* Node's memory-only tests have no IndexedDB. In a browser, a failed open
     must not turn a course import or removal into a claimed success. */
  if (typeof indexedDB === "undefined") { commit(); return Promise.resolve(); }
  if (!db) {
    const e = new Error("course storage is unavailable on this device");
    fail(e); return Promise.reject(e);
  }
  return new Promise((res, rej) => {
    let tx;
    let settled = false;
    const reject = e => {
      if (settled) return;
      settled = true; fail(e); rej(e);
    };
    try {
      tx = db.transaction(COURSES, "readwrite");
      change(tx.objectStore(COURSES));
      tx.oncomplete = () => { settled = true; commit(); res(); };
      tx.onabort = () => reject(tx.error || new Error("course storage transaction aborted"));
    } catch (e) {
      if (tx) tx.abort();
      reject(e);
    }
  });
}

export const putBook = rec => writeBook(s => s.put(rec), () => books.set(rec.id, rec));
export const dropBook = id => writeBook(s => s.delete(id), () => books.delete(id));

/* --------------------------------------------------------------- the log --*/

/** Rows in timestamp order. The array is shared; callers must not mutate it. */
export const logRows = () => rows;

/** Append one row. `id` must already be set and globally unique. */
export function appendRow(row) {
  if (!row || typeof row.id !== "string" || !row.id)
    throw new Error("a log row needs an id: it is the store's key and the sync unit");
  if (rows.some(r => r.id === row.id)) return;
  rows.push(row);
  pending.push(row);
  schedule();
}

/** Merge rows from another device. Returns how many were new. */
export function mergeRows(incoming) {
  const seen = new Set(rows.map(r => r.id));
  let n = 0;
  for (const r of incoming) {
    if (!r || !r.id || seen.has(r.id)) continue;
    seen.add(r.id); rows.push(r); pending.push(r); n++;
  }
  if (n) { rows.sort((a, b) => a.ts - b.ts || String(a.id).localeCompare(String(b.id))); schedule(); }
  return n;
}

/* Which of our rows the server has. Local bookkeeping, never part of the
   synced payload: a timestamp cursor cannot express this, because two rows can
   share a millisecond and a device clock can move backwards. */
export function markSent(ids) {
  const set = new Set(ids);
  let n = 0;
  for (const r of rows) if (set.has(r.id) && !r.sent) { r.sent = 1; pending.push(r); n++; }
  if (n) schedule();
  return n;
}

export function clearLog() {
  rows = []; pending = [];
  if (db) db.transaction(LOG, "readwrite").objectStore(LOG).clear();
}

/**
 * Drop every row matching `pred`. The one caller is lib/purge.js: removing a
 * course erases what the reader answered in it, and these rows are where the
 * answers actually live — the rest is a fold over them.
 *
 * Drain queued writes before deleting, then hold later flushes until the
 * delete commits. A failed write or delete leaves the memory rows available
 * for a later attempt instead of reporting a successful purge.
 */
export async function dropRows(pred) {
  if (deleting) await deleting;
  await flush();
  const gone = rows.filter(pred);
  if (!gone.length) return 0;
  if (db) {
    let release;
    deleting = new Promise(res => { release = res; });
    try {
      await new Promise((res, rej) => {
        let tx;
        try {
          tx = db.transaction(LOG, "readwrite");
          const s = tx.objectStore(LOG);
          for (const r of gone) s.delete(r.id);
          tx.oncomplete = res;
          tx.onabort = () => rej(tx.error || new Error("storage delete aborted"));
        } catch (e) { if (tx) tx.abort(); rej(e); }
      });
    } catch (e) { fail(e); throw e; }
    finally { deleting = null; release(); }
  }
  rows = rows.filter(r => !pred(r));
  pending = pending.filter(r => !pred(r));
  return gone.length;
}
