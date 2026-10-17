import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, d1 } from '../helpers/d1shim.mjs';
import { onRequestPost } from '../../functions/api/sync.js';
import { sync, configure } from '../../src/lib/cloud.js';
import { appendRow, logRows, clearLog, setItem, removeItem } from '../../src/lib/store.js';
import { setPref, dropPref } from '../../src/lib/prefs.js';
import { fromJSON } from '../../src/lib/log.js';

test('a backlog uploads every record, retries a failed batch, and restores on a fresh device', async () => {
  const db = freshDb(new URL('../../tools/schema.sql', import.meta.url).pathname);
  Object.defineProperty(globalThis, 'navigator', {value:{onLine:true}, configurable:true});
  globalThis.dispatchEvent = () => {};
  globalThis.CustomEvent = class { constructor(type, options) { this.type = type; Object.assign(this, options); } };
  const secret = 'backlog-test';
  const derive = crypto.subtle.deriveKey.bind(crypto.subtle);
  let derivations = 0;
  crypto.subtle.deriveKey = (...args) => { derivations++; return derive(...args); };
  await configure(secret);
  setItem('device:id', 'laptop');
  for (let i = 0; i < 2001; i++) {
    appendRow({id:`laptop:${i}`, ts:i+1, course:'demo', itemId:`q${i}`, correct:true});
    setPref(`hue:course${i}`, String(i));
  }
  let calls = 0, failSecond = true;
  globalThis.fetch = async (path, options) => {
    calls++;
    if (failSecond && calls === 2) return new Response('{}', {status:503});
    return onRequestPost({request:new Request(`https://test${path}`, options), env:{SYNC_SECRET:secret, DB:d1(db)}});
  };
  assert.equal((await sync({manual:true})).ok, false);
  assert.equal(logRows().filter(r => r.sent).length, 2000);
  assert.equal(logRows().filter(r => !r.sent).length, 1);
  failSecond = false;
  assert.equal((await sync({manual:true})).ok, true);
  assert.equal(db.prepare('SELECT count(*) AS n FROM log').get().n, 2001);
  assert.equal(db.prepare('SELECT count(*) AS n FROM prefs').get().n, 2001);
  fromJSON(JSON.stringify([{id:'old-device:imported',ts:3000,course:'demo',correct:false,sent:1}]));
  assert.equal((await sync({manual:true})).ok,true);
  assert.equal(db.prepare('SELECT count(*) AS n FROM log').get().n,2002);
  clearLog(); removeItem('cloud:cursor'); setItem('device:id', 'phone');
  const restored = await sync({manual:true});
  assert.equal(restored.ok, true);
  assert.equal(restored.merged, 2002);
  assert.equal(logRows().length, 2002);
  assert.equal(new Set(logRows().map(r => r.id)).size, 2002);
  assert.ok(logRows().some(r => r.id === 'old-device:imported' && r.sent));
  assert.equal(derivations,1,'a whole course and retries share one password derivation');
  crypto.subtle.deriveKey = derive;
  for (let i = 0; i < 2001; i++) dropPref(`hue:course${i}`);
  db.close();
});
