import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveQuestionBank } from '../../src/lib/question-bank.js';
const course = () => ({concepts:{c:{}},objectives:{o:{families:['f']}},families:{f:{concept:'c',teach:['s1-1']}},sections:[{id:'s1',subs:[{id:'s1-1',quiz:[],blocks:[]}]}]});
const source = () => ({skills:[{id:'a',task:'Recall logic',standard:'Recall independently',family:'f'}],items:[
 {id:'recall',skills:['a'],q:'Name the gate',response:{kind:'text',accepted:['NAND']},errors:[{id:'and',description:'May omit inversion',match:{kind:'text',accepted:['AND']}}]},
 {id:'probe',skills:['a'],use:'diagnostic',diagnosticsFor:['a'],probes:['and'],q:'Is the output inverted?',response:{kind:'number',value:1}},
 {id:'blanks',skills:['a'],q:'Give index and level',timing:{limitSeconds:60},response:{kind:'blanks',fields:[
  {id:'index',label:'Selected index',response:{kind:'number',value:5}},
  {id:'level',label:'Asserted level',response:{kind:'text',accepted:['low']}}
 ],scoring:{criteria:[{id:'index',field:'index',match:{kind:'number',value:5},points:1,skills:['a']}]}}}],
 assessments:[{scope:'course',criteria:'Recall independently',timing:{limitSeconds:1200}}]});
test('canonical compiler derives one-way diagnostics, text/blanks, numeric rubric and limits', () => {
 const errors=[], C=course(); const result=resolveQuestionBank(C,source(),errors);
 assert.deepEqual(errors,[]);
 assert.deepEqual(result.types.a.diagnose,['probe']);
 assert.equal(result.bank.blanks.response.fields.length,2);
 assert.equal(result.blueprints.course.timing.limitSeconds,1200);
 assert.equal(result.bank.blanks.timing.limitSeconds,60);
});
test('compiler rejects invalid timing, probed causes and criterion ownership before use', () => {
 const s=source(); s.items[1].probes=['invented'];s.items[2].timing.limitSeconds=0;
 s.items[2].response.scoring.criteria[0].skills=['outside'];
 const errors=[];resolveQuestionBank(course(),s,errors);
 assert.ok(errors.some(e=>e.includes('unknown probed error')));
 assert.ok(errors.some(e=>e.includes('timing')));
 assert.ok(errors.some(e=>e.includes('criterion skills')));
});
test('timing and rubric semantics version evidence while unrelated organization remains separate', () => {
 const a=resolveQuestionBank(course(),source(),[]).bank.blanks;
 const s=source();s.items[2].timing.limitSeconds=30;
 const b=resolveQuestionBank(course(),s,[]).bank.blanks;
 assert.notEqual(a.contentVersion,b.contentVersion);
 assert.equal(a.organizationVersion,b.organizationVersion);
});

test('response validation reports an unknown field once through the shared validator', () => {
 const s=source();s.items[0].response.extra='unused';const errors=[];
 resolveQuestionBank(course(),s,errors);
 assert.equal(errors.filter(e=>e.includes('unknown response key extra')).length,1);
});
