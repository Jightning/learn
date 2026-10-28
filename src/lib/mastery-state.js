import { getItem, setItem, keys, logRows, mergeRows, removeItem } from './store.js';
import { deviceId } from './device.js';
import { activityInputHash, activityEventCompatibility, validateActivityHistory, ACTIVITY_EVENT_LIMITS } from './activity-events.js';
import { validateAdapterRequest } from './activity-adapters.js';
import { projectMasteryHistory } from './mastery-projection.js';
import { masterySnapshot, snapshotIdentity, resolveMasterySnapshot } from './mastery-snapshot.js';
import { learnerKey, readActivityDrafts, writeActivityDraft } from './learner-prefs.js';
import { responseKey } from './response-scoring.js';

// Serialize asynchronous local mutations: validation must see earlier commits.
let writes = Promise.resolve();
const serialize = task => {
  const next = writes.then(task);
  writes = next.catch(() => {});
  return next;
};

const definitionPrefix = cid => `mastery-definition:${encodeURIComponent(cid)}:`;
const cutoff = cid => Number(getItem(`reset:${cid}`)) || 0;
const isActivity = row => typeof row?.event === 'string' && row.event.startsWith('activity-');
const order = rows => [...rows].sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const jsonValue = value => value === null || typeof value === 'string' || typeof value === 'boolean' ||
  typeof value === 'number' && Number.isFinite(value) ||
  Array.isArray(value) && Array.from(value).every(jsonValue) ||
  value && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value)) && Object.values(value).every(jsonValue);
const bounded = value => {
  if (!jsonValue(value)) throw new Error('Activity storage requires finite JSON values');
  const text = JSON.stringify(value);
  if (new TextEncoder().encode(text).length > ACTIVITY_EVENT_LIMITS.bytes) throw new Error('Activity storage record exceeds 16 KiB');
  return JSON.parse(text);
};
const stamp = n => Number.isSafeInteger(n) && n >= 0;
const checkCid = cid => { if (typeof cid !== 'string' || !/^[\w-]{1,64}$/.test(cid)) throw new Error('Stable course folder ID required'); };
const duplicateIdentity = row => {
  const { sent, ...value } = structuredClone(row);
  if (value.trust === undefined) value.trust = 'untrusted';
  if (value.result?.trust === 'untrusted') delete value.result.trust;
  return responseKey(value);
};
const rawEvent = ({ definitionId, courseCode, sent, ...row }) => ({ ...row, course: courseCode });
const storedDefinitions = () => keys().filter(k => k.startsWith('mastery-definition:')).map(k => ({ k, value: JSON.parse(getItem(k)) }));
const unwrap = result => {
  const errors = [];
  return { errors, accept: value => { if (!value) throw new Error(errors.join('; ') || result); return value; } };
};

async function validateStored(rows, definitions) {
  const byDefinition = new Map(), ids = new Map(), attempts = new Set(), nonces = new Set();
  for (const row of rows.filter(isActivity)) {
    checkCid(row.course);
    const key = `${definitionPrefix(row.course)}${row.definitionId}`;
    const definition = definitions.get(key);
    if (!definition || row.courseCode !== definition.native?.code) throw new Error('Missing or mismatched historical activity definition');
    const raw = rawEvent(row), previous = ids.get(row.id);
    // Storage bookkeeping is not evidence and cannot cause duplicate conflicts.
    if (previous) {
      if (duplicateIdentity(previous) !== duplicateIdentity(row)) throw new Error('Conflicting duplicate activity event ID');
      continue;
    }
    ids.set(row.id, row);
    if (row.event === 'activity-submission') {
      for (const [set, value] of [[attempts, row.request?.attemptId], [nonces, row.request?.nonce]]) {
        const identity = JSON.stringify([row.course, value]);
        if (set.has(identity)) throw new Error('Duplicate committed activity attempt/nonce');
        set.add(identity);
      }
    }
    if (!byDefinition.has(key)) byDefinition.set(key, []);
    byDefinition.get(key).push(raw);
  }
  const valid = [];
  for (const [key, records] of byDefinition) {
    const definition = definitions.get(key), C = resolveMasterySnapshot(definition);
    const { errors, accept } = unwrap('Invalid activity history');
    const result = accept(await validateActivityHistory(records, C, errors));
    const identity = key.slice(key.lastIndexOf(':') + 1);
    const cid = decodeURIComponent(key.split(':')[1]);
    valid.push(...result.map(row => bounded({ ...row, course: cid, courseCode: C.code, definitionId: identity })));
  }
  // Prevent a legacy/log import from silently capturing an immutable ID.
  for (const row of rows.filter(r => !isActivity(r))) if (ids.has(row.id)) throw new Error('Activity event ID collides with legacy log');
  return order(valid);
}

const definitionsMap = () => new Map(storedDefinitions().map(p => [p.k, p.value]));

/** Append one immutable event. Course code belongs to the evidence binding;
 * folder ID belongs to log/reset ownership. Imported authority is never stored. */
export function recordActivityEvent(cid, C, fields, options = {}) {
  const input = structuredClone(fields), course = structuredClone(C);
  return serialize(() => record(cid, course, input, options));
}

async function record(cid, C, fields, { now = Date.now(), sessionId } = {}) {
  checkCid(cid);
  if (!stamp(now) || now <= cutoff(cid) || typeof sessionId !== 'string' || !sessionId) throw new Error('New event time/session must follow course reset');
  for (const key of ['id', 'ts', 'course', 'courseCode', 'definitionId', 'schemaVersion', 'sessionId', 'trust', 'sent'])
    if (Object.hasOwn(fields, key)) throw new Error(`Activity event identity is owned by storage: ${key}`);
  let snapshot = masterySnapshot(C), definitionId = await snapshotIdentity(snapshot);
  const reference = fields.submissionId ?? fields.evaluationId ?? fields.supersedes;
  if (reference) {
    const prior = logRows().find(r => r.id === reference && r.course === cid && isActivity(r));
    if (!prior) throw new Error('Missing activity event reference');
    if (prior.ts <= cutoff(cid)) throw new Error('Cannot revise activity work cleared by reset');
    definitionId = prior.definitionId;
    snapshot = JSON.parse(getItem(`${definitionPrefix(cid)}${definitionId}`));
    const rootSubmission = prior.event === 'activity-submission' ? prior : logRows().find(r => r.id === prior.submissionId);
    if (rootSubmission && rootSubmission.ts <= cutoff(cid)) throw new Error('Cannot revise activity work cleared by reset');
  }
  const owner = deviceId();
  const prior = reference && logRows().find(r => r.id === reference);
  // Equal-millisecond local events retain causal lexical order without moving
  // the commitment clock (which is also used by delayed-evidence gates).
  const id = prior?.ts === now && prior.id.startsWith(`${owner}:`)
    ? `${prior.id}:${crypto.randomUUID()}` : `${owner}:${now}:${crypto.randomUUID()}`;
  const row = bounded({ ...fields, schemaVersion: 1, id, ts: now,
    sessionId, course: cid, courseCode: C.code, definitionId });
  const definitions = definitionsMap(), key = `${definitionPrefix(cid)}${definitionId}`;
  definitions.set(key, snapshot);
  const valid = await validateStored([...logRows(), row], definitions);
  // No mutation before all validation succeeds. Recheck after awaited hashing:
  // concurrent commits must not silently reuse attempt/nonces or cross a reset.
  if (now <= cutoff(cid)) throw new Error('Course reset during activity commit; retry');
  if (logRows().some(r => r.id === row.id)) throw new Error('Activity identity collision');
  setItem(key, JSON.stringify(snapshot));
  mergeRows(valid.filter(r => r.id === row.id));
  return structuredClone(valid.find(r => r.id === row.id));
}

function draftIdentity(activityId, compatibility) { return JSON.stringify([activityId, compatibility]); }
function validateDraft(record, definitions) {
  if (!record || typeof record.k !== 'string' || !stamp(record.ts) || typeof record.rev !== 'string' || !record.rev)
    throw new Error('Invalid activity draft stamp');
  if (Object.keys(record).some(k => !['k', 'ts', 'rev', 'value'].includes(k))) throw new Error('Unknown activity draft record field');
  const match = /^learner:([^:]+):activity-draft:(.*)$/.exec(record.k);
  const owner = match && decodeURIComponent(match[1]);
  if (!owner?.startsWith('mastery:')) throw new Error('Invalid activity draft owner');
  const cid = owner.slice(8); checkCid(cid);
  const identity = JSON.parse(decodeURIComponent(match[2]));
  if (!Array.isArray(identity) || identity.length !== 2 || identity.some(x => typeof x !== 'string')) throw new Error('Invalid activity draft identity');
  bounded(record);
  if (record.value === null) return { cid, identity };
  const value = record.value, snapshot = definitions.get(`${definitionPrefix(cid)}${value.definitionId}`);
  if (!snapshot || !stamp(value.started) || value.started > record.ts) throw new Error('Missing activity draft definition/start');
  const C = resolveMasterySnapshot(snapshot), activity = C.activityIndex.activities[value.activityId];
  if (!activity || value.activityId !== identity[0]) throw new Error('Invalid draft activity');
  const errors = [];
  if (!value.input || typeof value.input !== 'object' || Array.isArray(value.input)) throw new Error('Draft input mapping required');
  const input = structuredClone(value.input);
  if (input.text === undefined || input.text === '') input.text = 'Uncommitted draft';
  if (activity.kind === 'audio' && (!input.artifacts || Array.isArray(input.artifacts) && !input.artifacts.length))
    input.artifacts = [{ id: 'draft', url: 'https://example.invalid/draft', sha256: '0'.repeat(64), bytes: 1, mediaType: 'audio/ogg' }];
  const request = { schemaVersion: 1, adapter: activity.adapter, courseId: C.code, activityId: activity.id,
    attemptId: 'draft', nonce: 'draft', submissionHash: '0'.repeat(64), input,
    contentVersion: activity.contentVersion, evidenceVersion: activity.evidenceVersion, rubricVersion: activity.rubricVersion };
  if (!validateAdapterRequest(request, activity, errors)) throw new Error(errors.join('; '));
  if (Object.keys(value).some(k => !['definitionId', 'activityId', 'started', 'input'].includes(k))) throw new Error('Unknown activity draft field');
  return { cid, identity, C };
}

export function saveActivityDraft(cid, C, activityId, input, options = {}) {
  const value = structuredClone(input), course = structuredClone(C);
  return serialize(() => saveDraft(cid, course, activityId, value, options));
}

async function saveDraft(cid, C, activityId, input, { now = Date.now() } = {}) {
  checkCid(cid);
  if (!stamp(now) || now <= cutoff(cid)) throw new Error('Draft time must follow course reset');
  const snapshot = masterySnapshot(C), definitionId = await snapshotIdentity(snapshot);
  const compatibility = await activityInputHash(await activityEventCompatibility(C, activityId));
  const identity = draftIdentity(activityId, compatibility), key = learnerKey(`mastery:${cid}`, 'activity-draft', identity);
  const prior = readActivityDrafts(cid).find(p => p.k === key);
  const value = input === null ? null : { definitionId, activityId, started: prior?.value && prior.ts > cutoff(cid) && prior.value.started > cutoff(cid) ? prior.value.started : now, input };
  const candidate = { k: key, ts: Math.max(now, (prior?.ts || 0) + 1), rev: '0'.repeat(36), value };
  const definitions = definitionsMap(); definitions.set(`${definitionPrefix(cid)}${definitionId}`, snapshot);
  validateDraft(candidate, definitions);
  if (now <= cutoff(cid)) throw new Error('Course reset during draft save; retry');
  setItem(`${definitionPrefix(cid)}${definitionId}`, JSON.stringify(snapshot));
  return writeActivityDraft(cid, identity, value, now);
}

/** Synchronous snapshot for the existing log exporter. No credentials, device
 * identity, report caches, trust sets or binary payloads enter the file. */
export function activityBackup() {
  return { schemaVersion: 1, definitions: storedDefinitions(),
    drafts: keys().filter(k => /^learner:[^:]+:activity-draft:/.test(k)).map(k => JSON.parse(getItem(k))),
    resets: keys().filter(k => /^reset:[\w-]{1,64}$/.test(k)).map(k => ({ k, value: cutoff(k.slice(6)) })) };
}

export function restoreActivityBackup(backup, rows, { synced = false } = {}) {
  const saved = structuredClone(backup), incoming = structuredClone(rows);
  return serialize(() => restoreBackup(saved, incoming, synced));
}

async function restoreBackup(backup, rows, synced) {
  if (backup?.schemaVersion !== 1 || !Array.isArray(backup.definitions) || !Array.isArray(backup.drafts) || !Array.isArray(backup.resets) || !Array.isArray(rows))
    throw new Error('Unsupported activity backup');
  if (rows.some(r => !r || typeof r.id !== 'string' || !r.id || !Number.isFinite(r.ts))) throw new Error('Invalid learner log row');
  const definitions = definitionsMap();
  for (const entry of backup.definitions) {
    const match = /^mastery-definition:([^:]+):([a-f0-9]{64})$/.exec(entry?.k);
    if (!match) throw new Error('Invalid activity definition key');
    checkCid(decodeURIComponent(match[1]));
    if (await snapshotIdentity(entry.value) !== match[2]) throw new Error('Activity definition checksum mismatch');
    if (definitions.has(entry.k) && responseKey(definitions.get(entry.k)) !== responseKey(entry.value)) throw new Error('Conflicting activity definition');
    definitions.set(entry.k, entry.value);
  }
  const valid = await validateStored([...logRows(), ...rows], definitions);
  for (const record of backup.drafts) {
    const { identity, C } = validateDraft(record, definitions);
    if (C && identity[1] !== await activityInputHash(await activityEventCompatibility(C, identity[0]))) throw new Error('Draft compatibility mismatch');
  }
  for (const reset of backup.resets) if (!/^reset:[\w-]{1,64}$/.test(reset?.k) || !stamp(reset.value)) throw new Error('Invalid activity reset cutoff');
  const draftWrites = new Map();
  for (const record of backup.drafts) {
    const old = draftWrites.get(record.k) || (getItem(record.k) && JSON.parse(getItem(record.k)));
    if (old && record.ts === old.ts && record.rev === old.rev && responseKey(record) !== responseKey(old))
      throw new Error('Conflicting activity draft revision');
    if (!old || record.ts > old.ts || record.ts === old.ts && record.rev > old.rev) draftWrites.set(record.k, record);
  }
  // All imports validate before writing; reset is monotonic even for old files.
  for (const reset of backup.resets) if (reset.value > (Number(getItem(reset.k)) || 0)) setItem(reset.k, String(reset.value));
  for (const [k, value] of definitions) setItem(k, JSON.stringify(value));
  for (const [k, record] of draftWrites) setItem(k, JSON.stringify(record));
  const activityIds = new Set(valid.map(r => r.id));
  // Remote records are already on the server. Revalidated local rows retain
  // their upload state; downloading must not acknowledge an unsent local edit.
  const local = new Map(logRows().map(r => [r.id, r]));
  return mergeRows([...valid, ...rows.filter(r => !activityIds.has(r.id))].map(r =>
    ({ ...r, sent: synced ? local.get(r.id)?.sent || (local.has(r.id) ? 0 : 1) : 0 })));
}

/** Recompute, never import/cache certification. External artifact bytes are not
 * owned by this store, so a restored descriptor always reports unavailable. */
export async function rebuildActivityState(cid, C, { now, verifiedEvaluationIds = new Set() } = {}) {
  if (!C?.mastery) return null;
  checkCid(cid);
  if (!stamp(now)) throw new Error('Explicit nonnegative projection time required');
  const definitions = definitionsMap(), all = await validateStored(logRows().filter(r => r.course === cid), definitions);
  const resetAt = cutoff(cid), voids = new Set(logRows().filter(r => r.course === cid && r.event === 'attempt-void' && r.ts > resetAt && r.ts <= now).map(r => r.attemptId));
  const removed = new Set(all.filter(r => r.event === 'activity-submission' && (r.ts <= resetAt || voids.has(r.request.attemptId))).map(r => r.id));
  for (const row of order(all)) if (removed.has(row.submissionId) || removed.has(row.evaluationId) || removed.has(row.supersedes) || row.ts <= resetAt) removed.add(row.id);
  const active = all.filter(r => !removed.has(r.id)), current = [], historical = [];
  const eligible = new Set(), compatibility = new Map();
  for (const row of active) {
    if (row.event === 'activity-submission') {
      const aid = row.request.activityId;
      if (Object.hasOwn(C.activityIndex.activities, aid)) {
        if (!compatibility.has(aid)) compatibility.set(aid, await activityEventCompatibility(C, aid));
        if (responseKey(row.compatibility) === responseKey(compatibility.get(aid))) eligible.add(row.id);
      }
    } else if (row.event === 'activity-claim') {
      if (C.mastery.roots[row.root]?.semanticVersion === row.semanticVersion && C.mastery.roots[row.root]?.claimRequirement === 'historical-evidence' && (!row.supersedes || eligible.has(row.supersedes))) eligible.add(row.id);
    } else if (eligible.has(row.submissionId ?? row.evaluationId)) eligible.add(row.id);
    if (eligible.has(row.id)) current.push(rawEvent(row));
  }
  for (const definitionId of new Set(active.filter(r => !eligible.has(r.id)).map(r => r.definitionId))) {
    const old = active.filter(r => r.definitionId === definitionId).map(rawEvent);
    const snapshot = definitions.get(`${definitionPrefix(cid)}${definitionId}`);
    const errors = [], projection = await projectMasteryHistory(resolveMasterySnapshot(snapshot), old, { now, verifiedEvaluationIds }, errors);
    if (!projection) throw new Error(errors.join('; '));
    historical.push({ definitionId, projection });
  }
  const errors = [], projection = await projectMasteryHistory(C, current, { now, verifiedEvaluationIds }, errors);
  if (!projection) throw new Error(errors.join('; '));
  const drafts = [];
  for (const record of readActivityDrafts(cid)) {
    const { identity } = validateDraft(record, definitions);
    if (record.ts <= resetAt || !record.value || record.value.started <= resetAt) continue;
    const expected = C.activityIndex.activities[identity[0]] && await activityInputHash(await activityEventCompatibility(C, identity[0]));
    drafts.push({ ...record.value, compatible: identity[1] === expected });
  }
  const artifacts = active.filter(r => r.event === 'activity-submission' && r.ts <= now).flatMap(r =>
    (r.request.input.artifacts || []).map(a => ({ submissionId: r.id, ...a, availability: 'unavailable', bytesRestored: false })));
  // Reuse this exact reset/void/compatibility partition for action planning;
  // consumers must not reconstruct it independently from raw persisted rows.
  return { projection, rows: current.filter(r => r.ts <= now), historical, drafts, artifacts };
}

export function dropActivityState(cid) {
  for (const key of keys()) if (key.startsWith(definitionPrefix(cid)) || key.startsWith(learnerKey(`mastery:${cid}`, 'activity-draft'))) removeItem(key);
}
