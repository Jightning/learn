import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';

const filesFor = count => Object.fromEntries([
  ['course.yaml', 'code: MAP\ntitle: Dependency map fixture'],
  ...Array.from({ length: count }, (_, i) => [
    `sections/${String(i + 1).padStart(3, '0')}-section/1-lesson.yaml`,
    `title: Lesson ${i + 1}\nblocks: []`
  ])
]);

for (const count of [5, 160]) test(`${count}-node dependency map remains reachable on desktop and phone`, async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      page.setDefaultTimeout(7000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route('**/courses/demo.json', route => route.fulfill({ json: filesFor(count) }));
      await page.goto(server.origin + '/#/demo/map');
      const scroll = page.locator('.mapwrap .figure-scroll');
      await scroll.waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.mapwrap [data-node]').count(), count);
      const sizes = await scroll.evaluate(el => ({
        height: el.clientHeight, vertical: el.scrollHeight - el.clientHeight,
        horizontal: el.scrollWidth - el.clientWidth,
        pageOverflow: document.documentElement.scrollWidth - innerWidth
      }));
      // Desktop may fit the graph; the phone must exercise horizontal scrolling.
      if (width === 390) assert.ok(sizes.horizontal > 0, `${width}px: wide graph has horizontal overflow`);
      assert.ok(sizes.pageOverflow <= 1, `${width}px: overflow stays inside the map`);
      assert.equal(await scroll.getAttribute('tabindex'),
        sizes.horizontal > 2 || sizes.vertical > 2 ? '0' : '-1',
        'only overflowing scroll regions enter the keyboard tab order');
      if (count === 160) {
        assert.ok(sizes.vertical > 0, 'very tall map has vertical overflow');
        assert.ok(sizes.height <= 900 * .8 + 1, 'tall map stays within viewport height limit');
      } else {
        assert.ok(sizes.height > 0 && sizes.vertical <= 1, 'small map fits its full height');
      }
      const last = page.locator(`.mapwrap [data-node="s${count}"]`);
      await last.scrollIntoViewIfNeeded();
      const bounds = await last.evaluate(node => {
        const a = node.getBoundingClientRect(), b = node.closest('.figure-scroll').getBoundingClientRect();
        return { inside: a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom };
      });
      assert.equal(bounds.inside, true, `${width}px: final node can be fully revealed`);
      await last.click();
      await page.waitForURL(`**/#/demo/s${count}`);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
});
