import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';

test('Resume demo installs from its bundle and renders all four lessons on laptop and phone', async () => {
  const server = await serveDist(resolve('.'));
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(server.origin);
    await page.locator('#lib-add').click();
    await page.locator('.modal .cio input[accept*="zip"]').setInputFiles({
      name: 'resume.course.json', mimeType: 'application/json',
      buffer: readFileSync('packed/resume.course.json')
    });
    const card = page.getByRole('link', { name: 'Defending the Resume', exact: true });
    await card.waitFor();
    const href = await card.getAttribute('href');
    assert.ok(href, 'imported course has a navigation link');
    const base = href.replace(/\/s\d+-\d+.*$/, '');
    mkdirSync('.scratch/resume-demo', { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [id, title] of [['s1-1', 'Run your first program'], ['s1-2', 'Keep an honest evidence record'],
        ['s2-1', 'Trace values and units'], ['s2-2', 'Build a tiny price function']]) {
        await page.goto(server.origin + '/' + base + '/' + id);
        await page.locator(`[id="${id}"] .bhtml`).first().waitFor();
        assert.match(await page.locator(`[id="${id}"]`).innerText(), new RegExp(title));
        assert.ok(await page.locator('.codewrap').count() > 0 || id === 's2-1');
        assert.ok(await page.locator('.codewrap').first().isVisible());
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        assert.equal(overflow, false, `${id} overflows at ${width}px`);
        await page.locator(`[id="${id}"]`).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `.scratch/resume-demo/${id}-${width}.png`, animations: "disabled" });
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    server.close();
  }
});
