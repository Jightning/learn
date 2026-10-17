import test from 'node:test';
import assert from 'node:assert/strict';
import { getItem, setItem, keys, removeItem, appendRow } from '../../src/lib/store.js';
import { mine, apply, setPref, dropPref, isPref } from '../../src/lib/prefs.js';
import { learnerKey, migrateLearnerPrefs } from '../../src/lib/learner-prefs.js';
import { stateFor, forget, keyFor } from '../../src/lib/state.js';
import { rebuild } from '../../src/lib/replay.js';
import { forCourse } from '../../src/lib/log.js';
import { writeNote, setFolded, isFolded, writeTryFirst, readTryFirst } from '../../src/lib/notes.js';
import { pushWhy } from '../../src/lib/why.js';
import { setDepth } from '../../src/lib/depth.js';
import { setLane } from '../../src/lib/tiers.js';

test('every saved learner family travels; internal state stays local', () => {
  writeNote('sync', 's1-1#0@attempt', 'my draft');
  setFolded('sync', 's1-1#0', true);
  pushWhy('sync', 'question:1', {text:'my reason'});
  setDepth('sync', 'notes'); setLane('sync', 'all');
  for (const k of ['place:v1','contentZoom','tuckSidebar','speech:rate','speech:voice','speech:quiz']) setPref(k, 'saved');
  const offered = mine();
  for (const k of ['note:sync:s1-1#0@attempt','nfold:sync','why:sync:question:1','depth:sync','lane:sync',
    'place:v1','contentZoom','tuckSidebar','speech:rate','speech:voice','speech:quiz']) {
    assert.ok(offered.some(p => p.k === k && p.ts > 1), k);
  }
  for (const k of ['device:id','cloud:secret','cloud:cursor','pref:stamps','ckpt:sync','retain:v1','study:sync']) assert.equal(isPref(k), false, k);
  setFolded('sync', 's1-1#0', false);
  assert.equal(isFolded('sync','s1-1#0'), false);
  assert.equal(mine().find(p => p.k === 'nfold:sync').v, null);
});

test('legacy answers migrate without opening a course; per-question merges and deletions survive replay', () => {
  const cid = 'legacy-sync', course = {code:'LEGACY SYNC', state:{}};
  const key = keyFor(cid, course.code);
  const answer = {signature:'sig', value:'original', started:10, progress:{used:1,rejected:[0]}, feedback:{correct:false}};
  setItem(key, JSON.stringify({q:{q1:{last:10,got:1,reps:1}}, answers:{q1:answer,q2:{...answer,value:[1,2]}},
    policy:{actions:4}, session:{items:[{id:'q1'}],at:1}}));
  migrateLearnerPrefs();
  const snapshot = mine().filter(p => p.k.startsWith('learner:'));
  assert.equal(snapshot.find(p => p.k === learnerKey(key,'answer','q1')).ts, 1);
  // A genuinely empty device receives the backup.
  for (const k of keys()) removeItem(k);
  forget(); apply(snapshot); rebuild(cid, course);
  let state = stateFor(cid, course);
  assert.deepEqual(state.getAttempt('q1','sig'), answer);
  assert.deepEqual(state.getAttempt('q2','sig').value, [1,2]);
  assert.equal(state.get('q1').reps, 1);
  assert.equal(state.getPolicy().actions, 4);
  assert.equal(state.getSession().at, 1);
  state.saveAttempt('q2', {...answer,value:'edited here'});
  apply([{k:learnerKey(key,'answer','q1'),ts:Date.now()+100,v:JSON.stringify({...answer,value:'edited there'})}]);
  assert.equal(state.getAttempt('q1','sig').value,'edited there');
  assert.equal(state.getAttempt('q2','sig').value,'edited here');
  dropPref(learnerKey(key,'answer','q1'));
  rebuild(cid, course); migrateLearnerPrefs(); forget();
  assert.equal(stateFor(cid,course).getAttempt('q1','sig'),null);
  assert.equal(getItem(learnerKey(key,'answer','q1')),null);
});

test('a synced reset excludes old events, answers and sessions after replay', () => {
  const cid = 'reset-sync', course = {code:'RESET SYNC',state:{}};
  const state = stateFor(cid, course);
  appendRow({id:'test:old',course:cid,ts:10,loop:'Q',itemId:'q',correct:true});
  state.saveAttempt('q',{signature:'sig',value:'old',started:10});
  state.saveSession({at:3});
  setPref(`reset:${cid}`,String(Date.now()+1000));
  rebuild(cid,course); forget();
  assert.equal(forCourse(cid,course).length,0);
  assert.equal(stateFor(cid,course).getAttempt('q','sig'),null);
  assert.equal(stateFor(cid,course).getSession(),null);
  assert.equal(stateFor(cid,course).get('q'),undefined);
  setPref(`quiz:${cid}:s1-1`,'2');
  stateFor(cid,course).reset();
  assert.equal(getItem(`quiz:${cid}:s1-1`),null);
});

test('same-clock edits converge on the account value and local clocks advance', () => {
  setPref('hue:tie', '10');
  const first = mine().find(p => p.k === 'hue:tie');
  apply([{...first, v:'20'}]);
  assert.equal(getItem('hue:tie'),'20');
  assert.equal(apply([{...first,v:'20'}]),0);
  setPref('hue:tie','30');
  assert.ok(mine().find(p => p.k === 'hue:tie').ts > first.ts);
});

test('try-first drafts restore without becoming submitted; legacy submissions still open', () => {
  const anchor = 's1-1#0@attempt';
  writeTryFirst('draft-sync',anchor,'unfinished',false);
  const snapshot = mine().find(p => p.k === `note:draft-sync:${anchor}`);
  removeItem(snapshot.k); removeItem('pref:stamps');
  apply([snapshot]);
  assert.equal(readTryFirst('draft-sync',anchor).text,'unfinished');
  assert.equal(readTryFirst('draft-sync',anchor).submitted,false);
  writeTryFirst('draft-sync',anchor,'finished',true);
  assert.equal(readTryFirst('draft-sync',anchor).submitted,true);
  writeNote('draft-sync','s1-2#0@attempt','old answer');
  assert.deepEqual(readTryFirst('draft-sync','s1-2#0@attempt'),{text:'old answer',submitted:true});
});
