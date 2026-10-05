import test from 'node:test';
import assert from 'node:assert/strict';
import { observations, recentPerformance, fluencyTrend } from '../../src/lib/evidence.js';
import { selectAdaptive, adaptiveEnabled, duePracticeTypes } from '../../src/lib/practice-policy.js';
import { activeClock } from '../../src/lib/attempt.js';
import { readiness, checkCandidates } from '../../src/lib/assessment.js';
import { fold } from '../../src/lib/replay.js';
const event = (n, extra={}) => ({id:`e${n}`,ts:n,typeId:'t',itemId:`q${n}`,contentVersion:'v',event:'attempt',loop:'Q',
  sessionId:`s${n}`,group:`g${n}`,firstUnaided:true,correct:true,format:'number',...extra});
test('feedback exposure preserves its own first answer; preanswer hints and exact repeats do not',()=>{
  const rows=[event(1),{id:'ex',event:'exposure',ts:0,itemId:'q1',beforeSubmission:false}, event(2,{itemId:'q1'}),
    {id:'hint',event:'exposure',ts:2,itemId:'q3',beforeSubmission:true},event(3)];
  assert.deepEqual(observations(rows,'t').map(r=>r.id),['e1']);
  assert.equal(recentPerformance([event(1,{firstUnaided:false}),event(2,{sessionId:'s1',group:'g1'})],'t').fraction,0);
});
test('recent window recovers and mismatched content has no eligible evidence',()=>{
  const rows=Array.from({length:30},(_,i)=>event(i,{firstUnaided:i>=22}));
  assert.equal(recentPerformance(rows,'t').fraction,1);
  assert.equal(recentPerformance(rows,'t',{q29:'edited'}).fraction,null);
});
test('skip is not failure and legacy final-only results remain unknown',()=>{
  assert.equal(recentPerformance([event(1,{skipped:true}),event(2,{firstUnaided:null})],'t').fraction,null);
});
test('type schedule advances once per session with first answer, never final retry or ancestors',()=>{
  const result=fold([event(1,{firstUnaided:false,correct:true}), event(2,{sessionId:'s1',demonstrates:['ancestor']}),event(1,{firstUnaided:false,correct:true})],{target:.9});
  assert.equal(result.retain['type:t'].reps,1); assert.equal(result.retain['type:t'].ok,false);
  assert.equal(result.retain.ancestor,undefined); assert.equal(result.study.q1.got,1);
});
test('coverage rotates unresolved outcomes across saved state and has no prerequisite gate',()=>{
  const pool=[{id:'a',typeId:'advanced',use:'practice'},{id:'b',typeId:'base',use:'practice'}];
  const blueprint={outcomes:{oa:{types:['advanced']},ob:{types:['base']}}};
  const a=selectAdaptive(pool,[],{actions:0},new Set(),[],blueprint);
  const b=selectAdaptive(pool,[],{...a.policy,actions:3},new Set(),[],blueprint);
  assert.notEqual(a.item.typeId,b.item.typeId); assert.equal(a.policy.actions,0);
  assert.equal(adaptiveEnabled({practicePolicy:{mode:'adaptive-experimental'}}),false);
  assert.equal(selectAdaptive(pool,[],{},new Set(['a','b'])).item,null);
});
test('foreground clock excludes hidden time, flags uncertainty, and stops at first answer',()=>{
  const c=activeClock(0); c.update(false,100);c.update(true,10000);
  assert.equal(c.stop(10100).activeMs,200); assert.equal(c.stop(20000).activeMs,200);
  const long=activeClock(0);assert.ok(long.stop(400000).timingFlags.includes('long-inactivity-uncertain'));
});
test('fluency needs comparable batches and ignores interruptions, without changing accuracy',()=>{
  const rows=Array.from({length:10},(_,i)=>event(i,{group:'g',activeMs:100+i,timingFlags:[]}));
  assert.equal(fluencyTrend(rows.slice(0,9),'t','g','number'),null);
  assert.ok(fluencyTrend(rows,'t','g','number'));
  assert.equal(fluencyTrend(rows.map(r=>({...r,timingFlags:['interrupted']})),'t','g','number'),null);
});
test('readiness keeps missing components unknown, enforces floors, expires, and requires human evidence sufficiency',()=>{
  const b={version:'bp',target:.9,types:['t','u'],typeWeights:{t:.5,u:.5},outcomes:{o:{types:['t','u'],weight:1,essential:true,floor:.8}}};
  const rows=[event(100,{context:'check',assessmentVersion:'bp'}),event(101,{typeId:'u',context:'check',assessmentVersion:'bp'})];
  const opts={confirmedVersion:'bp',now:102};
  const first=readiness(b,rows,opts);assert.equal(first.ready,false);
  assert.equal(readiness(b,rows,{...opts,sufficientEvidence:first.evidenceKey}).ready,true);
  assert.equal(readiness(b,rows.slice(0,1),opts).outcomes.o.score,null);
  assert.equal(readiness(b,rows,{...opts,now:40*864e5}).ready,false);
  assert.equal(readiness(b,[...rows,event(103,{firstUnaided:false})],{...opts,now:104,sufficientEvidence:first.evidenceKey}).ready,false);
  assert.equal(checkCandidates({CHECK:[{id:'q100',typeId:'t'}]},b,rows).items.length,0);
});
test('bounded diagnostic detour leaves scope inventory unchanged and then resumes',()=>{
  const rows=[event(1,{firstUnaided:false}),event(2,{firstUnaided:false})];
  const pool=[{id:'new',typeId:'t'}],diagnostics=[{id:'step',typeId:'foundation',use:'diagnostic'}];
  const selected=selectAdaptive(pool,rows,{actions:1},new Set(),[],null,null,diagnostics,{t:{diagnose:['step']}});
  assert.equal(selected.item.id,'step');assert.equal(pool.length,1);
  const next=selectAdaptive(pool,rows,{...selected.policy,actions:2},new Set(['step']),[],null,null,diagnostics,{t:{diagnose:['step']}});
  assert.equal(next.item.id,'new');
});
test('post-block rubric grade augments the saved first response, without a second completed item',()=>{
  const rows=[event(1,{attemptId:'attempt',firstUnaided:null,assisted:true,selfChecked:true}),
    {id:'rubric',ts:3,event:'rubric-score',attemptId:'attempt',correct:true},
    {id:'exposure',ts:2,event:'exposure',itemId:'q1',beforeSubmission:false}];
  const evidence=observations(rows,'t');assert.equal(evidence.length,1);assert.equal(evidence[0].weight,.5);
  assert.equal(evidence[0].firstUnaided,true);
  const replayed=fold(rows,{target:.9});assert.equal(replayed.study.q1.got,1);assert.equal(replayed.retain['type:t'].reps,1);
});
test('checkpoint accepts tied-time and older imported rows and applies aliases without new answers',async()=>{
  const { appendRow, setItem, getItem }=await import('../../src/lib/store.js');
  const { rebuild }=await import('../../src/lib/replay.js');
  const C={code:'history-edge',retention:{},legacyQuestionAliases:{}},cid='history-edge';
  appendRow({id:'edge:1',ts:10,course:cid,loop:'Q',itemId:'old',concept:'c',correct:true});
  let result=rebuild(cid,C);assert.equal(result.study.old.reps,1);
  setItem('study:history-edge',JSON.stringify({q:result.study,answers:{old:{signature:'sig',value:'first'}}}));
  C.legacyQuestionAliases={old:'new'};result=rebuild(cid,C);
  assert.equal(result.study.new.reps,1);assert.equal(JSON.parse(getItem('study:history-edge')).answers.new.value,'first');
  appendRow({id:'edge:2',ts:10,course:cid,loop:'Q',itemId:'old',concept:'c',correct:false});
  result=rebuild(cid,C);assert.equal(result.study.new.reps,2);assert.equal(result.study.new.got,0);
  appendRow({id:'edge:0',ts:5,course:cid,loop:'Q',itemId:'old',concept:'c',correct:true});
  result=rebuild(cid,C);assert.equal(result.study.new.reps,3);assert.equal(result.study.new.got,0);
});
test('migrated reserved answer exposure stays consumed and legacy first attempt remains unknown',async()=>{
  const {migrateLegacyRows}=await import('../../src/lib/question-aliases.js');
  const rows=migrateLegacyRows([{id:'legacy',ts:1,loop:'Q',itemId:'old',correct:true}],{old:'new'});
  const b={types:['t'],version:'b'};
  assert.equal(rows[0].firstUnaided,null);
  const result=checkCandidates({CHECK:[{id:'new',typeId:'t'}]},b,rows);
  assert.equal(result.items.length,0);assert.deepEqual(result.missing,['t']);
});

test('mixed practice includes encountered due types in its alternating review turn',()=>{
  const pool=[{id:'a',typeId:'advanced',use:'practice'},{id:'b',typeId:'base',use:'practice'},
    {id:'reserved',typeId:'hidden',use:'check'}];
  const histories={'type:advanced':{reps:2,dueAt:10},'type:base':{reps:0,dueAt:0},'type:hidden':{reps:1,dueAt:1}};
  const dueTypes=duePracticeTypes(pool,'course',(_,key)=>histories[key],20);
  assert.deepEqual(dueTypes,['advanced']);
  const selected=selectAdaptive(pool,[],{actions:1},new Set(),dueTypes);
  assert.equal(selected.item.typeId,'advanced');assert.equal(selected.reason,'Due for review');
  assert.deepEqual(duePracticeTypes(pool,'course',(_,key)=>histories[key],5),[]);
});
