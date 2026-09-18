/* ============================================================================
 * functions/api/sync.js — one request, one sync
 *
 * The old design spent four or more requests per sync: push rows, page the
 * pulls, list the courses, fetch each one. On a metered account that is the
 * wrong shape, so everything that is not a course *body* happens in a single
 * round trip: this device's new rows go up, the other devices' rows come back,
 * and the course listing rides along in the same response.
 *
 * Two devices syncing once a day is therefore two requests a day. The client
 * will not even call this when it has nothing to say and the day is not up —
 * see src/lib/cloud.js, where the policy lives.
 *
 * What the server can read: row ids, device ids, timestamps, sizes. The bodies
 * are ciphertext it cannot open, so the log is stored rather than known.
 * ==========================================================================*/
import { json, guard, body, purgeBin, okId } from "./_shared.js";

const MAX_ROWS = 2000;      /* per request, in and out */
const PAGE = 500;           /* rows returned before the client is told to come back */
/* Settings are a handful of short strings — one per course plus two — so they
   ride along on every sync rather than paging. The caps are there to keep that
   true for a caller that decides otherwise. */
const MAX_PREFS = 500;
const MAX_PREF_BYTES = 8 * 1024;

/* A preference key is a name, not an id: `hue:<course>`, `order:v1`. Same
   reasoning as okId — it is used in a key and it comes from the network. */
const okKey = k => typeof k === "string" && /^[\w:.-]{1,80}$/.test(k);

export async function onRequestPost(context) {
  const stop = guard(context.request, context.env);
  if (stop) return stop;

  const db = context.env.DB;
  if (!db) return json({ error: "no database bound" }, 500);

  let payload;
  try { payload = await body(context.request); }
  catch (e) { return json({ error: e.message }, 400); }

  const device = String(payload.device || "");
  if (!/^[\w-]{1,64}$/.test(device)) return json({ error: "device required" }, 400);

  const since = Number(payload.since) || 0;
  const now = Date.now();
  const writes = [];

  /* ---------------------------------------------------------------- rows --
     A device may only write rows whose id it owns. That is what makes a merge
     a union with nothing to resolve: no device can rewrite another's history,
     so there is no conflict to detect and no order to agree on. */
  const rows = Array.isArray(payload.rows) ? payload.rows.slice(0, MAX_ROWS) : [];
  let written = 0;
  for (const r of rows) {
    if (!r || typeof r.id !== "string" || !r.id.startsWith(device + ":")) continue;
    if (typeof r.enc !== "string" || !r.enc) continue;
    writes.push(db.prepare(
      "INSERT OR IGNORE INTO log (id, device, ts, enc) VALUES (?, ?, ?, ?)")
      .bind(r.id, device, Number(r.ts) || now, r.enc));
    written++;
  }

  /* ------------------------------------------------------------- courses --
     Deleting a course on one device has to reach the others, so a delete is a
     tombstone rather than a row that disappears. Restoring is the same edit in
     reverse, which is why the body is kept until the bin is purged. */
  const deletes = Array.isArray(payload.deletes) ? payload.deletes.filter(okId) : [];
  for (const id of deletes) {
    writes.push(db.prepare(
      "UPDATE courses SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
      .bind(now, now, id));
  }

  const restores = Array.isArray(payload.restores) ? payload.restores.filter(okId) : [];
  for (const id of restores) {
    writes.push(db.prepare(
      "UPDATE courses SET deleted_at = NULL, updated_at = ? WHERE id = ?").bind(now, id));
  }

  /* ----------------------------------------------------------- settings --
     The colour a course wears, the order of the shelf, the bundled courses
     dismissed from it. Per key rather than one blob, and the later stamp wins:
     the `WHERE` on the upsert is what makes a device carrying a week-old
     opinion unable to overwrite a newer one. The client decides what a stamp
     means (src/lib/prefs.js); the server only compares them. */
  const prefs = Array.isArray(payload.prefs) ? payload.prefs.slice(0, MAX_PREFS) : [];
  for (const p of prefs) {
    if (!p || !okKey(p.k) || typeof p.enc !== "string" || !p.enc) continue;
    if (p.enc.length > MAX_PREF_BYTES) continue;
    writes.push(db.prepare(
      "INSERT INTO prefs (k, ts, enc) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET " +
      "ts = excluded.ts, enc = excluded.enc WHERE excluded.ts > prefs.ts")
      .bind(p.k, Number(p.ts) || 0, p.enc));
  }

  if (writes.length) await db.batch(writes);

  /* ----------------------------------------------------------- the reply --
     Rows this device has not seen, oldest first, capped so a long backlog
     drains over a few calls rather than timing one out. `not device` because a
     device already holds its own. */
  const page = await db.prepare(
    "SELECT seq, id, ts, enc FROM log WHERE seq > ? AND device != ? ORDER BY seq LIMIT ?")
    .bind(since, device, PAGE).all();
  const out = page.results || [];

  /* Purging first, so the listing below is the truth rather than the truth as
     of a moment ago: sweeping after reading advertised a course that had just
     been deleted in this same request. It is free to do here — the request was
     already happening, and a tombstone past its window is all it touches. */
  const purged = await purgeBin(db, now);

  /* The whole listing, tombstones included: a device cannot act on a deletion
     it is never told about. It is small — one short row per course — so it
     rides along on every sync rather than costing a request of its own. */
  const listing = await db.prepare(
    "SELECT id, version, bytes, deleted_at FROM courses ORDER BY id").all();

  /* And the settings, whole, for the same reason: a device cannot act on a key
     it is never told about, and the whole table is a few hundred bytes. */
  const settings = await db.prepare("SELECT k, ts, enc FROM prefs ORDER BY k").all();

  return json({
    ok: true,
    now,
    written,
    cursor: out.length ? out[out.length - 1].seq : since,
    more: out.length === PAGE,
    rows: out.map(({ id, ts, enc }) => ({ id, ts, enc })),
    courses: (listing.results || []).map(c => ({
      id: c.id, version: c.version, bytes: c.bytes, deleted: !!c.deleted_at,
      deletedAt: c.deleted_at || null
    })),
    prefs: settings.results || [],
    purged
  });
}
