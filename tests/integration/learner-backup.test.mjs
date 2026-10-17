import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, d1 } from '../helpers/d1shim.mjs';
import { onRequestPost } from '../../functions/api/sync.js';
import { sync, configure } from '../../src/lib/cloud.js';
import { getItem, setItem, removeItem, keys, clearLog, appendRow } from '../../src/lib/store.js';
import { setPref, mine } from '../../src/lib/prefs.js';
import { stateFor, forget } from '../../src/lib/state.js';
import { rebuild } from '../../src/lib/replay.js';

test('encrypted backup restores every learner family, answer format and active practice run', async () => {
  const db = freshDb(new URL('../../tools/schema.sql', import.meta.url).pathname);
  Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
  globalThis.dispatchEvent = () => {};
  globalThis.CustomEvent = class { constructor(type, options) { Object.assign(this, options); } };
  globalThis.fetch = (path, options) => onRequestPost({request:new Request(`https://test${path}`,options),env:{SYNC_SECRET:'test',DB:d1(db)}});
  await configure('test'); setItem('device:id','first');
  const cid = 'backup', course = {code:'BACKUP',state:{}};
  const state = stateFor(cid,course);
  const answers = [0,[1,2],'4','x^2','my written explanation'];
  for (const [i,value] of answers.entries()) await state.saveAttempt(`q:${i}`, {
    signature:'sig',value,started:1,progress:{used:1,rejected:[0],wrongAnswers:['3']},
    feedback:i === 0 ? {correct:true,recorded:true} : {correct:false}
  });
  state.savePolicy({practiceSelector:'weighted',actions:3});
  await state.saveSession({sessionId:'run',items:[{id:'q:0'}],at:1,results:[{correct:true}]});
  appendRow({id:'first:complete',ts:2,course:cid,itemId:'q:0',loop:'Q',correct:true});
  const settings = {
    'note:backup:s1-1#0@attempt':'unfinished pre-question answer',
    'note:backup:s1-1#0':'["my note",""]','nfold:backup':'["s1-1#0"]',
    'why:backup:q:0':'[{"text":"my reasoning"}]','depth:backup':'notes','lane:backup':'all',
    'place:v1':'{"hash":"#/backup/s1-1","id":"s1-1","into":120,"ts":1}',
    'contentZoom':'1.25','tuckSidebar':'1','speech:rate':'1.2','speech:voice':'voice-id','speech:quiz':'ask',
    'quiz:backup:s1-1':'2',
    'learnby:test':'{"id":"test","cid":"backup"}'
  };
  for (const [k,v] of Object.entries(settings)) setPref(k,v);
  assert.equal((await sync({manual:true})).ok,true);
  const encrypted = db.prepare('SELECT enc FROM prefs').all();
  assert.ok(encrypted.every(p => !p.enc.includes('my written explanation')));
  // Wipe all local learner state and credentials, as a fresh installation does.
  for (const key of keys()) removeItem(key);
  clearLog(); forget();
  await configure('test'); setItem('device:id','second');
  const result = await sync({manual:true});
  assert.equal(result.ok,true);
  rebuild(cid,course);
  const restored = stateFor(cid,course);
  for (const [i,value] of answers.entries()) assert.deepEqual(restored.getAttempt(`q:${i}`,'sig').value,value);
  assert.equal(restored.getAttempt('q:1','sig').progress.used,1);
  assert.equal(restored.getAttempt('q:0','sig').feedback.recorded,true);
  assert.equal(restored.get('q:0').got,1);
  assert.equal(restored.getPolicy().practiceSelector,'weighted');
  assert.equal(restored.getSession().sessionId,'run');
  for (const [k,v] of Object.entries(settings)) assert.equal(getItem(k),v,k);
  assert.equal(getItem('device:id'),'second');
  assert.ok(!mine().some(p => p.k === 'cloud:secret'));
  db.close();
});
