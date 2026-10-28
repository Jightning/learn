import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMasteryPath, pathSettings, savePathSettings, exposeLesson, availableEnvironment, setEnvironment, reasonText, actionHref } from '../../src/lib/mastery-path.js';
import { persistenceCourse } from '../fixtures/mastery/history.mjs';
import { setItem } from '../../src/lib/store.js';
import { mine } from '../../src/lib/prefs.js';

test('path preferences use independent synced keys and reset cannot resurrect exposure or environment', async () => {
  const cid = 'path-test', C = persistenceCourse(f => {
    f.activities.activities.forEach(a => { a.environment = { capabilities: ['python3'] }; a.timing = { active: [30,60], setup: [10,20], feedback: [10,20] }; });
  });
  assert.deepEqual(pathSettings(cid), { wave: 1, minutes: 30, placement: false });
  await savePathSettings(cid, { wave: 1, minutes: 60, placement: true });
  await exposeLesson(cid, 's1-1'); await setEnvironment(cid, 'python3', true);
  assert.equal(availableEnvironment(cid, C).has('python3'), true);
  const data = await loadMasteryPath(cid, C);
  assert.equal(data.settings.minutes, 60);
  assert.equal(data.state.projection.complete, false);
  assert.equal(data.plan.actions.some(a => a.reasons.some(r => r.code === 'teaching-exposure')), false);
  const prefs = mine().filter(p => p.k.includes('path-test'));
  assert.equal(prefs.length, 3); assert.ok(prefs.every(p => p.ts > 0));
  setItem(`reset:${cid}`, String(Date.now() + 1));
  assert.equal(availableEnvironment(cid, C).size, 0);
  assert.equal(pathSettings(cid).minutes, 30);
  const reset = await loadMasteryPath(cid, C, Date.now() + 2);
  assert.ok(reset.plan.actions.some(a => a.reasons.some(r => r.code === 'teaching-exposure')));
});
test('legacy opt-out, stable action links and explicit waiting states', async () => {
  assert.equal(await loadMasteryPath('legacy', {}), null);
  assert.equal(actionHref('course', { id: 'teach:s1-1' }), '#/course/activity/teach%3As1-1');
  assert.match(reasonText({ code: 'waiting-for-delay', readyAt: 1000 }), /Waiting until/);
  assert.equal(reasonText({ code: 'unknown-duration' }), 'Duration unknown');
  assert.equal(reasonText({ code: 'awaiting-review' }), 'Awaiting verified review');
});
