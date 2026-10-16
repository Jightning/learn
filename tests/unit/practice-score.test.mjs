import test from 'node:test';
import assert from 'node:assert/strict';
import { selectScored, placeSelection } from '../../src/lib/practice-score.js';

const item = (id, typeId, extra = {}) => ({ id, typeId, use: 'practice', group: `${typeId}:${id}`,
  response: { kind: 'number' }, ...extra });
const attempt = (id, typeId, correct, ts = 1) => ({ id: `event-${id}`, itemId: id, typeId, event: 'attempt',
  ts, sessionId: `session-${id}`, group: `${typeId}:${id}`, firstUnaided: correct, correct });

test('scored ranking keeps advanced work eligible despite weak prerequisites', () => {
  const pool = [item('advanced', 'advanced'), item('base', 'base')];
  const rows = [attempt('old-base', 'base', false)];
  const result = selectScored(pool, rows, { types: { advanced: { id: 'advanced', requires: ['base'] },
    base: { id: 'base', requires: [] } } });
  const advanced = result.scores.find(x => x.typeId === 'advanced');
  assert.ok(advanced.score > 0);
  assert.ok(advanced.prerequisite >= .8);
  assert.equal(result.scores.length, 2);
});

test('fresh variants outrank exposed repeats and reserved checks never enter the pool', () => {
  const pool = [item('seen', 't'), item('fresh', 't'), item('reserved', 't', { use: 'check' })];
  const result = selectScored(pool, [attempt('seen', 't', true)]);
  assert.equal(result.item.id, 'fresh');
  assert.deepEqual(result.scores.map(x => x.id).sort(), ['fresh', 'seen']);
  assert.equal(selectScored(pool, [], { used: new Set(['seen', 'fresh']) }).item, null);
});

test('due review and breadth change ranking while keeping scores reproducible', () => {
  const pool = [item('a', 'a'), item('b', 'b')];
  const rows = [attempt('old-a', 'a', true)];
  const ordinary = selectScored(pool, rows);
  const due = selectScored(pool, rows, { dueTypes: ['a'] });
  assert.equal(ordinary.item.id, 'b');
  assert.ok(due.scores.find(x => x.id === 'a').score > ordinary.scores.find(x => x.id === 'a').score);
  assert.deepEqual(selectScored(pool, rows, { dueTypes: ['a'] }), due);
});

test('unseen formula and rubric types receive equal initial coverage opportunity', () => {
  const pool = [item('a-formula', 'formula', { response: { kind: 'formula' } }),
    item('b-self', 'self', { response: { kind: 'self' } }), item('c-number', 'number')];
  const scores = selectScored(pool, []).scores;
  assert.equal(new Set(scores.map(x => x.score)).size, 1);
});

test('import order does not change the latest type or candidate ranking', () => {
  const pool = [item('a', 'a'), item('b', 'b')];
  const rows = [attempt('old-a', 'a', true, 1), attempt('old-b', 'b', false, 2)];
  assert.deepEqual(selectScored(pool, rows), selectScored(pool, [...rows].reverse()));
});

test('changed bank content loses old evidence while legacy inline evidence remains', () => {
  const pool = [item('bank-new', 'bank'), item('legacy-new', 'legacy')];
  const rows = [attempt('bank', 'bank', true), attempt('legacy', 'legacy', false, 2)];
  rows[0].contentVersion = 'old';
  const changed = selectScored(pool, rows, { versions: { bank: 'new' } }).scores;
  const unchanged = selectScored(pool, rows).scores;
  assert.ok(changed.find(x => x.typeId === 'bank').score > unchanged.find(x => x.typeId === 'bank').score);
  assert.deepEqual(selectScored(pool.slice(1), rows, { versions: { bank: 'new' } }), selectScored(pool.slice(1), rows));
});

test('live placement swaps future items and protects scheduled retries', () => {
  const a = item('a', 't'), b = item('b', 't'), c = item('c', 't');
  assert.deepEqual(placeSelection([a, b, c], 0, c).map(q => q.id), ['c', 'b', 'a']);
  assert.deepEqual(placeSelection([a, b, c], 1, a).map(q => q.id), ['a', 'b', 'c']);
  assert.deepEqual(placeSelection([a, b, c], 1, c, new Set(['b'])).map(q => q.id), ['a', 'b', 'c']);
});
