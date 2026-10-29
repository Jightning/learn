import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';

test('content zoom keeps reading gutters and side notes inside the available column', async () => {
  const server = await serveDist(resolve('.'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 950 }, reducedMotion: 'reduce' });
    const files = {
      'course.json': JSON.stringify({ code: 'ZOOM', title: 'Content zoom' }),
      'sections/01-reading/_section.json': JSON.stringify({ title: 'Reading' }),
      'sections/01-reading/1-content.json': JSON.stringify({ title: 'Centered reading', blocks: [{
        t: 'def', term: 'Reading with side notes',
        core: 'A <n k="aside">reading column</n> should use the available space.',
        h: 'Magnified text stays readable beside the navigation and its supporting notes.',
        asides: { aside: 'This explanation belongs beside its passage, or below it when space is tight.' }
      }] })
    };
    await page.route('**/courses/demo.json', route => route.fulfill({ json: files }));
    await page.goto(server.origin + '/#/demo/s1-1');
    await page.locator('.mnote.is-a').waitFor();

    // Exercise the user's shortcut before testing the whole layout matrix.
    const sidebarWidth = await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().width);
    await page.keyboard.press('Control+Equal');
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--zoom') === '1.1');
    assert.equal(await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().width), sidebarWidth);
    await page.keyboard.press('Control+0');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.wrap')).zoom === '1');

    for (const width of [1920, 1600, 1440, 1296, 1280, 1100, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 950 });
      for (const tucked of [false, true]) {
        // The app uses a drawer on mobile, regardless of the desktop preference.
        await page.evaluate(tucked => document.querySelector('.shell').classList.toggle('tucked', tucked), tucked && width > 1024);
        for (const zoom of [0.8, 1, 1.1, 1.25, 1.6, 2]) {
          await page.evaluate(async zoom => {
            document.documentElement.style.setProperty('--zoom', zoom);
            // Zoom invalidates descendant lengths over the rendering frame.
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
          }, zoom);
          const bounds = await page.evaluate(() => {
            const row = document.querySelector('.mnote.is-a').closest('.brow');
            const rect = el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width };
            };
            const wrap = document.querySelector('.wrap');
            return {
              main: rect(document.querySelector('main')), wrap: rect(wrap),
              text: rect(row.querySelector('.bmain')), note: rect(row.querySelector('.mnote.is-a')),
              padding: parseFloat(getComputedStyle(wrap).paddingLeft),
              overflow: document.documentElement.scrollWidth > innerWidth + 1
            };
          });
          const context = JSON.stringify({ width, tucked, zoom, bounds });
          assert.equal(bounds.overflow, false, context);
          assert.ok(bounds.wrap.left >= bounds.main.left - 1 && bounds.wrap.right <= width + 1, context);
          assert.ok(bounds.text.left >= bounds.main.left + bounds.padding * zoom - 1, context);
          assert.ok(bounds.note.left >= bounds.text.left - 1 && bounds.note.right <= bounds.wrap.right + 1, context);
          const beside = bounds.note.left >= bounds.text.right;
          assert.ok(beside || bounds.note.top >= bounds.text.bottom - 1, context);

          if (width === 1600 && !tucked && [1, 1.1, 1.25].includes(zoom)) {
            assert.ok(Math.abs((bounds.text.left + bounds.text.right) / 2 - width / 2) < 2, context);
          }
          if (width === 1600 && !tucked && zoom >= 1.6) {
            assert.ok(Math.abs(bounds.wrap.left - bounds.main.left) < 1, context);
          }
          if (width === 1920 && zoom === 1) assert.ok(beside, context);
          if (width <= 390) assert.equal(beside, false, context);
        }
      }
    }

    await page.setViewportSize({ width: 390, height: 950 });
    const beforeDrawer = await page.locator('.wrap').boundingBox();
    await page.locator('.mobnav').click();
    await page.locator('.sidebar.open').waitFor();
    const withDrawer = await page.locator('.wrap').boundingBox();
    assert.equal(withDrawer.x, beforeDrawer.x);
    assert.equal(withDrawer.width, beforeDrawer.width);
  } finally { await browser.close(); server.close(); }
});
