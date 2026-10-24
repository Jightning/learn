import test from 'node:test';
import assert from 'node:assert/strict';
import {fold} from '../../src/lib/replay.js';
import {retentionEligible} from '../../src/lib/evidence.js';
import {step,phase,label} from '../../src/lib/retention.js';
const DAY=864e5;
const event=(n,extra={})=>({id:`e${n}`,attemptId:`a${n}`,event:'attempt',loop:'Q',itemId:`q${n}`,typeId:'s',skills:['s'],
 sessionId:`session${n}`,ts:n*DAY,firstUnaided:true,correct:true,gradeSource:'deterministic-checker',...extra});
test('canonical schedule replay shares grade, assistance, timeout and session eligibility',()=>{
 const rows=[event(1),event(2,{sessionId:'session1'}),event(3,{gradeSource:'self',selfChecked:true}),
 event(4,{methodCued:true}),event(5,{timedOut:true,firstUnaided:null,correct:null}),event(6,{firstUnaided:false,correct:true})];
 const replay=fold(rows,{target:.9});
 assert.equal(replay.retain['type:s'].reps,3);
 assert.equal(replay.retain['type:s'].ok,false);
 assert.equal(replay.retain['type:s'].selfReportedReps,1);
 assert.equal(replay.retain['type:s'].checkedReps,2);
 assert.equal(retentionEligible(rows[2]),false);
 assert.equal(retentionEligible(rows[0],{priorSession:true}),false);
 assert.equal(replay.study.q5,undefined);
});
test('replay excludes quarantined and substantively changed canonical answers',()=>{
 const rows=[event(1,{schemaVersion:2,contentVersion:'old',evidenceVersion:'e'}),event(2,{schemaVersion:2,contentVersion:'c',evidenceVersion:'e'})];
 const bank={q1:{contentVersion:'new',evidenceVersion:'e'},q2:{contentVersion:'c',evidenceVersion:'e',quarantined:true}};
 assert.deepEqual(fold(rows,{target:.9,bank}).retain,{});
});
test('retained phase requires elapsed retrieval spacing and a lapse resets present relearning',()=>{
 let state=step(null,{itemId:'a',correct:true,criterion:1,now:DAY});
 state=step(state,{itemId:'a',correct:true,criterion:1,now:DAY+100});
 assert.deepEqual(state.relearnDays,[],'another success on the same date is not a delayed observation');
 for(const d of [2,3,4])state=step(state,{itemId:'a',correct:true,criterion:1,now:d*DAY+100});
 assert.equal(phase(state),'durable');
 state=step(state,{itemId:'a',correct:false,criterion:1,now:5*DAY+100});
 assert.deepEqual(state.relearnDays,[]);
 assert.equal(phase(state),'criterion');
 assert.deepEqual(state.items,['a'],'historical successful inventory survives a lapse');
});

test('self-reported scheduling remains useful but explicitly labeled',()=>{
 const state=step(null,{itemId:'self',correct:true,gradeSource:'self',now:DAY});
 assert.equal(state.selfReportedReps,1);assert.equal(state.checkedReps,0);
 assert.match(label(state),/^Self-reported review:/);
});
