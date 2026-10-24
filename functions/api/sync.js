/* Authenticated encrypted backup. See docs/sync.md for protocol invariants. */
import { json, guard, body, purgeBin, okId } from "./_shared.js";
import { ensureSyncSchema } from "./_sync-schema.js";

const MAX_RECORDS = 2000;
const MAX_VALUE = 128 * 1024;
const PAGE = 500;
const okKey = k => typeof k === "string" && /^[\w:.#@%!'()*-]{1,2048}$/.test(k);
const stamp = n => Number.isSafeInteger(n) && n >= 0;
const cipher = s => typeof s === "string" && s.length > 0 && s.length <= MAX_VALUE;

export async function onRequestPost(context) {
  const stop = guard(context.request, context.env);
  if (stop) return stop;
  const db = context.env.DB;
  if (!db) return json({ error: "no database bound" }, 500);
  let p;
  try { p = await body(context.request); }
  catch (e) { return json({ error: e.message }, 400); }
  if (!p || typeof p !== "object" || Array.isArray(p)) return json({ error: "expected an object" }, 400);
  if (p.protocol !== 2) return json({ error: "reload this device to update Backup before syncing" }, 426);
  const device = p.device;
  if (typeof device !== "string" || !/^[\w-]{1,64}$/.test(device)) return json({ error: "device required" }, 400);
  const rows = p.rows ?? [], prefs = p.prefs ?? [], deletes = p.deletes ?? [], restores = p.restores ?? [];
  const since = p.since ?? 0, after = p.prefAfter ?? "";
  // Validate the entire request before the first write: no silent omissions.
  if (![rows, prefs, deletes, restores].every(a => Array.isArray(a) && a.length <= MAX_RECORDS) ||
      !stamp(since) || typeof after !== "string" || (after && !okKey(after)) ||
      rows.some(r => !r || typeof r.id !== "string" || !r.id.startsWith(device + ":") || r.id.length > 512 || !stamp(r.ts) || !cipher(r.enc)) ||
      prefs.some(v => !v || !okKey(v.k) || !stamp(v.ts) || !cipher(v.enc) ||
        (v.rev !== undefined && (typeof v.rev !== "string" || !/^[\w:-]{0,128}$/.test(v.rev)))) ||
      !deletes.every(okId) || !restores.every(okId)) return json({ error: "invalid or oversized backup records" }, 400);
  const now = Date.now();
  if (prefs.some(v => v.ts > now + 5 * 60_000))
    return json({ error: "device clock is ahead; correct the clock and edit the affected values again" }, 409);

  try { await ensureSyncSchema(db); }
  catch (error) {
    console.error('Backup schema upgrade failed', error);
    return json({ error: 'Backup database setup failed. Check the database binding and run npm run backend:init.' }, 503);
  }

  // JSON table inputs keep both SQL bind counts and D1 query counts bounded.
  const writes = [];
  if (rows.length) writes.push(db.prepare(
    "INSERT OR IGNORE INTO log (id, device, ts, enc) SELECT json_extract(value,'$.id'), ?, json_extract(value,'$.ts'), json_extract(value,'$.enc') FROM json_each(?)")
    .bind(device, JSON.stringify(rows)));
  if (prefs.length) writes.push(db.prepare(
    "INSERT INTO prefs (k, ts, enc, rev) SELECT json_extract(value,'$.k'), json_extract(value,'$.ts'), json_extract(value,'$.enc'), COALESCE(json_extract(value,'$.rev'),'') FROM json_each(?) WHERE true " +
    "ON CONFLICT(k) DO UPDATE SET ts=excluded.ts, enc=excluded.enc, rev=excluded.rev " +
    "WHERE excluded.ts > prefs.ts OR (excluded.ts = prefs.ts AND excluded.rev > prefs.rev)")
    .bind(JSON.stringify(prefs)));
  if (deletes.length) writes.push(db.prepare(
    "UPDATE courses SET deleted_at=?, updated_at=? WHERE id IN (SELECT value FROM json_each(?)) AND deleted_at IS NULL").bind(now, now, JSON.stringify(deletes)));
  if (restores.length) writes.push(db.prepare(
    "UPDATE courses SET deleted_at=NULL, updated_at=? WHERE id IN (SELECT value FROM json_each(?))").bind(now, JSON.stringify(restores)));
  if (writes.length) await db.batch(writes);

  // Bound bytes as well as count. A single accepted record always fits a page.
  const page = await db.prepare(
    "SELECT seq,id,ts,enc FROM (SELECT *, SUM(length(enc)+length(id)+128) OVER (ORDER BY seq) AS size FROM " +
    "(SELECT seq,id,ts,enc FROM log WHERE seq > ? AND device != ? ORDER BY seq LIMIT ?)) WHERE size <= 1048576 ORDER BY seq")
    .bind(since, device, PAGE).all();
  const out = page.results || [];
  if (!out.length && await db.prepare("SELECT seq FROM log WHERE seq > ? AND device != ? ORDER BY seq LIMIT 1").bind(since, device).first())
    return json({error:"a stored answer exceeds the download page limit; preserve the backup and recover that record"}, 413);
  const purged = await purgeBin(db, now);
  const listing = await db.prepare("SELECT id,version,bytes,deleted_at FROM courses ORDER BY id").all();
  const settings = p.protocol === 2
    ? await db.prepare("SELECT k,ts,enc,rev FROM (SELECT *, SUM(length(enc)+length(k)+128) OVER (ORDER BY k) AS size FROM " +
        "(SELECT k,ts,enc,rev FROM prefs WHERE k > ? ORDER BY k LIMIT ?)) WHERE size <= 1048576 ORDER BY k").bind(after, PAGE).all()
    : await db.prepare("SELECT k,ts,enc,rev FROM prefs ORDER BY k").all();
  const values = settings.results || [];
  if (!values.length && await db.prepare("SELECT k FROM prefs WHERE k > ? ORDER BY k LIMIT 1").bind(after).first())
    return json({error:"a stored preference exceeds the download page limit; preserve the backup and recover that record"}, 413);
  return json({ ok: true, now, protocol: 2, written: rows.length,
    accepted: { rows: rows.map(r => r.id), prefs: prefs.map(v => v.k), deletes, restores },
    cursor: out.length ? out.at(-1).seq : since,
    more: out.length > 0, rows: out.map(({ id, ts, enc }) => ({ id, ts, enc })),
    prefAfter: values.length ? values.at(-1).k : after,
    prefsMore: p.protocol === 2 && values.length > 0,
    courses: (listing.results || []).map(c => ({ id:c.id, version:c.version, bytes:c.bytes,
      deleted:!!c.deleted_at, deletedAt:c.deleted_at || null })), prefs: values, purged });
}
