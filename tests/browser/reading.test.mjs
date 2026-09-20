#!/usr/bin/env node
/* Reader regressions: exercise the built app with deliberately repeated note
 * keys, long prose, and mixed depth blocks. No private course data required. */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';

const root = resolve(process.argv[2] || '.');
const shots = resolve('.scratch/reading-shots');
mkdirSync(shots, { recursive: true });
const server = await serveDist(root);
const browser = await chromium.launch();
let checks = 0;
const check = (name, ok) => { assert.ok(ok, name); checks++; console.log('ok  ' + name); };
const html = '<p>' + Array.from({ length: 160 }, (_, i) => `Sentence ${i} describes how changing the reading width wraps the same words onto new lines. `).join('') + '</p>';
const note = (term, body) => ({ t: 'def', term, core: `<n k="same">${term} is the marked claim.</n>`, h: `<p>${body}</p>`, asides: { same: `<p>Explanation for ${term}.</p>` } });
const fixture = {
  'course.json': JSON.stringify({ code: 'DEMO', title: 'Reading tests' }),
  'sections/01-reading/_section.json': JSON.stringify({ title: 'Reading tests' }),
  'sections/01-reading/1-content.json': JSON.stringify({ title: 'Anchors and depth', blocks: [
    note('First', 'First development.'), note('Second', 'Second development.'),
    { t: 'key', core: 'This claim has an explanation in the development.', h: '<p>Here is <n k="hidden">the hidden sentence</n> with more detail.</p>', asides: { hidden: 'Help for the hidden sentence.' } },
    { t: 'p', h: '<p>Unfamiliar <n k="prose">prose</n> can have a note too.</p>', asides: { prose: 'Help with this prose.' } },
    { t: 'ex', title: 'Optional worked case', tier: 'depth', follows: true, h: '<ol><li>Take the input.</li><li>Work out the answer.</li></ol>' },
    { t: 'figure', tier: 'depth', follows: true, kind: 'svg', cap: 'Optional drawing', spec: { viewBox: '0 0 100 30', body: '<circle cx="15" cy="15" r="10" />' } },
    { t: 'table', tier: 'depth', follows: true, cap: 'Optional table', split: 2, head: ['a','b','c'], rows: [['1','2','3'],['4','5','6']] },
    { t: 'code', tier: 'depth', follows: true, src: 'const x = 1;', lang: 'js' },
    { t: 'key', label: 'Long passage', core: 'Long passages must keep their actual reading line.', h: html },
    { t: 'key', label: 'After the passage', h: html },
    { t: 'key', core: 'A long review claim can also wrap across many lines. '.repeat(50), h: '<p>Further development.</p>' },
    { t: 'key', core: 'More reading after the claim. '.repeat(100), h: html }
  ] })
};
try {
  const demo = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await demo.goto(server.origin + '/#/demo/s1-4');
  await demo.locator('.tbl .tsplit').first().waitFor();
  check('split table cells stay in table layout', await demo.locator('.tbl .tsplit').evaluateAll(cells => cells.every(el => getComputedStyle(el).display === 'table-cell' && el.getBoundingClientRect().width > 30)));
  await demo.locator('.tscroll').nth(1).screenshot({ path: resolve(shots, 'reading-table.png') });
  await demo.goto(server.origin + '/#/demo/s5-1');
  await demo.locator('.mnote.is-a').waitFor();
  await demo.locator('.modesw-b:visible', { hasText: 'Review' }).click();
  await demo.locator('.mnote.is-a').scrollIntoViewIfNeeded();
  await demo.screenshot({ path: resolve(shots, 'reading-demo-review.png') });
  await demo.close();

  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/courses/demo.json', r => r.fulfill({ json: fixture }));
  await page.goto(server.origin + '/#/demo/s1-1');
  await page.locator('.nref').first().waitFor();
  const mode = async label => { await page.locator('.modesw-b:visible', { hasText: label }).first().click(); await page.waitForTimeout(350); };
  const row = i => page.locator(`[id="s1-1~${i}"]`);
  for (const label of ['Study','Review','Names']) {
    await mode(label);
    const first = row(0), second = row(1);
    check(label + ' keeps each aside by its own block', await first.locator('.mnote.is-a').count() === 1 && await second.locator('.mnote.is-a').count() === 1);
    if (label === 'Names') {
      await first.locator('.mn-open').click();
      await page.waitForTimeout(100);
    }
    const card = first.locator('.mnote.is-a');
    await card.hover();
    check(label + ' highlights only the referenced text', await first.locator('.nref.hot').count() === 1 && await second.locator('.nref.hot').count() === 0);
    await page.mouse.move(0, 0);
    await card.focus();
    check(label + ' supports keyboard note pairing', await first.locator('.nref.hot').count() === 1);
    await card.evaluate(el => el.blur());
    check(label + ' leaves prose unmarked at rest', await first.locator('.nref').evaluate(el => !el.classList.contains('hot') && getComputedStyle(el).borderBottomStyle === 'none'));
  }
  await mode('Review');
  await row(2).locator('.mn-open').click();
  await page.waitForTimeout(200);
  check('Review can reveal the exact sentence behind a note', await row(2).locator('.nref').isVisible() && await row(2).locator('.mnote.is-a').isVisible());
  check('Review retains help attached to hidden prose', await row(3).locator('.mn-open').isVisible());
  for (const label of ['Study', 'Review']) {
    await mode(label);
    const tab = page.locator('.dtab').first();
    if (await tab.getAttribute('aria-expanded') === 'true') await tab.click();
    const panel = page.locator(`[id="${await tab.getAttribute('aria-controls')}"]`);
    check(label + ' starts depth hidden', await panel.isHidden());
    await tab.click();
    check(label + ' opens examples and graphics in full', await panel.locator('.ex').isVisible() && await panel.locator('svg').isVisible() && await panel.locator('table').isVisible() && await panel.locator('pre').isVisible() && (await panel.locator('pre').innerText()).includes('const x = 1'));
    await tab.click();
    check(label + ' closes depth from the same tab', await panel.isHidden());
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  check('mobile notes stay readable without horizontal overflow', await row(0).locator('.mnote.is-a').isVisible() && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: resolve(shots, 'reading-mobile.png') });

  await page.setViewportSize({ width: 1600, height: 1000 });
  await mode('Study');
  await page.waitForTimeout(1000);
  // Save a live character in the middle of a long text node. Comparing its
  // position catches intra-block drift that checking the block top cannot.
  await row(8).locator('.bhtml p').last().evaluate(el => {
    const node = el.firstChild;
    const range = document.createRange();
    range.setStart(node, 3200); range.setEnd(node, 3201);
    const fold = document.querySelector('.topbar').getBoundingClientRect().bottom + 12;
    scrollTo({ top: scrollY + range.getBoundingClientRect().top - fold, behavior: 'instant' });
  });
  await page.waitForTimeout(1400);
  const captured = await page.evaluate(() => {
    const y = document.querySelector('.topbar').getBoundingClientRect().bottom + 12;
    const main = document.querySelector('[id="s1-1~8"] .bmain');
    const x = main.getBoundingClientRect().left + 24;
    const c = document.caretPositionFromPoint(x,y);
    const r = document.createRange();r.setStart(c.offsetNode,c.offset);r.setEnd(c.offsetNode,c.offset+1);
    window.readingTestRange = r;
    return { offset: r.getBoundingClientRect().top-y, text: r.toString() };
  });
  for (const width of [1100, 900, 600, 1600]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(700);
    const offset = await page.evaluate(() => window.readingTestRange.getBoundingClientRect().top - document.querySelector('.topbar').getBoundingClientRect().bottom - 12);
    check(`resize to ${width} preserves the same text line (${Math.round(offset-captured.offset)}px)`, Math.abs(offset-captured.offset) < 5);
  }
  // A window drag emits resizes faster than the landing animation settles.
  for (const width of [1500, 1200, 1000, 800, 600, 900, 1600]) await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(800);
  const finalOffset = await page.evaluate(() => window.readingTestRange.getBoundingClientRect().top - document.querySelector('.topbar').getBoundingClientRect().bottom - 12);
  check('continuous resizing preserves the original text anchor', Math.abs(finalOffset-captured.offset) < 5);
  const beforeHeight = await page.evaluate(() => scrollY);
  await page.setViewportSize({ width: 1600, height: 850 });
  await page.waitForTimeout(300);
  check('height-only resizing leaves the scroll position alone', Math.abs(await page.evaluate(() => scrollY)-beforeHeight) < 2);
  await page.screenshot({ path: resolve(shots, 'reading-desktop.png') });
  await mode('Review');
  await page.waitForTimeout(1000);
  await row(10).locator('.nclaim > span').evaluate(el => {
    const r = document.createRange();r.setStart(el.firstChild, 600);r.setEnd(el.firstChild, 601);
    const y = document.querySelector('.topbar').getBoundingClientRect().bottom + 12;
    scrollTo({ top: scrollY + r.getBoundingClientRect().top-y, behavior: 'instant' });
  });
  await page.waitForTimeout(1300);
  const reviewOffset = await page.evaluate(() => {
    const y = document.querySelector('.topbar').getBoundingClientRect().bottom + 12;
    const x = document.querySelector('[id="s1-1~10"] .bmain').getBoundingClientRect().left+24;
    const c = document.caretPositionFromPoint(x,y);
    const r = document.createRange();r.setStart(c.offsetNode,c.offset);r.setEnd(c.offsetNode,c.offset+1);
    window.readingTestRange = r;return r.getBoundingClientRect().top-y;
  });
  await page.setViewportSize({ width: 600, height: 850 });
  await page.waitForTimeout(800);
  const reviewAfter = await page.evaluate(() => window.readingTestRange.getBoundingClientRect().top-document.querySelector('.topbar').getBoundingClientRect().bottom-12);
  check('Review preserves the line within a long claim', Math.abs(reviewAfter-reviewOffset) < 5);
  check('reader interactions raise no JavaScript errors: ' + errors.join(' | '), errors.length === 0);
  console.log(`${checks} reading checks passed`);
} finally {
  await browser.close();server.close();
}
