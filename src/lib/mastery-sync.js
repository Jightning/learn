/* Protocol 2 carries opaque encrypted preferences. Public definitions use
 * immutable hash-addressed chunks; dependent evidence stays in durable staging
 * until the complete download validates. Staging is never learning evidence. */
import { getItem, setItem, removeItem, keys } from './store.js';
import { activityBackup, restoreActivityBackup } from './mastery-state.js';
import { responseKey } from './response-scoring.js';

const CHUNK = 24 * 1024;
const MAX_CHUNKS = Math.ceil(2 * 1024 * 1024 / CHUNK);
const STAGE = 'cloud:mastery-stage:';
const DEFINITION = /^mastery-wire:([\w-]{1,64}):([a-f0-9]{64}):(\d{3})$/;
const RESET = /^mastery-reset:([\w-]{1,64}):(\d+)$/;
const DRAFT = /^learner:mastery%3A([\w-]{1,64}):activity-draft:.+$/;
const owner = k => DEFINITION.exec(k)?.[1] || RESET.exec(k)?.[1] || DRAFT.exec(k)?.[1];
export const isActivityRow = r => typeof r?.event === 'string' && r.event.startsWith('activity-');
export const isMasteryPref = k => typeof k === 'string' &&
  (k.startsWith('mastery-wire:') || k.startsWith('mastery-reset:') || /^learner:[^:]+:activity-draft:/.test(k));
const stageKey = (kind, id) => `${STAGE}${kind}:${encodeURIComponent(id)}`;
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
const same = (a, b) => responseKey(a) === responseKey(b);

/** Separate from prefs.mine: draft envelopes own their edit stamps, while
 * definitions and reset cutoffs are immutable, not latest-edit settings. */
export function masterySyncPrefs() {
  const backup = activityBackup(), prefs = [];
  for (const { k, value } of backup.definitions) {
    const match = /^mastery-definition:([\w-]{1,64}):([a-f0-9]{64})$/.exec(k);
    if (!match) throw new Error('Invalid mastery definition key');
    // Match snapshotIdentity's canonical ordering: equal hashes must produce
    // identical immutable chunk values, regardless of object insertion order.
    const data = new TextEncoder().encode(responseKey(value));
    if (data.length > 2 * 1024 * 1024) throw new Error('Mastery definition exceeds 2 MiB');
    const count = Math.ceil(data.length / CHUNK);
    for (let i = 0; i < count; i++) prefs.push({
      k: `mastery-wire:${match[1]}:${match[2]}:${String(i).padStart(3, '0')}`, ts: 1, rev: '',
      v: { version: 1, count, data: btoa(String.fromCharCode(...data.subarray(i * CHUNK, (i + 1) * CHUNK))) }
    });
  }
  for (const record of backup.drafts) prefs.push({ k: record.k, ts: record.ts, rev: record.rev, v: record });
  // A cutoff gets its own immutable key so a stale/high-clock preference cannot
  // hide a higher cutoff from a fresh device. Existing reset prefs still travel.
  for (const reset of backup.resets) prefs.push({ k: `mastery-reset:${reset.k.slice(6)}:${reset.value}`,
    ts: 1, rev: '', v: reset.value });
  for (const p of prefs) validatePref(p);
  return prefs;
}

function validatePref(p) {
  if (!owner(p.k) || !Number.isSafeInteger(p.ts) || p.ts < 0 || typeof p.rev !== 'string')
    throw new Error('Invalid mastery sync identity/stamp');
  const definition = DEFINITION.exec(p.k), reset = RESET.exec(p.k);
  if (definition) {
    const index = Number(definition[3]), value = p.v;
    if (p.ts !== 1 || p.rev !== '' || value?.version !== 1 || !Number.isInteger(value.count) ||
        value.count < 1 || value.count > MAX_CHUNKS || index >= value.count ||
        typeof value.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data) ||
        value.data.length > CHUNK * 4 / 3 || atob(value.data).length > CHUNK)
      throw new Error('Invalid or oversized mastery definition chunk');
  } else if (reset) {
    if (p.ts !== 1 || p.rev !== '' || !Number.isSafeInteger(p.v) || p.v < 0 || String(p.v) !== reset[2])
      throw new Error('Invalid mastery reset cutoff');
  } else if (!p.v || p.v.k !== p.k || p.v.ts !== p.ts || p.v.rev !== p.rev || bytes(p.v) > 16 * 1024) {
    throw new Error('Invalid or oversized mastery draft envelope');
  }
}

function rowIdentity({ sent, ...row }) {
  if (row.trust === undefined) row.trust = 'untrusted';
  if (row.result?.trust === 'untrusted') {
    row.result = { ...row.result }; delete row.result.trust;
  }
  return row;
}

/** Validate a whole page's transport shapes/conflicts before staging any of it.
 * cloud.js flushes this stage in the same transaction as the page cursor. */
export function stageMasteryPage(rows, prefs) {
  const writes = new Map();
  for (const row of rows.filter(isActivityRow)) {
    if (bytes(rowIdentity(row)) > 16 * 1024) throw new Error('Activity sync record exceeds 16 KiB');
    const k = stageKey('row', row.id), old = writes.get(k) || (getItem(k) && JSON.parse(getItem(k)));
    if (old && !same(rowIdentity(old), rowIdentity(row))) throw new Error('Conflicting staged activity event ID');
    writes.set(k, row);
  }
  for (const p of prefs.filter(p => isMasteryPref(p.k))) {
    validatePref(p);
    const k = stageKey('pref', p.k), old = writes.get(k) || (getItem(k) && JSON.parse(getItem(k)));
    if (old && old.ts === p.ts && old.rev === p.rev && !same(old, p)) throw new Error('Conflicting mastery sync revision');
    if (!old || p.ts > old.ts || p.ts === old.ts && p.rev >= old.rev) writes.set(k, p);
  }
  for (const [k, value] of writes) setItem(k, JSON.stringify(value));
}

/** Complete dependency validation precedes canonical writes. Incomplete uploads
 * fail explicitly and retain the stage across reload/retry, even past a cursor. */
export async function finishMasterySync(deleted = new Set()) {
  const staged = keys().filter(k => k.startsWith(STAGE));
  if (!staged.length) return { merged: 0, courses: [] };
  const backup = { schemaVersion: 1, definitions: [], drafts: [], resets: [] };
  const groups = new Map(), rows = [], courses = new Set();
  for (const key of staged) {
    const value = JSON.parse(getItem(key));
    if (key.startsWith(`${STAGE}row:`)) {
      if (!deleted.has(value.course)) { rows.push(value); courses.add(value.course); }
      continue;
    }
    validatePref(value);
    const cid = owner(value.k);
    if (deleted.has(cid)) continue;
    courses.add(cid);
    const definition = DEFINITION.exec(value.k), reset = RESET.exec(value.k);
    if (definition) {
      const k = `mastery-definition:${cid}:${definition[2]}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push({ index: Number(definition[3]), ...value.v });
    } else if (reset) backup.resets.push({ k: `reset:${cid}`, value: value.v });
    else backup.drafts.push(value.v);
  }
  for (const [k, chunks] of groups) {
    const count = chunks[0].count;
    chunks.sort((a, b) => a.index - b.index);
    if (chunks.length !== count || chunks.some((p, i) => p.index !== i || p.count !== count))
      throw new Error('Incomplete mastery definition download; sync the source device and retry');
    const data = new Uint8Array(chunks.flatMap(p => Array.from(atob(p.data), c => c.charCodeAt(0))));
    if (data.length > 2 * 1024 * 1024) throw new Error('Mastery definition exceeds 2 MiB');
    backup.definitions.push({ k, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)) });
  }
  const merged = await restoreActivityBackup(backup, rows, { synced: true });
  for (const key of staged) removeItem(key);
  return { merged, courses: [...courses] };
}

export function dropMasteryStage(cid) {
  for (const key of keys().filter(k => k.startsWith(STAGE))) {
    const value = JSON.parse(getItem(key));
    if ((key.startsWith(`${STAGE}row:`) ? value.course : owner(value.k)) === cid) removeItem(key);
  }
}
