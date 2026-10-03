import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadContext } from '../../tools/lib/author-context.mjs';
import { buildPacket, planSignature, planCoverage } from '../../tools/lib/author-packets.mjs';
const context = loadContext(new URL('../../authoring', import.meta.url).pathname);
function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'packets-'));
  const file = join(dir, 's1-1.yaml');
  writeFileSync(file, `blocks:\n  - {t: p, c: teaching, objectives: [a]}\n  - {t: p, c: unrelated}\nquiz:\n  - {type: transfer, family: transfer, objectives: [a], q: original, a: solution}\n  - {type: unrelated, q: unrelated, a: unrelated}\n`);
  const plan = { path: join(dir, 'plan.yaml'), hash: 'hash', data: {
    objectives: [{ id: 'a', outcome: 'Apply', families: ['transfer'], sources: [{source:'s',unit:'u',lines:[2,3]}] }, {id:'b',outcome:'Unrelated'}],
    families: [{id:'transfer',description:'Apply on a new surface'}],
    reader:{goal:'Master transfer',background:['arithmetic'],priorities:['compact']},
    lessons: [{id:'s1-1',objectives:['a']},{id:'s1-2',objectives:['b']}] } };
  try { fn({plan,subsection:{id:'s1-1',file}}); } finally { rmSync(dir,{recursive:true,force:true}); }
}
test('review includes one original item and requires explicit bounded evidence', () => fixture(args => {
  const p = buildPacket({...args,context,phase:'review',mode:'paired',item:'quiz:1'});
  assert.equal(p.role,'reviewer');
  assert.equal(p.item.content.q,'original');
  assert.ok(!JSON.stringify(p).includes('unrelated'));
  assert.equal(p.sourceRefs,undefined);
  assert.deepEqual(p.reader,{background:['arithmetic']});
  assert.equal(p.plan,undefined);
  assert.ok(p.warnings.some(w=>w.includes('source span')));
  assert.ok(p.rules.every(f=>!f.includes('/formats/')));
  const narrowed = buildPacket({...args,context,phase:'review',mode:'paired',item:'quiz:1',sourceRefs:[{source:'s',unit:'u',lines:[2,2]}]});
  assert.deepEqual(narrowed.sourceRefs[0].lines,[2,2]);
  assert.equal(narrowed.sources,undefined);
}));
test('single mode skips role handoff; writer receives objective source references',()=>fixture(args=>{
  const p=buildPacket({...args,context,phase:'write',mode:'single'});
  assert.equal(p.role,'single');assert.equal(p.sourceRefs.length,1);
  assert.deepEqual(p.reader,{goal:'Master transfer',background:['arithmetic']});
  assert.equal(p.families[0].description,'Apply on a new surface');
  assert.equal(buildPacket({...args,context,phase:'write',mode:'paired'}).role,'writer');
}));
test('explicit lesson-local families and source assignments bound writer packets',()=>fixture(args=>{
  args.plan.data.lessons[0].families=['other'];
  args.plan.data.lessons[0].sources=[{source:'local',unit:'unit',lines:[4,5]}];
  args.plan.data.families.push({id:'other',description:'Lesson-specific'});
  const p=buildPacket({...args,context,phase:'write',mode:'paired'});
  assert.deepEqual(p.families.map(f=>f.id),['other']);
  assert.deepEqual(p.sourceRefs,args.plan.data.lessons[0].sources);
  assert.equal(p.objectives[0].sources,undefined);
  assert.equal(p.objectives[0].families,undefined);
}));
test('unrelated plan edits preserve local validation but local changes invalidate it',()=>fixture(({plan})=>{
  const before=planSignature(plan,'s1-1');
  plan.data.objectives[1].outcome='Changed';assert.equal(planSignature(plan,'s1-1'),before);
  plan.data.families[0].description='New boundary';assert.notEqual(planSignature(plan,'s1-1'),before);
  plan.data.families[0].description='Apply on a new surface';
  plan.data.objectives[0].outcome='Changed';assert.notEqual(planSignature(plan,'s1-1'),before);
}));
test('coverage counts explicit teaching, questions and every required family',()=>fixture(({plan,subsection})=>{
  plan.data.objectives[1].disposition='excluded';
  assert.equal(planCoverage(plan,[subsection]).percent,100);
  plan.data.objectives[0].families.push('boundary');assert.equal(planCoverage(plan,[subsection]).percent,0);
}));

test('shared broad objectives cannot silently expand a lesson packet',()=>fixture(args=>{
  args.plan.data.lessons[1].objectives=['a'];
  const p=buildPacket({...args,context,phase:'write',mode:'paired'});
  assert.equal(p.sourceRefs,undefined);
  assert.equal(p.families,undefined);
  assert.ok(p.warnings.some(w=>w.includes('lesson-local sources')));
  assert.ok(p.warnings.some(w=>w.includes('lesson-local families')));
  assert.ok(!JSON.stringify(p).includes('Apply on a new surface'));
}));

test('one assessment can cover related required families without producing excluded inventory',()=>fixture(({plan,subsection})=>{
  plan.data.families.push({id:'boundary'},{id:'outside',disposition:'excluded',reason:'Outside requested goal'});
  plan.data.objectives[0].families=['transfer','boundary','outside'];
  plan.data.objectives[1].disposition='excluded';
  const body=`blocks:\n  - {t: p, c: teaching, objectives: [a]}\nquiz:\n  - {type: transfer, families: [transfer, boundary], objectives: [a], q: Shared, response: {kind: self, model: Both}}\n`;
  writeFileSync(subsection.file,body);
  assert.equal(planCoverage(plan,[subsection]).percent,100);
  const p=buildPacket({context,plan,subsection,phase:'write'});
  assert.deepEqual(p.families.map(f=>f.id),['transfer','boundary']);
}));
