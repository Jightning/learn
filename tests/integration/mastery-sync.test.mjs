import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, d1 } from '../helpers/d1shim.mjs';
import { onRequestPost } from '../../functions/api/sync.js';
import { configure, sync, setSyncCourseLoader, lastSync } from '../../src/lib/cloud.js';
import { getItem, setItem, removeItem, keys, clearLog, logRows, appendRow } from '../../src/lib/store.js';
import { recordActivityEvent, saveActivityDraft, rebuildActivityState, activityBackup } from '../../src/lib/mastery-state.js';
import { masterySyncPrefs, stageMasteryPage, finishMasterySync } from '../../src/lib/mastery-sync.js';
import { persistenceCourse, submissionFields, evaluationFields } from '../fixtures/mastery/history.mjs';
import { deriveKey, seal } from '../../src/lib/seal.js';
import { setPref } from '../../src/lib/prefs.js';
import { purge } from '../../src/lib/purge.js';

const cid = 'folder', now = 10 * 864e5;
let db, calls, refreshed, C;
const wipe = () => { clearLog(); for (const k of keys()) removeItem(k); };
const snapshot = () => ({ kv: keys().map(k => [k, getItem(k)]), rows: structuredClone(logRows()) });
const load = s => { wipe(); for (const [k, v] of s.kv) setItem(k, v); for (const row of s.rows) appendRow(row); };
async function fresh(device) { wipe(); await configure('test'); setItem('device:id', device); }
const run = () => rebuildActivityState(cid, C, { now });
async function submit(i, ts = 10 + i) {
  return recordActivityEvent(cid, C, await submissionFields(C, i), { now: ts, sessionId: `session-${i}` });
}
async function api(payload) {
  return onRequestPost({ request: new Request('https://test/api/sync', {
    method: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify(payload)
  }), env: { SYNC_SECRET: 'test', DB: d1(db) } });
}
beforeEach(async () => {
  db = freshDb(new URL('../../tools/schema.sql', import.meta.url).pathname);
  calls = []; refreshed = null; C = persistenceCourse();
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  globalThis.dispatchEvent = () => {};
  globalThis.CustomEvent = class { constructor(type, options) { this.type = type; Object.assign(this, options); } };
  globalThis.fetch = async (path, options) => {
    assert.equal(path, '/api/sync', 'no external artifact or evaluator request');
    const payload = JSON.parse(options.body); calls.push(payload); return api(payload);
  };
  await fresh('a');
  setSyncCourseLoader(async () => { refreshed = await run(); });
});
afterEach(() => { db.close(); setSyncCourseLoader(async () => {}); wipe(); });

test('S11 draft context and reviewer follow-up cross encrypted sync with unavailable artifact bytes', async () => {
  const initial = await submit(0);
  const input = { text: 'Fresh answer', followup: { submissionHash: initial.request.submissionHash,
    reviewerId: 'claimed-human', prompt: 'Explain the zero-input case' }, artifacts: [{ id: 'report',
    url: 'https://example.invalid/report.txt', sha256: 'a'.repeat(64), bytes: 123, mediaType: 'text/plain' }] };
  const fields = await submissionFields(C, 0, input);
  fields.request.attemptId = 'fresh-attempt'; fields.request.nonce = 'fresh-nonce';
  await recordActivityEvent(cid, C, fields, { now: 20, sessionId: 'followup' });
  const context = { assistance: fields.assistance, timing: fields.timing, environment: { description: '' } };
  await saveActivityDraft(cid, C, 'task-1', { text: 'Unfinished explanation' }, { now: 30, context });
  const expected = await run();
  assert.equal((await sync({ manual: true })).ok, true);
  await fresh('b'); assert.equal((await sync({ manual: true })).ok, true);
  assert.deepEqual(await run(), expected);
  assert.deepEqual(refreshed.drafts[0].context, context);
  assert.deepEqual(refreshed.rows[1].request.input.followup, input.followup);
  assert.equal(refreshed.artifacts[0].availability, 'unavailable');
  assert.equal(refreshed.artifacts[0].bytesRestored, false);
  assert.equal(refreshed.projection.complete, false);
});

test('S09 feedback durations and repair methods cross encrypted sync without gaining authority', async () => {
  const sub = await submit(0);
  const e = await recordActivityEvent(cid, C, evaluationFields(C, sub, 20, 'fail'), { now: 20, sessionId: 'timing' });
  const timing = { activeMs: 120000, setupMs: 0, wallMs: 300000, source: 'external-report', interrupted: false };
  await recordActivityEvent(cid, C, { event: 'activity-feedback', evaluationId: e.id, repair: 'representation', timing }, { now: 30, sessionId: 'timing' });
  const expected = await run();
  assert.equal((await sync({ manual: true })).ok, true);
  await fresh('b');
  assert.equal((await sync({ manual: true })).ok, true);
  assert.deepEqual(await run(), expected);
  const feedback = logRows().find(r => r.event === 'activity-feedback');
  assert.deepEqual(feedback.timing, timing);
  assert.equal(feedback.repair, 'representation');
  assert.equal(expected.projection.complete, false);
});

test('A → unopened B → A preserves immutable evidence, independent drafts, artifacts and provisional-only trust', async () => {
  const input = { text: 'Independent work', artifacts: [{ id: 'source', url: 'https://example.invalid/private.txt',
    sha256: 'a'.repeat(64), bytes: 12, mediaType: 'text/plain' }] };
  const sub = await recordActivityEvent(cid, C, await submissionFields(C, 0, input), { now: 10, sessionId: 'session-0' });
  await recordActivityEvent(cid, C, evaluationFields(C, sub, 11), { now: 11, sessionId: 'session-0' });
  await saveActivityDraft(cid, C, 'task-1', { text: 'A draft' }, { now: 20 });
  const a = snapshot();
  await fresh('b'); await saveActivityDraft(cid, C, 'task-2', { text: 'B draft' }, { now: 21 });
  const b = snapshot();
  load(a); assert.equal((await sync({ manual: true })).ok, true); const uploadedA = snapshot();
  load(b); assert.equal((await sync({ manual: true })).ok, true);
  assert.deepEqual(refreshed.drafts.map(d => d.input.text).sort(), ['A draft', 'B draft']);
  assert.equal(refreshed.projection.provisional.simple.anchors[3].facets.explain.groups, 1);
  assert.equal(refreshed.projection.roots.simple.anchor, null, 'human label supplies no verified credit');
  assert.equal(refreshed.projection.complete, false);
  assert.equal(refreshed.artifacts[0].availability, 'unavailable');
  assert.equal(refreshed.artifacts[0].bytesRestored, false);
  assert.ok(logRows().every(r => r.sent === 1));
  await submit(1);
  assert.equal((await sync({ manual: true })).ok, true);
  const expected = await run();
  load(uploadedA); assert.equal((await sync({ manual: true })).ok, true);
  assert.deepEqual(await run(), expected);
  assert.equal(logRows().length, 3);
  // As with ordinary prefs, a received key can be relayed once before this
  // device owns an upload acknowledgment for its fingerprint.
  assert.equal((await sync({ manual: true })).ok, true);
  calls = []; assert.equal((await sync({ manual: true })).ok, true);
  assert.ok(calls.every(p => !p.rows.length && !p.prefs.length), 'acknowledged records do not upload again');
  const encrypted = db.prepare('SELECT enc FROM prefs UNION ALL SELECT enc FROM log').all();
  assert.ok(encrypted.every(p => !p.enc.includes('Independent work') && !p.enc.includes('A draft')));
  assert.equal(getItem('device:id'), 'a');
});

test('draft tombstones and reset cutoffs defeat stale uploads and later reviews without losing post-reset work', async () => {
  const sub = await submit(0);
  await saveActivityDraft(cid, C, 'task-1', { text: 'stale' }, { now: 20 });
  const stale = snapshot();
  assert.equal((await sync({ manual: true })).ok, true);
  await fresh('b'); assert.equal((await sync({ manual: true })).ok, true);
  await saveActivityDraft(cid, C, 'task-1', null, { now: 30 });
  setPref(`reset:${cid}`, '100');
  assert.equal((await sync({ manual: true })).ok, true);
  load(stale);
  await recordActivityEvent(cid, C, evaluationFields(C, sub, 200), { now: 200, sessionId: 'late' });
  // A stale device can give its lower cutoff a later preference timestamp.
  setPref(`reset:${cid}`, '50');
  assert.equal((await sync({ manual: true })).ok, true);
  assert.equal(getItem(`reset:${cid}`), '100');
  assert.deepEqual((await run()).drafts, []);
  assert.equal((await run()).projection.provisional.simple.anchor, null);
  await saveActivityDraft(cid, C, 'task-1', { text: 'after reset' }, { now: 300 });
  assert.equal((await sync({ manual: true })).ok, true);
  await fresh('c'); assert.equal((await sync({ manual: true })).ok, true);
  assert.equal(getItem(`reset:${cid}`), '100');
  assert.deepEqual(refreshed.drafts.map(d => d.input.text), ['after reset']);
  assert.equal(refreshed.drafts[0].started, 300);
  assert.equal(logRows().length, 2, 'reset keeps immutable history without awarding its effects');
});

test('interrupted multi-page download durably stages evidence before definitions; retry never duplicates it', async () => {
  await submit(0);
  // These sort before mastery-wire and force the definitions onto another page.
  for (let i = 0; i < 505; i++) setPref(`hue:pad-${i}`, 'x');
  assert.equal((await sync({ manual: true })).ok, true);
  await fresh('b');
  const fetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (...args) => ++requests === 2 ? new Response('{}', { status: 503 }) : fetch(...args);
  assert.equal((await sync({ manual: true })).ok, false);
  assert.ok(Number(getItem('cloud:cursor')) > 0);
  assert.equal(logRows().length, 0, 'staged records cannot become evidence before dependency validation');
  assert.ok(keys().some(k => k.startsWith('cloud:mastery-stage:row:')));
  assert.equal(lastSync(), 0);
  const restart = snapshot(); load(restart);
  globalThis.fetch = fetch;
  assert.equal((await sync({ manual: true })).ok, true);
  assert.equal(logRows().length, 1);
  assert.ok(!keys().some(k => k.startsWith('cloud:mastery-stage:')));
  assert.equal((await sync({ manual: true })).ok, true);
  assert.equal(logRows().length, 1);
});

test('a failed upload remains pending and a later pass sends all definition dependencies', async () => {
  await submit(0); await saveActivityDraft(cid, C, 'task-1', { text: 'pending' }, { now: 20 });
  const fetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  assert.equal((await sync({ manual: true })).ok, false);
  assert.equal(logRows()[0].sent, undefined);
  assert.equal(lastSync(), 0);
  globalThis.fetch = fetch;
  assert.equal((await sync({ manual: true })).ok, true);
  await fresh('b'); assert.equal((await sync({ manual: true })).ok, true);
  assert.equal(logRows().length, 1); assert.equal(refreshed.drafts[0].input.text, 'pending');
});

test('partial upload acknowledgments survive retry while a receiver rejects the incomplete backup', async () => {
  await submit(0);
  for (let i = 0; i < 800; i++) setPref(`hue:pad-${i}`, 'x'.repeat(4000));
  const fetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (...args) => ++requests === 2 ? new Response('{}', { status: 503 }) : fetch(...args);
  assert.equal((await sync({ manual: true })).ok, false);
  assert.equal(logRows()[0].sent, 1, 'the committed first batch stays acknowledged');
  const source = snapshot();
  globalThis.fetch = fetch;
  await fresh('b'); assert.equal((await sync({ manual: true })).ok, false);
  assert.equal(logRows().length, 0); assert.equal(lastSync(), 0);
  const receiver = snapshot();
  load(source); assert.equal((await sync({ manual: true })).ok, true);
  load(receiver); assert.equal((await sync({ manual: true })).ok, true);
  assert.equal(logRows().length, 1);
});

test('canonical snapshot chunks converge across insertion order; identical draft revisions cannot conflict silently', async () => {
  await saveActivityDraft(cid, C, 'task-0', { text: 'original' }, { now: 20 });
  const prefs = masterySyncPrefs();
  const definition = activityBackup().definitions[0];
  const reverse = x => Array.isArray(x) ? x.map(reverse) : x && typeof x === 'object'
    ? Object.fromEntries(Object.entries(x).reverse().map(([k, v]) => [k, reverse(v)])) : x;
  setItem(definition.k, JSON.stringify(reverse(definition.value)));
  assert.deepEqual(masterySyncPrefs(), prefs);
  const draft = prefs.find(p => p.k.includes('activity-draft'));
  stageMasteryPage([], [draft]);
  const conflict = structuredClone(draft); conflict.v.value.input.text = 'conflict';
  assert.throws(() => stageMasteryPage([], [conflict]), /Conflicting mastery sync revision/);
  await finishMasterySync();
  assert.equal((await run()).drafts[0].input.text, 'original');
});

test('historical claim revisions and attempt voids round-trip without implying technical or reviewer authority', async () => {
  C = persistenceCourse(f => f.source.targets.roots[0].claimRequirement = 'historical-evidence');
  const sub = await submit(0);
  await recordActivityEvent(cid, C, evaluationFields(C, sub, 11), { now: 11, sessionId: 'session-0' });
  const claim = await recordActivityEvent(cid, C, { event: 'activity-claim', root: 'simple', semanticVersion: 1,
    status: 'submitted', sources: ['https://example.invalid/report'], uncertainty: 'Not independently established',
    provenance: { kind: 'reviewer-claim', reviewerId: 'human', issuedAt: 20 } }, { now: 20, sessionId: 'claim' });
  await recordActivityEvent(cid, C, { event: 'activity-claim', root: 'simple', semanticVersion: 1,
    status: 'withdrawn', sources: ['https://example.invalid/report'], uncertainty: 'Unqualified report',
    provenance: { kind: 'self-report', reviewerId: 'learner', issuedAt: 30 }, supersedes: claim.id, reason: 'Source qualification changed'
  }, { now: 30, sessionId: 'claim' });
  appendRow({ id: 'a:void', event: 'attempt-void', course: cid, ts: 40, attemptId: sub.request.attemptId });
  const expected = await run();
  assert.equal((await sync({ manual: true })).ok, true);
  await fresh('b'); assert.equal((await sync({ manual: true })).ok, true);
  assert.deepEqual(refreshed, expected); assert.equal(refreshed.projection.historicalClaimsComplete, false);
  assert.equal(refreshed.projection.provisional.simple.anchor, null);
});

test('large public definitions chunk below ciphertext limits and reassemble beyond a download page', async () => {
  C = persistenceCourse(f => {
    const template = structuredClone(f.activities.activities[0]);
    f.activities.activities.push(...Array.from({ length: 1500 }, (_, i) => ({ ...template,
      id: `large-${i}`, group: `large-${i}`, environment: { capabilities: ['python'], instructions: 'x'.repeat(500) } })));
  });
  await saveActivityDraft(cid, C, 'task-0', { text: 'large definition draft' }, { now: 20 });
  const prefs = masterySyncPrefs();
  assert.ok(prefs.filter(p => p.k.startsWith('mastery-wire:')).length > 40);
  assert.equal((await sync({ manual: true })).ok, true);
  assert.ok(db.prepare('SELECT enc FROM prefs').all().every(p => p.enc.length < 128 * 1024));
  await fresh('b'); calls = [];
  assert.equal((await sync({ manual: true })).ok, true);
  assert.ok(calls.length > 2, 'the definition spans bounded byte pages');
  assert.equal(refreshed.drafts[0].input.text, 'large definition draft');
  assert.equal(activityBackup().definitions.length, 1);
});

test('missing/unsupported/tampered definitions and oversized draft/event records fail closed', async () => {
  await submit(0); await saveActivityDraft(cid, C, 'task-1', { text: 'draft' }, { now: 20 });
  const rows = structuredClone(logRows()), prefs = masterySyncPrefs();
  await fresh('b'); stageMasteryPage(rows, []);
  await assert.rejects(finishMasterySync(), /Missing/);
  assert.equal(logRows().length, 0);
  const unknown = structuredClone(prefs); unknown.find(p => p.k.startsWith('mastery-wire:')).v.version = 9;
  assert.throws(() => stageMasteryPage([], unknown), /chunk/);
  const oversized = structuredClone(rows); oversized[0].request.input.text = 'x'.repeat(20000);
  assert.throws(() => stageMasteryPage(oversized, []), /16 KiB/);
  const draft = structuredClone(prefs.find(p => p.k.includes('activity-draft')));
  draft.v.value.input.text = 'x'.repeat(20000);
  assert.throws(() => stageMasteryPage([], [draft]), /oversized/);
  const altered = structuredClone(prefs);
  const chunk = altered.find(p => p.k.startsWith('mastery-wire:'));
  const text = atob(chunk.v.data).replace('synthetic', 'Synthetic');
  chunk.v.data = btoa(text);
  stageMasteryPage([], altered);
  await assert.rejects(finishMasterySync(), /checksum|Invalid/);
  assert.equal(logRows().length, 0); assert.equal(activityBackup().definitions.length, 0);
});

test('conflicting immutable IDs/revisions do not overwrite canonical data; an old transport cannot establish trust', async () => {
  await submit(0); await saveActivityDraft(cid, C, 'task-1', { text: 'original' }, { now: 20 });
  const rows = structuredClone(logRows()), prefs = masterySyncPrefs();
  const altered = structuredClone(rows); altered[0].request.input.text = 'forged';
  stageMasteryPage(altered, prefs);
  await assert.rejects(finishMasterySync(), /Conflicting duplicate/);
  assert.equal(logRows()[0].request.input.text, 'Independent explanation 0');
  await fresh('b');
  const key = await deriveKey('test');
  // Protocol-2 legacy clients can retain opaque new rows, but cannot make a
  // complete mastery backup by sending only their log or a reviewer label.
  const enc = await seal(key, rows[0]);
  let response = await api({ protocol: 2, device: 'a', rows: [{ id: rows[0].id, ts: rows[0].ts, enc }] });
  assert.equal(response.status, 200);
  assert.equal((await sync({ manual: true })).ok, false);
  assert.equal(logRows().length, 0);
  response = await api({ protocol: 1, device: 'a' }); assert.equal(response.status, 426);
});

test('purge removes staged dependencies for its course and remote deletion suppresses stale downloads', async () => {
  await submit(0); await saveActivityDraft(cid, C, 'task-1', { text: 'own' }, { now: 20 });
  stageMasteryPage(logRows(), masterySyncPrefs());
  await saveActivityDraft('other', C, 'task-1', { text: 'other' }, { now: 20 });
  stageMasteryPage([], masterySyncPrefs().filter(p => p.k.includes('other')));
  await purge(cid, C.code);
  assert.ok(keys().some(k => k.startsWith('cloud:mastery-stage:')));
  await finishMasterySync();
  assert.equal((await run()).drafts.length, 0);
  assert.equal((await rebuildActivityState('other', C, { now })).drafts[0].input.text, 'other');
  await fresh('a'); await submit(0);
  assert.equal((await sync({ manual: true })).ok, true);
  db.prepare('INSERT INTO courses(id,version,bytes,deleted_at,updated_at) VALUES(?,?,?,?,?)')
    .run(cid, 'v', 1, Date.now(), Date.now());
  await fresh('b'); assert.equal((await sync({ manual: true })).ok, true);
  assert.equal(logRows().length, 0); assert.equal(activityBackup().definitions.length, 0);
});
