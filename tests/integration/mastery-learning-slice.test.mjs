import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { unzipSync, zipSync } from 'fflate';
import { fromZip, fromFolder } from '../../src/lib/intake.js';
import { ledgerPackage, publicFiles } from '../../examples/mastery-cost-ledger/package.mjs';
import { learningSliceFiles } from '../fixtures/mastery/learning-slice.mjs';
import { parseCourse } from '../../src/lib/parse.js';
import { importCourse, removeCourse } from '../../src/lib/courses.js';
import { activityInputHash, activityEventCompatibility } from '../../src/lib/activity-events.js';
import { validateAdapterRequest, validateAdapterResult } from '../../src/lib/activity-adapters.js';
import { recordActivityEvent, rebuildActivityState } from '../../src/lib/mastery-state.js';
import { commitSubmission, importSubmissionResult, revealSubmissionFeedback, feedbackReady } from '../../src/lib/activity-submission.js';
import { masteryActionPlan } from '../../src/lib/mastery-actions.js';
import { exposeLesson, setEnvironment, loadMasteryPath } from '../../src/lib/mastery-path.js';
import { fromJSON, toJSON } from '../../src/lib/log.js';
import { clearLog, keys, removeItem } from '../../src/lib/store.js';
import { evaluationFields } from '../fixtures/mastery/history.mjs';

const DAY = 864e5, cid = 'ledger-slice';
const wipe = () => { clearLog(); for (const key of keys()) removeItem(key); };
const context = { assistance: { sources: [], answerExposed: false },
  timing: { activeMs: 60000, setupMs: 1000, wallMs: null, source: 'external-report', interrupted: false },
  environment: { description: 'Local CPython; deterministic evaluator test double' } };
const write = (folder, files) => { for (const [path, text] of Object.entries(files)) {
  mkdirSync(dirname(join(folder, path)), { recursive: true }); writeFileSync(join(folder, path), text);
} };
const course = () => {
  const parsed = parseCourse(learningSliceFiles(ledgerPackage().sha256));
  assert.deepEqual(parsed.errors, []); return parsed.course;
};

test('real Python package reproduces seeded failures, reviewer success and reset without private distribution', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ledger-python-'));
  try {
    const first = ledgerPackage(), second = ledgerPackage();
    assert.deepEqual(first, second, 'archive and hash are reproducible');
    for (const TZ of ['UTC', 'America/Indiana/Indianapolis']) {
      const hash = spawnSync(process.execPath, ['--input-type=module', '-e',
        'import {ledgerPackage} from "./examples/mastery-cost-ledger/package.mjs"; console.log(ledgerPackage().sha256)'],
      { encoding: 'utf8', env: { ...process.env, TZ } });
      assert.equal(hash.status, 0, hash.stderr); assert.equal(hash.stdout.trim(), first.sha256);
    }
    const files = unzipSync(first.bytes);
    assert.deepEqual(Object.keys(files).sort(), [...publicFiles].sort());
    write(dir, files);
    const run = () => spawnSync('python3', ['-B', '-m', 'unittest', '-v'], { cwd: dir, encoding: 'utf8' });
    const faulty = run();
    assert.equal(faulty.status, 1, faulty.stderr);
    assert.match(faulty.stderr, /variant='base'/); assert.match(faulty.stderr, /variant='fresh'/);
    assert.match(faulty.stderr, /variant='delayed'/); assert.doesNotMatch(faulty.stderr, /variant='empty'/);
    copyFileSync(new URL('../../examples/mastery-cost-ledger/reviewer/ledger.py', import.meta.url), join(dir, 'ledger.py'));
    const good = run(); assert.equal(good.status, 0, good.stderr); assert.match(good.stderr, /OK/);
    copyFileSync(new URL('../../examples/mastery-cost-ledger/reviewer/test_private.py', import.meta.url), join(dir, 'test_private.py'));
    assert.equal(run().status, 0, 'reviewer solution passes separately supplied private checks');
    rmSync(join(dir, 'test_private.py'));
    write(dir, files);
    assert.equal(run().status, 1, 'reset restores the seeded fault');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('existing course archive intake rejects malformed, oversized and traversal archives', async () => {
  await assert.rejects(fromFolder([]), /no readable course files/);
  for (const [bytes, pattern] of [
    [new Uint8Array([80, 75, 3, 4, 0]), /no readable course files|could not read that zip/],
    [zipSync({ '../escape.json': new TextEncoder().encode('{}') }), /unsafe path/],
    [zipSync({ 'course.json': new Uint8Array(2 * 1024 * 1024 + 1) }), /larger than/]
  ]) await assert.rejects(fromZip(new File([bytes], 'bad.zip')), pattern);
});

test('complete teach/practice/lab/defense/repair/fresh/delay slice restores evidence without importing authority', async t => {
  wipe(); t.after(wipe);
  let now = 10 * DAY;
  t.mock.method(Date, 'now', () => now);
  const C = course(), verifiedEvaluationIds = new Set();
  const state = () => rebuildActivityState(cid, C, { now, verifiedEvaluationIds });
  const plan = async (exposure = new Set(['s1-1'])) => {
    const s = await state();
    return masteryActionPlan(C, s.projection, s.rows, { now, wave: 1, availableSeconds: 1800,
      exposure, environment: new Set(['python3']), lessonTiming: { 's1-1': [120, 180] } });
  };
  const ready = async id => assert.ok((await plan()).queue.some(a => a.id === id), `${id} is queued`);
  const evaluate = async (sub, outcome = 'pass') => {
    now += 10;
    const result = evaluationFields(C, sub, now, outcome).result;
    const e = C.activityIndex.activities[sub.request.activityId].kind === 'question'
      ? await recordActivityEvent(cid, C, { event: 'activity-evaluation', submissionId: sub.id, result }, { now, sessionId: sub.sessionId })
      : await importSubmissionResult(cid, C, sub.id, result);
    verifiedEvaluationIds.add(e.id); // Test double ONLY; never serialized or installed in the reader.
    return e;
  };
  const question = async (id, text, support = false) => {
    const a = C.activityIndex.activities[id], input = { text }; now += 10;
    return recordActivityEvent(cid, C, { event: 'activity-submission', request: { schemaVersion: 1, adapter: a.adapter,
      courseId: C.code, activityId: id, attemptId: id, nonce: id, contentVersion: 1, evidenceVersion: 1, rubricVersion: 1,
      input, submissionHash: await activityInputHash(input) }, compatibility: await activityEventCompatibility(C, id),
      ...context, assistance: { sources: support ? ['reference'] : [], answerExposed: false } }, { now, sessionId: `question:${id}` });
  };
  const work = async id => {
    now += 10;
    return commitSubmission(cid, C, id, { text: `${id}: code and boundary report`, artifacts: [{ id: 'report',
      url: `https://ledger.invalid/${id}.txt`, sha256: 'a'.repeat(64), bytes: 100, mediaType: 'text/plain' }] }, context);
  };
  const defense = async id => {
    now += 10; const initial = await commitSubmission(cid, C, id, { text: `${id}: rounding must happen per request` }, context);
    now += 10;
    await commitSubmission(cid, C, id, { text: `${id}: zero requests cost zero cents`, followup: {
      submissionHash: initial.request.submissionHash, prompt: 'What if the ledger is empty?', reviewerId: 'test-double' } }, context);
    await evaluate(initial); return initial;
  };
  assert.deepEqual((await plan(new Set())).queue.map(a => a.id), ['teach:s1-1']);
  await exposeLesson(cid, 's1-1'); await setEnvironment(cid, 'python3', true);
  await ready('ordinary'); await evaluate(await question('ordinary', '2', true));
  await ready('lab'); const lab = await work('lab');
  assert.equal(feedbackReady(C, await state(), 'lab'), false);
  await assert.rejects(importSubmissionResult(cid, C, lab.id, evaluationFields(C, lab, now).result), /before feedback/);
  // The real app deliberately exposes defense entry while verified lab review is pending.
  await defense('defense'); assert.equal(feedbackReady(C, await state(), 'lab'), true);
  const e = await evaluate(lab); now += 10; await revealSubmissionFeedback(cid, C, e.id);
  now += 10; await recordActivityEvent(cid, C, { event: 'activity-feedback', evaluationId: e.id, repair: 'explanation' }, { now, sessionId: 'repair-reading' });
  await ready('repair'); await evaluate(await question('repair', '4', true));
  await ready('fresh'); const fresh = await work('fresh'); await defense('fresh-defense'); await evaluate(fresh);
  let p = await plan();
  assert.ok(p.actions.find(a => a.id === 'delayed').reasons.some(r => r.code === 'waiting-for-delay'));
  assert.equal((await state()).projection.complete, false);
  const baseline = now;
  now = baseline + 2 * DAY - 1;
  assert.ok(!(await plan()).queue.some(a => a.id === 'delayed'));
  now = baseline + 2 * DAY;
  await ready('delayed'); const delayed = await work('delayed'); await defense('delayed-defense'); await evaluate(delayed);
  const live = await state(); assert.equal(live.projection.complete, true);
  for (const facet of ['calculate', 'build', 'debug', 'explain']) {
    assert.equal(live.projection.roots.simple.anchors[3].facets[facet].complete, true, facet);
  }
  p = await plan();
  for (const id of ['future-audio', 'future-trusted']) assert.ok(p.actions.find(a => a.id === id).reasons.some(r => r.code === 'adapter-unavailable'));
  assert.ok(p.actions.find(a => a.id === 'future-cloud').reasons.some(r => r.code === 'environment-unavailable'));
  assert.equal(live.artifacts.every(a => a.availability === 'unavailable'), true);
  const backup = toJSON(); assert.doesNotMatch(backup, /verifiedEvaluationIds/);
  wipe(); await fromJSON(backup);
  assert.deepEqual(await state(), live);
  const untrusted = await rebuildActivityState(cid, C, { now });
  assert.equal(untrusted.projection.complete, false);
  assert.equal(untrusted.projection.provisional.simple.complete, true);
  const restored = await loadMasteryPath(cid, C, now);
  assert.ok(restored.plan.actions.some(a => a.reasons.some(r => r.code === 'awaiting-review')));
});

test('packing/import preserve actual public ZIP reference and reject misplaced private assets', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ledger-pack-'));
  try {
    const pkg = ledgerPackage(), files = learningSliceFiles(pkg.sha256);
    write(join(dir, 'courses/slice'), files);
    write(join(dir, 'reviewer'), { 'test_private.py': 'private check', 'solution.txt': 'reviewer solution' });
    const result = spawnSync(process.execPath, ['tools/pack.mjs', 'slice', '--workspace', dir], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const text = readFileSync(join(dir, 'packed/slice.course.json'), 'utf8');
    assert.doesNotMatch(text, /private check|reviewer solution|test_private.py/);
    const imported = await importCourse('s12-pack', JSON.parse(text));
    assert.equal(imported.ok, true, imported.errors?.join('; '));
    assert.equal(imported.course.activityIndex.activities.lab.lab.sha256, pkg.sha256);
    assert.equal(imported.course.activityIndex.activities['future-audio'].availability, 'unavailable');
    const bad = { ...files, 'private/solution.json': '{}' };
    assert.equal((await importCourse('s12-invalid', bad)).ok, false);
    write(join(dir, 'courses/slice'), { 'private/solution.json': '{}' });
    const refused = spawnSync(process.execPath, ['tools/pack.mjs', 'slice', '--workspace', dir], { encoding: 'utf8' });
    assert.equal(refused.status, 1); assert.match(refused.stderr, /outside the course tree/);
  } finally { await removeCourse('s12-pack'); await removeCourse('s12-invalid'); rmSync(dir, { recursive: true, force: true }); }
});

test('future adapter envelopes need no definition rewrite but public labels never grant private authority', async () => {
  const C = course();
  for (const id of ['future-audio', 'future-trusted', 'future-cloud']) {
    const a = C.activityIndex.activities[id];
    const input = { text: 'Future result reference', artifacts: [{ id: 'file', url: 'https://ledger.invalid/clip.ogg',
      mediaType: id === 'future-audio' ? 'audio/ogg' : 'text/plain', bytes: 100, sha256: 'a'.repeat(64) }] };
    const request = { schemaVersion: 1, adapter: a.adapter, courseId: C.code, activityId: id,
      attemptId: id, nonce: id, contentVersion: 1, evidenceVersion: 1, rubricVersion: 1, input, submissionHash: await activityInputHash(input) };
    const errors = []; assert.ok(validateAdapterRequest(request, a, errors), errors.join('; '));
    const result = evaluationFields(C, { request }, 10).result;
    result.provenance.kind = 'public-test';
    assert.equal(validateAdapterResult(result, request, a, errors).trust, 'untrusted');
    assert.equal(validateAdapterResult({ ...result, trust: 'verified' }, request, a, errors), null);
  }
});
