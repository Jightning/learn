import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readAuthorBank, resolveAuthorQuiz } from '../../tools/lib/author-bank.mjs';
import { readQuestionCollections } from '../../src/lib/question-bank.js';

test('nested question shards are visible in author packets as in the reader', () => {
  const dir = mkdtempSync(join(tmpdir(), 'author-shards-'));
  try {
    mkdirSync(join(dir, 'questions', 'algebra'), { recursive: true });
    const files = {
      'questions/types.json': [{ id: 'normalize', task: 'Normalize' }],
      'questions/algebra/practice.json': [{ id: 'q1', typeId: 'normalize', q: 'Normalize', response: { kind: 'number', value: 2 } }],
      'questions/aliases.json': { old: 'q1' },
      'questions/_notes.json': { note: 'not a collection' }
    };
    for (const [path, value] of Object.entries(files)) writeFileSync(join(dir, path), JSON.stringify(value));
    const bank = readAuthorBank(dir);
    const source = readQuestionCollections(files, key => files[key]);
    assert.deepEqual(bank.items.map(r => r.content), source.items);
    assert.equal(bank.items[0].file, join(dir, 'questions/algebra/practice.json'));
    assert.equal(resolveAuthorQuiz(dir, { quiz: ['q1'] }, bank).quiz[0].q, 'Normalize');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
