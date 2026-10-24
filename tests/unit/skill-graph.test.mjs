import test from 'node:test';
import assert from 'node:assert/strict';
import { compileSkillGraph, relatedSkills } from '../../src/lib/skill-graph.js';

test('sparse graph derives numeric relationships without copying author links or implying mastery', () => {
  const skills = { b: {concept:'c', families:['f'],requires:['a']}, a:{concepts:['c'],families:['f']} };
  const graph = compileSkillGraph(skills);
  assert.deepEqual(graph.ids, ['a','b']);
  assert.deepEqual(graph.requires, [[],[0]]);
  assert.deepEqual(relatedSkills(graph,'a'), [{id:'b',relations:['concept','family']}]);
  assert.deepEqual(skills.b.requires, ['a']);
  assert.equal('mastery' in graph, false);
  assert.deepEqual(compileSkillGraph({a:skills.a,b:skills.b}),graph);
  assert.throws(() => compileSkillGraph({a:{requires:['unknown']}}));
});
