import test from 'node:test';
import assert from 'node:assert/strict';
import { syncBatches } from '../../src/lib/sync-batches.js';

test('large backlogs keep every row and preference within API limits', () => {
  const rows = Array.from({length: 4001}, (_, id) => ({id, enc:'answer'}));
  const prefs = Array.from({length: 2001}, (_, k) => ({k, enc:'draft'}));
  const batches = syncBatches(rows, prefs);
  assert.deepEqual(batches.flatMap(b => b.rows), rows);
  assert.deepEqual(batches.flatMap(b => b.prefs), prefs);
  assert.ok(batches.every(b => b.rows.length <= 2000 && b.prefs.length <= 2000));
});

test('encrypted body size splits a batch before the request limit', () => {
  const prefs = Array.from({length: 40}, (_, k) => ({k, enc:'x'.repeat(100000)}));
  const batches = syncBatches([], prefs);
  assert.ok(batches.length > 1);
  assert.deepEqual(batches.flatMap(b => b.prefs), prefs);
  assert.ok(batches.every(b => Buffer.byteLength(JSON.stringify(b)) < 4 * 1024 * 1024));
  assert.deepEqual(syncBatches([], []), [{rows:[], prefs:[]}]);
});
