import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../fixtures/teaching-review/', import.meta.url);
const source = readFileSync(new URL('source.md', root), 'utf8');
const candidate = readFileSync(new URL('candidate.md', root), 'utf8');
const oracle = readFileSync(new URL('oracle.md', root), 'utf8');

test('teaching review cases have distinct declared goals, source anchors and questions', () => {
  const ids = [...source.matchAll(/^## (proc-1|mech-1|interp-1) —/gm)].map(match => match[1]);
  assert.deepEqual(ids, ['proc-1', 'mech-1', 'interp-1']);
  for (const id of ['proc-1', 'mech-1', 'interp-1']) {
    const sourceCase = source.split(`## ${id} —`)[1].split(/^## /m)[0];
    assert.equal((sourceCase.match(/\*\*Source question:\*\*/g) ?? []).length, 1, `source question count for ${id}`);
    assert.ok(candidate.includes(`## ${id}\n`), `missing candidate for ${id}`);
    assert.ok(oracle.includes(`**${id}:`), `missing evaluator finding for ${id}`);
    assert.match(candidate, new RegExp(`## ${id}\\n\\nReader: .+? Goal: .+?\\n`));
  }
  assert.match(candidate, /## Diagram contrast/);
  assert.match(candidate, /## Research tasks/);
});
