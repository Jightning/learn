import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import * as YAML from 'js-yaml';
import { serveDist } from '../helpers/browser-harness.mjs';

for (const width of [1440, 390]) test(`Markdown renders safely across course fields at ${width}px`, async () => {
  const server = await serveDist(resolve('.'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const files = {
      'course.yaml': 'code: MD\ntitle: Markdown\n',
      'sections/01-text/_section.yaml': 'title: "**Text**"\n',
      'sections/01-text/1-reading.yaml': YAML.dump({ title: '**Reading**', blocks: [
        { t: 'p', h: 'First **claim**.\n\nSecond *paragraph* with <m>x_1</m>.\n\n- Alpha\n- Beta' },
        { t: 'p', h: '[Unsafe](javascript:alert%281%29) <img src=x onerror="window.__markdownAttack=true">' },
        { t: 'p', h: '```js\nconst x = "<m>x_1</m> **literal**";\n```' },
        { t: 'table', cap: '**Comparison**', head: ['**Input**'], rows: [['*Value*']] }
      ], quiz: [{ type: 'explain', q: '**Explain** the claim.', response: { kind: 'self', model: '**Because** it follows.' } }] })
    };
    await page.route('**/courses/demo.json', route => route.fulfill({ json: files }));
    await page.goto(server.origin + '/#/demo/s1-1');
    await page.locator('#s1-1 .bhtml').first().waitFor();
    assert.equal(await page.locator('#s1-1 h3 strong').textContent(), 'Reading');
    assert.equal(await page.locator('#s1-1 .bhtml strong').filter({ hasText: 'claim' }).count(), 1);
    assert.equal(await page.locator('#s1-1 .bhtml li').count(), 2);
    assert.ok(await page.locator('#s1-1 .katex').count());
    assert.equal(await page.locator('#s1-1 pre code').textContent(), 'const x = "<m>x_1</m> **literal**";\n');
    assert.equal(await page.locator('#s1-1 th strong').textContent(), 'Input');
    assert.equal(await page.locator('#s1-1 td em').textContent(), 'Value');
    assert.equal(await page.locator('#s1-1 [onerror], #s1-1 a[href^="javascript:"]').count(), 0);
    assert.equal(await page.evaluate(() => window.__markdownAttack), undefined);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  } finally { await browser.close(); server.close(); }
});
