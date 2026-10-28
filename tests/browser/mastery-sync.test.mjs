import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { freshDb, d1 } from '../helpers/d1shim.mjs';
import { onRequestPost } from '../../functions/api/sync.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('encrypted activity staging and cursor survive IndexedDB reload before a fresh device finishes its backup', async () => {
  const db = freshDb(`${root}/tools/schema.sql`);
  let interrupt = false;
  const server = await createServer({ root, configFile: false, appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: ['marked', 'mathjs/number', 'katex'] },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'mastery-sync-test-page', configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/') return res.end('<!doctype html><title>Mastery sync test</title>');
        if (req.url !== '/api/sync') return next();
        try {
          const parts = []; for await (const part of req) parts.push(part);
          const body = Buffer.concat(parts).toString();
          const payload = JSON.parse(body);
          if (interrupt && payload.prefAfter) { res.statusCode = 503; return res.end('{}'); }
          const response = await onRequestPost({ request: new Request('https://test/api/sync', {
            method: 'POST', headers: { authorization: req.headers.authorization }, body
          }), env: { SYNC_SECRET: 'test', DB: d1(db) } });
          res.statusCode = response.status; res.setHeader('content-type', 'application/json');
          res.end(await response.text());
        } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
      });
    } }] });
  let browser;
  try {
    await server.listen(); browser = await chromium.launch();
    const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
    const a = await browser.newPage(); await a.goto(url);
    const source = await a.evaluate(async () => {
      const store = await import('/src/lib/store.js'); await store.init();
      const cloud = await import('/src/lib/cloud.js'); await cloud.configure('test');
      const state = await import('/src/lib/mastery-state.js');
      const fixture = await import('/tests/fixtures/mastery/history.mjs');
      const { setPref } = await import('/src/lib/prefs.js');
      const C = fixture.persistenceCourse();
      const sub = await state.recordActivityEvent('folder', C, await fixture.submissionFields(C, 0), { now: 10, sessionId: 's' });
      await state.recordActivityEvent('folder', C, fixture.evaluationFields(C, sub, 11), { now: 11, sessionId: 's' });
      await state.saveActivityDraft('folder', C, 'task-1', { text: 'Draft from A' }, { now: 20 });
      for (let i = 0; i < 505; i++) setPref(`hue:pad-${i}`, 'x');
      const result = await cloud.sync({ manual: true });
      return { result, state: await state.rebuildActivityState('folder', C, { now: 100 }), device: store.getItem('device:id') };
    });
    assert.equal(source.result.ok, true);
    const context = await browser.newContext();
    const b = await context.newPage(); await b.goto(url);
    interrupt = true;
    const failed = await b.evaluate(async () => {
      const store = await import('/src/lib/store.js'); await store.init();
      const cloud = await import('/src/lib/cloud.js'); await cloud.configure('test');
      const result = await cloud.sync({ manual: true }); await store.flush();
      return { result, rows: store.logRows().length, cursor: store.getItem('cloud:cursor'),
        staged: store.keys().filter(k => k.startsWith('cloud:mastery-stage:')).length };
    });
    assert.equal(failed.result.ok, false); assert.equal(failed.rows, 0);
    assert.ok(Number(failed.cursor) > 0); assert.ok(failed.staged > 0);
    await b.reload(); interrupt = false;
    const restored = await b.evaluate(async () => {
      const store = await import('/src/lib/store.js'); await store.init();
      const cloud = await import('/src/lib/cloud.js');
      const { rebuildMastery } = await import('/src/lib/replay.js');
      const { persistenceCourse } = await import('/tests/fixtures/mastery/history.mjs');
      // No course visit is needed to refresh asynchronous derived state.
      let projection;
      cloud.setSyncCourseLoader(async () => { projection = await rebuildMastery('folder', persistenceCourse(), { now: 100 }); });
      const result = await cloud.sync({ manual: true }); await store.flush();
      return { result, projection, device: store.getItem('device:id'), rows: store.logRows().length,
        staged: store.keys().filter(k => k.startsWith('cloud:mastery-stage:')).length };
    });
    assert.equal(restored.result.ok, true); assert.deepEqual(restored.projection, source.state);
    assert.notEqual(restored.device, source.device); assert.equal(restored.rows, 2); assert.equal(restored.staged, 0);
    assert.equal(restored.projection.projection.complete, false);
    await b.reload();
    const reloaded = await b.evaluate(async () => {
      const store = await import('/src/lib/store.js'); await store.init();
      const { rebuildMastery } = await import('/src/lib/replay.js');
      const { persistenceCourse } = await import('/tests/fixtures/mastery/history.mjs');
      return rebuildMastery('folder', persistenceCourse(), { now: 100 });
    });
    assert.deepEqual(reloaded, source.state);
  } finally { if (browser) await browser.close(); await server.close(); db.close(); }
});
