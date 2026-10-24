import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { slideFixture } from '../fixtures/creator-round/slides-fixture.mjs';
import { indexSources, readUnit } from '../../tools/lib/source-catalog.mjs';
import { loadContext, selectContext } from '../../tools/lib/author-context.mjs';

test('sparse presentation retains the speaker-note limit in its exact source unit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'creator-round-'));
  try {
    const path = join(dir, 'feedback.pptx');
    writeFileSync(path, slideFixture());
    const catalog = indexSources([{ path }], join(dir, 'index'));
    const source = catalog.sources[0];
    assert.equal(source.status, 'partial');
    assert.equal(source.units.length, 2);
    const second = readUnit(catalog, { source: source.id, unit: source.units[1].id });
    assert.match(second.text, /positive error turns heater on/);
    assert.match(second.text, /Notes:\nMeasurement can lag/);
    assert.match(second.text, /No quantitative model or guarantee of oscillation/);
    assert.match(second.warning, /inspect the original slide/);
    assert.match(second.locator, /slide 2/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('scope approval guidance reaches planning without loading planner rules into writers', () => {
  const context = loadContext(new URL('../../authoring/', import.meta.url).pathname);
  const planner = selectContext(context, { role: 'planner', phase: 'plan' });
  const writer = selectContext(context, { role: 'writer', phase: 'write' });
  assert.match(planner.text, /Ask for outline approval/);
  assert.match(planner.text, /missing exposition is not proof/);
  assert.ok(!writer.modules.some(module => module.id === 'plan'));
  for (const role of ['planner', 'writer', 'reviewer']) {
    const phase = role === 'planner' ? 'plan' : role === 'writer' ? 'write' : 'review';
    const rules = selectContext(context, { role, phase });
    assert.match(rules.text, /Separate source authority about scope from correctness/);
    assert.ok(!rules.text.includes('Evaluator-only expectations'));
  }
});

test('experiment cases retain distinct source inputs and explicit reader constraints', () => {
  const root = new URL('../fixtures/creator-round/', import.meta.url);
  const cases = JSON.parse(readFileSync(new URL('cases.json', root)));
  assert.deepEqual(cases.map(item => item.id), ['ode', 'key', 'slides', 'logic', 'stats', 'prereq']);
  for (const item of cases) {
    assert.equal(readFileSync(new URL(`${item.id}.md`, root), 'utf8'), item.source);
    assert.ok(item.reader && item.goal && item.edge);
  }
});

test('math recipe preserves a single TeX command through YAML parsing', async () => {
  const YAML = await import('js-yaml');
  const { default: katex } = await import('katex');
  const recipe = readFileSync(new URL('../../authoring/formats/math.md', import.meta.url), 'utf8');
  const example = recipe.match(/use `(tex: '[^']+')`/);
  assert.ok(example, 'literal YAML example must remain available to writers');
  const { tex } = YAML.load(example[1]);
  assert.equal(tex, String.raw`\text{error}`);
  const rendered = katex.renderToString(tex, { output: 'mathml', throwOnError: true });
  assert.match(rendered, /<mtext>error<\/mtext>/);
});
