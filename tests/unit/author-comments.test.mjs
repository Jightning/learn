import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as YAML from 'js-yaml';
import { courseFiles } from '../../tools/lib/files.mjs';
import { textOf } from '../../src/lib/util.js';

test('author comments remain in sources but leave no trace in distributed YAML or JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'author-comments-'));
  try {
    const source = 'authorComment: Private rationale\nblocks:\n  - t: p\n    authorComment: Keep this first\n    h: Visible explanation\n';
    writeFileSync(join(dir, 'lesson.yaml'), source);
    writeFileSync(join(dir, 'data.json'), JSON.stringify({ authorComment: 'Private', rows: [{ authorComment: 'Secret', text: 'Visible' }] }));
    writeFileSync(join(dir, 'plain.yaml'), 'title: Unchanged\n');
    const files = courseFiles(dir, message => { throw new Error(message); });
    assert.deepEqual(YAML.load(files['lesson.yaml']), { blocks: [{ t: 'p', h: 'Visible explanation' }] });
    assert.deepEqual(JSON.parse(files['data.json']), { rows: [{ text: 'Visible' }] });
    assert.equal(files['plain.yaml'], 'title: Unchanged\n');
    assert.equal(readFileSync(join(dir, 'lesson.yaml'), 'utf8'), source);
    assert.doesNotMatch(JSON.stringify(files), /Private|Secret|Keep this first|authorComment/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('author reasoning is excluded from learner text and reference extraction', () => {
  assert.equal(textOf({ title: 'Public', authorComment: 'Secret', blocks: [{ h: 'Teaching', authorComment: ['Hidden'] }] }), 'Public Teaching');
});
