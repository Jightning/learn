import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, d1 } from '../helpers/d1shim.mjs';
import { onRequestPost } from '../../functions/api/sync.js';
import { sync, configure, setSyncCourseLoader, lastSync } from '../../src/lib/cloud.js';
import { getItem, setItem, removeItem, keys, clearLog, logRows, appendRow } from '../../src/lib/store.js';
import { setPref, mine, apply } from '../../src/lib/prefs.js';
import { stateFor, forget } from '../../src/lib/state.js';
import { learnerKey } from '../../src/lib/learner-prefs.js';
import { rebuild } from '../../src/lib/replay.js';
import { deriveKey, seal } from '../../src/lib/seal.js';

const cid = 'ece27000', course = {code:'ECE27000',state:{}};
let db, calls;
function wipe() { for (const k of keys()) removeItem(k); clearLog(); forget(); }
function snapshot() { return {kv:keys().map(k => [k,getItem(k)]), rows:structuredClone(logRows())}; }
function load(s) { wipe(); for (const [k,v] of s.kv) setItem(k,v); for (const r of s.rows) appendRow(r); }
async function request(payload, counter = {n:0,limit:50}) {
  return onRequestPost({request:new Request('https://test/api/sync', {
    method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({protocol:2,device:'a',...payload})
  }),env:{SYNC_SECRET:'test',DB:d1(db,counter)}});
}
beforeEach(async () => {
  wipe(); db = freshDb(new URL('../../tools/schema.sql',import.meta.url).pathname); calls=[];
  Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
  globalThis.dispatchEvent=()=>{}; globalThis.CustomEvent=class {constructor(type, options) {this.type=type;Object.assign(this,options);}};
  globalThis.fetch=async (_path,options) => {const p=JSON.parse(options.body);calls.push(p);return request(p);};
  await configure('test');setItem('device:id','a');
  setSyncCourseLoader(async () => { rebuild(cid,course); });
});
afterEach(() => {db.close();setSyncCourseLoader(async()=>{});wipe();});

test('two devices merge different questions, newest edit wins in either upload order, and the unopened shelf refreshes',async () => {
  const answer=(value)=>({signature:'sig',value,started:Date.now(),progress:{used:1},feedback:{correct:true}});
  await stateFor(cid,course).saveAttempt('q1',answer('A'));
  appendRow({id:'a:1',ts:Date.now(),course:cid,loop:'Q',itemId:'q1',correct:true});
  const a=snapshot();
  wipe();await configure('test');setItem('device:id','b');
  await stateFor(cid,course).saveAttempt('q2',answer('B'));
  const b=snapshot();
  load(a);assert.equal((await sync({manual:true})).ok,true);const uploadedA=snapshot();
  load(b);assert.equal((await sync({manual:true})).ok,true);
  assert.equal(stateFor(cid,course).summary(2).seen,1,'progress updated without opening a lesson');
  assert.equal(stateFor(cid,course).getAttempt('q1','sig').value,'A');
  await stateFor(cid,course).saveAttempt('q1',answer('later B'));
  assert.equal((await sync({manual:true})).ok,true);
  load(uploadedA);assert.equal((await sync({manual:true})).ok,true);
  assert.equal(stateFor(cid,course).getAttempt('q1','sig').value,'later B');
  assert.equal(stateFor(cid,course).getAttempt('q2','sig').value,'B');
  assert.equal(logRows().length,1,'answer history is retained');
  const stamp=Date.now();
  for (const values of [[['z','winner'],['a','loser']],[['a','loser'],['z','winner']]]) {
    db.prepare('DELETE FROM prefs WHERE k=?').run('hue:tie');
    for (const [rev,enc] of values) assert.equal((await request({prefs:[{k:'hue:tie',ts:stamp,rev,enc}]})).status,200);
    assert.equal(db.prepare('SELECT enc FROM prefs WHERE k=?').get('hue:tie').enc,'winner');
  }
});

test('unreadable legacy rows and altered envelope metadata fail without advancing the download cursor',async () => {
  db.prepare('INSERT INTO log(id,device,ts,enc) VALUES(?,?,?,?)').run('b:1','b',1,'corrupt');
  const result=await sync({manual:true});
  assert.equal(result.ok,false);assert.equal(Number(getItem('cloud:cursor'))||0,0);assert.equal(lastSync(),0);
  const key=await deriveKey('test');
  db.prepare('UPDATE log SET enc=?').run(await seal(key,{id:'b:1',ts:1,course:cid,loop:'Q',itemId:'q',correct:true}));
  assert.equal((await sync({manual:true})).ok,true);assert.equal(logRows().length,1);
  setPref('hue:test','10');assert.equal((await sync({manual:true})).ok,true);
  db.prepare('UPDATE prefs SET ts=ts+1 WHERE k=?').run('hue:test');
  assert.equal((await sync({manual:true})).ok,false,'authenticated metadata tampering is detected');
});

test('manual clicks report offline and queue a fresh pass behind an in-flight backup',async () => {
  navigator.onLine=false;
  const offline=await sync({manual:true});assert.equal(offline.ok,false);assert.match(offline.error,/offline/);
  navigator.onLine=true;
  let release;const blocked=new Promise(resolve=>{release=resolve;});const fetch=globalThis.fetch;
  let entered;const started=new Promise(resolve=>{entered=resolve;});let first=true;
  globalThis.fetch=async(...args)=>{if(first){first=false;entered();await blocked;}return fetch(...args);};
  const one=sync({manual:true});await started;
  setPref('hue:queued','20');const two=sync({manual:true});release();
  assert.equal((await one).ok,true);assert.equal((await two).ok,true);
  assert.ok(db.prepare('SELECT k FROM prefs WHERE k=?').get('hue:queued'));
});

test('whole-request validation, acknowledgments, clock checks and query budgets prevent false success',async () => {
  for (const invalid of [null, {rows:[{id:'other:1',ts:1,enc:'x'}]}, {prefs:[{k:'bad/key',ts:1,enc:'x'}]},
    {rows:'not an array'}, {prefs:[{k:'hue:bad',ts:Infinity,enc:'x'}]}]) {
    const counter={n:0};
    const response=await request(invalid===null ? {prefs:[null]} : invalid,counter);
    assert.equal(response.status,400);assert.equal(counter.n,0);
  }
  assert.equal((await request({prefs:[{k:'hue:future',ts:Date.now()+3600000,enc:'x'}]})).status,409);
  assert.equal((await request({protocol:1})).status,426);
  const counter={n:0,limit:50};
  const rows=Array.from({length:2000},(_,i)=>({id:`a:${i}`,ts:i+1,enc:'x'}));
  const prefs=Array.from({length:2000},(_,i)=>({k:`hue:${i}`,ts:1,enc:'x'}));
  const response=await request({rows,prefs},counter);assert.equal(response.status,200);
  assert.ok(counter.n<10);const body=await response.json();assert.equal(body.accepted.rows.length,2000);
  assert.equal(body.accepted.prefs.length,2000);assert.ok(body.prefs.length<=500);
  appendRow({id:'a:local',ts:3,course:cid});
  globalThis.fetch=async()=>new Response(JSON.stringify({protocol:2,accepted:{rows:[],prefs:[]}}));
  assert.equal((await sync({manual:true})).ok,false);
  assert.equal(logRows().find(r=>r.id==='a:local').sent,undefined);
});

test('unchanged preferences are not uploaded again; failed uploads remain pending',async () => {
  setPref('hue:test','10');assert.equal((await sync({manual:true})).ok,true);
  calls=[];assert.equal((await sync({manual:true})).ok,true);assert.ok(calls.every(p=>p.prefs.length===0));
  setPref('hue:test','20');const fetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response('{}',{status:503});assert.equal((await sync({manual:true})).ok,false);
  globalThis.fetch=fetch;calls=[];assert.equal((await sync({manual:true})).ok,true);
  assert.ok(calls.some(p=>p.prefs.some(v=>v.k==='hue:test')));
});

test('received aliases and tombstones migrate without fresh timestamps; changed-question answers remain recoverable',async () => {
  const C={...course,legacyQuestionAliases:{old:'current'}};
  apply([{k:learnerKey('study:ECE27000','answer','old'),ts:10,rev:'b:old',
    v:JSON.stringify({signature:'old-sig',value:'old answer',started:5})}]);
  rebuild(cid,C);let state=stateFor(cid,C);
  assert.equal(state.getAttempt('current','old-sig').value,'old answer');
  assert.equal(state.getAttempt('current','new-sig'),null);
  assert.equal(state.getAnswerHistory('current','new-sig')[0].value,'old answer');
  await state.saveAttempt('current',{signature:'new-sig',value:'new answer',started:Date.now()});
  assert.equal(state.getAnswerHistory('current','new-sig')[0].value,'old answer');
  assert.equal((await sync({manual:true})).ok,true);
  wipe();await configure('test');setItem('device:id','b');
  assert.equal((await sync({manual:true})).ok,true);
  assert.equal(stateFor(cid,course).getAnswerHistory('current','new-sig')[0].value,'old answer');
  stateFor(cid,course).reset();assert.equal(stateFor(cid,course).getAnswerHistory('current','new-sig').length,0);
  apply([{k:learnerKey('study:ECE27000','answer','old'),ts:Date.now()+1,v:null}]);rebuild(cid,C);
  assert.equal(stateFor(cid,C).getAttempt('current','old-sig'),null);
});

test('download pages bound bytes and cannot silently skip an oversized legacy record',async () => {
  const prefs=Array.from({length:20},(_,i)=>({k:`hue:${String(i).padStart(2,'0')}`,ts:1,enc:'x'.repeat(100000)}));
  let response=await request({prefs});assert.equal(response.status,200);
  let body=await response.json();const received=[...body.prefs];
  assert.ok(body.prefs.length<20);assert.ok(Buffer.byteLength(JSON.stringify(body))<1200000);
  while(body.prefsMore){body=await (await request({prefAfter:body.prefAfter})).json();received.push(...body.prefs);}
  assert.equal(received.length,20);assert.equal(new Set(received.map(p=>p.k)).size,20);
  db.prepare('INSERT INTO log(id,device,ts,enc) VALUES(?,?,?,?)').run('b:oversized','b',1,'x'.repeat(1100000));
  assert.equal((await request({})).status,413);
});

test('additive revision migration preserves legacy encrypted data',async () => {
  const {readFileSync}=await import('node:fs');
  db.exec('DROP TABLE prefs; CREATE TABLE prefs(k TEXT PRIMARY KEY, ts INTEGER NOT NULL, enc TEXT NOT NULL)');
  const enc=await seal(await deriveKey('test'),'legacy value');
  db.prepare('INSERT INTO prefs VALUES(?,?,?)').run('hue:migrated',1,enc);
  db.exec(readFileSync(new URL('../../tools/migrations/0002-sync-revisions.sql',import.meta.url),'utf8'));
  assert.equal((await sync({manual:true})).ok,true);
  assert.equal(getItem('hue:migrated'),'legacy value');
  assert.equal(db.prepare('SELECT enc FROM prefs').get().enc,enc);
});

test('clock correction recovers a rejected local future stamp, and equal-time tombstones win by revision',()=>{
  const original=Date.now;
  try {
    Date.now=()=>original()+3600000;setPref('hue:clock','future');
    Date.now=original;setPref('hue:clock','corrected');
    assert.ok(mine().find(p=>p.k==='hue:clock').ts<=original()+100);
    apply([{k:'hue:clock',ts:original()+1,rev:'z',v:null}]);
    assert.equal(getItem('hue:clock'),null);
  } finally {Date.now=original;}
});

test('a new changed-question answer after a reset still has readable history',async () => {
  stateFor(cid,course).reset();forget();
  const resetAt=Number(getItem(`reset:${cid}`));
  const state=stateFor(cid,course);
  await state.saveAttempt('q',{signature:'first',value:'post-reset answer',started:resetAt+1});
  assert.equal(state.getAnswerHistory('q','second')[0].value,'post-reset answer');
  await state.saveAttempt('q',{signature:'second',value:'new version',started:resetAt+2});
  assert.equal(state.getAnswerHistory('q','second')[0].value,'post-reset answer');
});

test('a stalled response body times out after headers arrive',async () => {
  const timer=globalThis.setTimeout;
  globalThis.setTimeout=(fn)=>timer(fn,1);
  globalThis.fetch=async(_path,options)=>new Response(new ReadableStream({start(controller){
    options.signal.addEventListener('abort',()=>controller.error(new Error('aborted response')));
  }}));
  try {
    const result=await sync({manual:true});assert.equal(result.ok,false);assert.equal(result.error,'request timed out');assert.equal(lastSync(),0);
  } finally {globalThis.setTimeout=timer;}
});

test('receiving a different question version preserves the displaced local answer',async () => {
  const k=learnerKey('study:ECE27000','answer','q');
  apply([{k,ts:100,rev:'a:old',v:JSON.stringify({signature:'old',value:'local previous answer',started:1})}]);
  const a=snapshot();wipe();await configure('test');setItem('device:id','b');
  apply([{k,ts:200,rev:'b:new',v:JSON.stringify({signature:'new',value:'remote new answer',started:2})}]);
  assert.equal((await sync({manual:true})).ok,true);
  load(a);assert.equal((await sync({manual:true})).ok,true);
  const state=stateFor(cid,course);
  assert.equal(state.getAttempt('q','new').value,'remote new answer');
  assert.equal(state.getAnswerHistory('q','new')[0].value,'local previous answer');
});
