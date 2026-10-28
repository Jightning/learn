import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('IndexedDB reload and fresh-browser restore preserve activity history, drafts, references and reset', async () => {
  const server = await createServer({ root, configFile: false, appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: ['marked', 'mathjs/number', 'katex'] },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'persistence-test-page', configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/') res.end('<!doctype html><title>Mastery persistence test</title>');
        else next();
      });
    } }] });
  await server.listen();
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
    await page.goto(url);
    const live = await page.evaluate(async () => {
      const store = await import('/src/lib/store.js');
      const state = await import('/src/lib/mastery-state.js');
      const log = await import('/src/lib/log.js');
      const fixture = await import('/tests/fixtures/mastery/history.mjs');
      await store.init();
      const C = fixture.persistenceCourse(), cid = 'folder', now = 10 * 864e5;
      for (const [i, ts] of [[0, 10], [1, 20], [2, 21 + 2 * 864e5]]) {
        const input = { text: `Explanation ${i}`, artifacts: [{ id: 'source', url: 'https://example.invalid/unavailable.txt', sha256: 'a'.repeat(64), bytes: 100, mediaType: 'text/plain' }] };
        const sub = await state.recordActivityEvent(cid, C, await fixture.submissionFields(C, i, input), { now: ts, sessionId: `s-${i}` });
        await state.recordActivityEvent(cid, C, fixture.evaluationFields(C, sub, ts + 1), { now: ts + 1, sessionId: `s-${i}` });
      }
      await state.saveActivityDraft(cid, C, 'task-3', { text: 'Unfinished defense' }, { now: 100 });
      const projection = await state.rebuildActivityState(cid, C, { now });
      await store.flush();
      return { projection, backup: log.toJSON(), device: store.getItem('device:id') };
    });
    assert.equal(live.projection.projection.provisional.simple.anchor, 3);
    assert.equal(live.projection.projection.complete, false);
    await page.reload();
    const restarted = await page.evaluate(async () => {
      const store = await import('/src/lib/store.js'); await store.init();
      const { persistenceCourse } = await import('/tests/fixtures/mastery/history.mjs');
      const { rebuildActivityState } = await import('/src/lib/mastery-state.js');
      return rebuildActivityState('folder', persistenceCourse(), { now: 10 * 864e5 });
    });
    assert.deepEqual(restarted, live.projection);
    const fresh = await browser.newContext();
    try {
      const restored = await fresh.newPage(); await restored.goto(url);
      const result = await restored.evaluate(async backup => {
        const store = await import('/src/lib/store.js'); await store.init();
        const { persistenceCourse } = await import('/tests/fixtures/mastery/history.mjs');
        const { rebuildActivityState } = await import('/src/lib/mastery-state.js');
        const { toJSON, fromJSON } = await import('/src/lib/log.js');
        await fromJSON(backup);
        const projection = await rebuildActivityState('folder', persistenceCourse(), { now: 10 * 864e5 });
        const device = store.getItem('device:id');
        store.setItem('reset:folder', String(5 * 864e5));
        await fromJSON(backup); await store.flush();
        return { projection, device, backup: toJSON() };
      }, live.backup);
      assert.deepEqual(result.projection, live.projection);
      assert.equal(result.device, null);
      assert.ok(result.projection.artifacts.every(a => a.availability === 'unavailable' && a.bytesRestored === false));
      await restored.reload();
      const reset = await restored.evaluate(async () => {
        const store = await import('/src/lib/store.js'); await store.init();
        const { persistenceCourse } = await import('/tests/fixtures/mastery/history.mjs');
        const { rebuildActivityState } = await import('/src/lib/mastery-state.js');
        return rebuildActivityState('folder', persistenceCourse(), { now: 10 * 864e5 });
      });
      assert.equal(reset.projection.provisional.simple.anchor, null);
      assert.deepEqual(reset.drafts, []); assert.deepEqual(reset.artifacts, []);
    } finally { await fresh.close(); }
  } finally { if (browser) await browser.close(); await server.close(); }
});
