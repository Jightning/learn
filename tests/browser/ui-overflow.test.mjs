import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';

const longName = 'Textbook_' + 'a_very_long_descriptive_reference_'.repeat(24) + 'final-edition.pdf §12.4';
const spacedName = 'Collected notes on ' + 'multivariable calculus and geometric reasoning '.repeat(20) + 'final chapter.pdf p. 82';
const sources = [longName, spacedName, 'volume-2/' + longName];
const files = {
  'course.json': JSON.stringify({ code: 'REFS', title: 'Reference sizing' }),
  'sections/01-first/1-lesson.json': JSON.stringify({ title: 'Lesson', blocks: sources.map((name, i) => ({
    t: 'key', h: `Claim ${i + 1}.`, source: '/Users/private-person/My course/sources/' + name
  })) })
};

test('opening a large course catalog keeps laptop import controls fixed and leaves viewport margins', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    for (const height of [600, 900]) {
      const page = await browser.newPage({ viewport: { width: 1366, height }, reducedMotion: 'reduce' });
      await page.goto(server.origin + '/#/');
      await page.locator('#lib-add').click();
      await page.locator('.modal .cio').waitFor({ state: 'visible' });
      const before = await page.locator('.modal .cio').boundingBox();
      await page.locator('.cio-list').evaluate(el => {
        const category = el.firstElementChild;
        for (let i = 0; i < 30; i++) el.append(category.cloneNode(true));
      });
      await page.locator('.cio-catalog > summary').click();
      const after = await page.locator('.modal .cio').boundingBox();
      assert.ok(Math.abs(before.y - after.y) <= 1, 'opening the catalog leaves import controls in place');
      const bounds = await page.locator('.modal').boundingBox();
      assert.ok(bounds.y >= 24 && bounds.y + bounds.height <= height - 24 + 1, 'dialog keeps top and bottom margins');
      const list = page.locator('.cio-list');
      assert.ok(await list.evaluate(el => el.scrollHeight > el.clientHeight), 'catalog has its own overflow');
      await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
      assert.ok(await list.evaluate(el => el.scrollTop > 0), 'catalog scrolls to remaining courses');
      assert.ok(Math.abs(before.y - (await page.locator('.modal .cio').boundingBox()).y) <= 1, 'scrolling catalog leaves import controls fixed');
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
});

test('long source labels preserve both ends without widening the page or displaying local paths', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    for (const width of [320, 390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.route('**/courses/demo.json', route => route.fulfill({ json: files }));
      await page.goto(server.origin + '/#/demo/s1-1');
      await page.locator('.bsrc.is-long').first().waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.bsrc.is-long').count(), 3);
      const result = await page.locator('.bsrc.is-long').evaluateAll(els => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        labels: els.map(el => {
          const head = el.querySelector('.bsrc-head'), tail = el.querySelector('.bsrc-tail');
          return { text: el.textContent, title: el.title, clipped: head.scrollWidth > head.clientWidth,
            ellipsis: getComputedStyle(head).textOverflow, tail: tail.textContent,
            fits: el.getBoundingClientRect().right <= el.closest('.bmain').getBoundingClientRect().right + 1 };
        })
      }));
      assert.ok(result.overflow <= 1, `${width}px: reference does not widen the viewport`);
      result.labels.forEach((label, i) => {
        assert.equal(label.text, sources[i]);
        assert.equal(label.title, sources[i]);
        assert.doesNotMatch(label.text, /private-person|\/Users\//);
        assert.ok(label.clipped && label.fits && label.ellipsis === 'ellipsis');
        assert.equal(label.tail, sources[i].slice(-20));
      });
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
});
