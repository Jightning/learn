import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';

const files = {
  'course.yaml': 'code: GOAL\\nstate: {enabled: true}\\nconcepts: {c: {term: Arithmetic, body: Compute}}'.replaceAll('\\n', '\n'),
  'sections/01-one/1-first.yaml': 'title: First\nblocks: []\nquiz: [first]',
  'sections/01-one/2-second.yaml': 'title: Second\nblocks: []\nquiz: [second]',
  'categorize/objectives.yaml': '- {id: o, title: Solve}',
  'categorize/families.yaml': '- {id: f, title: Arithmetic}',
  'questions/types.json': JSON.stringify([
    { id: 'first-type', task: 'First skill', concept: 'c', objectives: ['o'], families: ['f'] },
    { id: 'second-type', task: 'Second skill', concept: 'c', objectives: ['o'], families: ['f'] }
  ]),
  'questions/bank.json': JSON.stringify([
    { id: 'first', typeId: 'first-type', q: 'What is one plus one?', why: 'Two.', response: { kind: 'number', value: 2 } },
    { id: 'second', typeId: 'second-type', q: 'What is two plus two?', why: 'Four.', response: { kind: 'number', value: 4 } },
    { id: 'second-alt', typeId: 'second-type', q: 'What is three plus three?', why: 'Six.', response: { kind: 'number', value: 6 } }
  ]),
  'questions/assessment.json': JSON.stringify([{ scope: 'course', criteria: 'Solve independently.' }])
};

test('a saved learn-by goal introduces untouched scoped material in Review and Mixed Practice', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/courses/demo.json', route => route.fulfill({ json: files }));
    await page.goto(server.origin + '/#/demo/review/deadlines');
    await page.getByRole('heading', { name: 'Add a learn-by goal' }).waitFor();
    await page.getByLabel('From').selectOption('s1-2');
    await page.getByLabel('Through').selectOption('s1-2');
    await page.getByLabel('Name').fill('Sunday objectives');
    await page.getByRole('button', { name: 'Add goal' }).click();
    await page.getByText('Sunday objectives', { exact: true }).waitFor();
    assert.match(await page.locator('.deadline-card .deadline-brief').textContent(), /0\/1 skills/);
    assert.match(await page.locator('.deadline-card .deadline-brief').textContent(), /Time unset/);
    assert.equal(await page.getByRole('dialog', { name: 'Sunday objectives' }).count(), 0);
    await page.locator('.deadline-card').getByRole('button', { name: 'Readiness' }).click();
    const readiness = page.getByRole('dialog', { name: 'Sunday objectives' });
    await readiness.getByText('Skills supported').waitFor();
    assert.match(await readiness.textContent(), /0 \/ 1/);
    await page.setViewportSize({ width: 390, height: 720 });
    assert.ok(await readiness.evaluate(el => { const box = el.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; }));
    await page.keyboard.press('Escape');
    assert.equal(await readiness.count(), 0);
    assert.doesNotMatch(await page.locator('.deadline-card time').textContent(), /\d{1,2}:\d{2}:\d{2}/, 'deadline omits seconds');
    assert.doesNotMatch(await page.locator('.deadlines-page').textContent(), /types ready|cover current gaps|Focus gives|Set when you| · /);

    await page.getByRole('link', { name: 'Due now' }).click();
    await page.locator('.q[data-qid=second], .q[data-qid=second-alt]').waitFor();
    assert.equal(await page.locator('.q[data-qid=first]').count(), 0);
    const reviewCard = page.locator('.q:visible');
    const reviewId = await reviewCard.getAttribute('data-qid');
    await reviewCard.locator('input[type=number]').fill(reviewId === 'second' ? '4' : '6');
    await reviewCard.getByRole('button', { name: /^Check answer/ }).click();
    await reviewCard.locator('.qresult').filter({ hasText: 'Correct' }).waitFor();
    const reviewRows = await page.evaluate(() => new Promise(resolve => {
      const open = indexedDB.open('learn'); open.onsuccess = () => {
        const request = open.result.transaction('log').objectStore('log').getAll();
        request.onsuccess = () => resolve(request.result);
      };
    }));
    assert.equal(reviewRows.find(r => r.event === 'attempt' && r.itemId === reviewId)?.methodCued, false);
    await page.getByRole('link', { name: 'Mixed practice' }).click();
    await page.getByRole('checkbox', { name: 'Focus on deadlines' }).waitFor();
    const settings = page.getByRole('group', { name: 'Practice settings' });
    assert.equal(await settings.getByRole('checkbox', { name: 'Focus on deadlines' }).isChecked(), true);
    assert.equal(await settings.getByText('Goals', { exact: true }).count(), 1);
    const cardBox = await settings.boundingBox();
    const linkBox = await page.getByRole('link', { name: 'View readiness', exact: true }).boundingBox();
    assert.ok(linkBox.y >= cardBox.y + cardBox.height, 'readiness link sits below the settings card');
    assert.equal(await page.locator('#p-start').textContent(), 'Start');
    assert.equal(await page.getByText('Readiness check', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.locator('.q[data-qid=second], .q[data-qid=second-alt]').waitFor();
    assert.match(await page.locator('.q:visible').textContent(), /What is (two plus two|three plus three)\?/);
    await page.reload();
    await page.getByRole('button', { name: 'Finish session' }).click();
    await page.getByRole('link', { name: 'Learn by' }).click();
    await page.getByText('Sunday objectives', { exact: true }).waitFor();
    await page.getByLabel('From').selectOption('s1-1');
    await page.getByLabel('Through').selectOption('s1-1');
    await page.getByLabel('Name').fill('Later checkpoint');
    await page.getByLabel('Intensity').selectOption('checkpoint');
    await page.getByRole('button', { name: 'Add goal' }).click();
    await page.locator('.deadline-card').nth(1).waitFor();
    assert.equal(await page.locator('.deadline-card').count(), 2);
    await page.locator('.deadline-card').filter({ hasText: 'Sunday objectives' }).getByRole('button', { name: 'Remove' }).click();
    await page.locator('.deadline-card').filter({ hasText: 'Later checkpoint' }).getByRole('button', { name: 'Remove' }).click();
    await page.getByText('No learn-by goals yet.').waitFor();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});


test('readiness stays inside viewport gutters and scrolls to its actions at narrow, short and zoomed sizes', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    const types = Array.from({ length: 24 }, (_, i) => ({ id: `skill-${i}`, task: `Skill ${i}: ${'longlabel'.repeat(12)}`, concept: 'c', scope: ['course'], objectives: ['o'], families: ['f'] }));
    const expanded = { ...files,
      'questions/types.json': JSON.stringify([...JSON.parse(files['questions/types.json']), ...types]),
      'questions/bank.json': JSON.stringify([...JSON.parse(files['questions/bank.json']), ...types.map(t => ({ id: t.id, typeId: t.id, q: 'Compute.', response: { kind: 'number', value: 1 } }))]) };
    await page.route('**/courses/demo.json', r => r.fulfill({ json: expanded }));
    await page.goto(server.origin + '/#/demo/review/deadlines');
    await page.getByRole('heading', { name: 'Add a learn-by goal' }).waitFor();
    await page.getByLabel('Name').fill('Readiness viewport test');
    await page.getByRole('button', { name: 'Add goal' }).click();
    await page.locator('.deadline-card').getByRole('button', { name: 'Readiness' }).click();
    const dialog = page.getByRole('dialog', { name: 'Readiness viewport test' });
    for (const [width, height, zoom] of [[320,480,1], [390,720,1], [844,390,1], [1440,900,1.5], [320,480,2]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(z => document.documentElement.style.setProperty('--zoom', z), zoom);
      const bounds = await dialog.evaluate(el => {
        const r = el.getBoundingClientRect(), body = el.querySelector('.modal-body');
        return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, overflow:body.scrollWidth-body.clientWidth, scrollable:body.scrollHeight>body.clientHeight };
      });
      assert.ok(bounds.left >= 11 && bounds.right <= width-11 && bounds.top >= 11 && bounds.bottom <= height-11, JSON.stringify({ width, height, zoom, bounds }));
      assert.ok(bounds.overflow <= 1, 'long skills wrap without horizontal clipping');
      assert.ok(bounds.scrollable, 'long readiness content scrolls');
      await dialog.locator('.modal-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
      assert.ok(await dialog.getByRole('link', { name: 'Practice', exact: true }).evaluate(el => { const r=el.getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight; }));
      assert.ok(await dialog.getByRole('button', { name: 'Close', exact: true }).isVisible());
    }
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await dialog.count(), 0);
  } finally { await browser.close(); server.close(); }
});

test('utility pages center their content and keep practice controls visible at desktop and phone widths', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    await page.route('**/courses/demo.json', route => route.fulfill({ json: files }));
    for (const width of [1440, 1100, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(server.origin + '/#/demo/review/mixed');
      await page.getByRole('group', { name: 'Practice settings' }).waitFor();
      for (const label of ['From', 'Through', 'Questions', 'Method'])
        await page.getByLabel(label).waitFor({ state: 'visible' });
      const layout = await page.evaluate(() => {
        const wrap = document.querySelector('#content').getBoundingClientRect();
        const main = document.querySelector('main').getBoundingClientRect();
        const select = getComputedStyle(document.querySelector('.practice-settings select'));
        return { center: (wrap.left + wrap.right - main.left - main.right) / 2,
          overflow: document.documentElement.scrollWidth - innerWidth,
          arrow: select.backgroundPosition, padding: parseFloat(select.paddingRight) };
      });
      assert.ok(Math.abs(layout.center) < 2, `${width}px content centered: ${layout.center}`);
      assert.ok(layout.overflow <= 1, `${width}px no horizontal overflow`);
      assert.ok(layout.padding >= 32 && layout.arrow.includes('10px'), 'chevron has dedicated inset');
      await page.getByLabel('Questions').selectOption('5');
      await page.getByLabel('Method').selectOption('weighted');
      await page.waitForTimeout(550); // Policy writes use a 400 ms debounce.
      await page.reload();
      assert.equal(await page.getByLabel('Method').inputValue(), 'weighted');
      if (width > 1024) {
        const alignment = await page.locator('.navtop a').evaluateAll(links => links.map(link => {
          const icon = link.querySelector('svg'), a = icon.getBoundingClientRect(), b = link.getBoundingClientRect();
          return { delta: Math.abs((a.top + a.bottom - b.top - b.bottom) / 2), view: icon.getAttribute('viewBox'), width: a.width, opacity: Number(getComputedStyle(icon).opacity) };
        }));
        assert.ok(alignment.every(icon => icon.delta < 1 && icon.view === '0 0 24 24' && icon.width === 16 && icon.opacity <= .8), 'Material icons centered in sidebar rows');
        await page.getByRole('button', { name: 'Hide the section list' }).click();
        for (const route of ['review/mixed', 'review/deadlines', '', 'map', 'explore', 'saved']) {
          await page.goto(server.origin + '/#/demo/' + route);
          await page.locator('#content .viewport > *').waitFor();
          const delta = await page.locator('#content').evaluate(el => {
            const a = el.getBoundingClientRect(); return (a.left + a.right) / 2 - innerWidth / 2;
          });
          assert.ok(Math.abs(delta) < 2, `tucked ${route} centered: ${delta}`);
        }
        await page.getByRole('button', { name: 'Show the section list' }).click();
      }
    }
  } finally { await browser.close(); server.close(); }
});

test('Review keeps a compact toolbar gap and a short practice question visible on laptops and phones', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    await page.route('**/courses/demo.json', route => route.fulfill({ json: files }));
    for (const [width, height] of [[1366,768], [1280,720], [390,844], [320,568]]) {
      await page.setViewportSize({ width, height });
      await page.goto(server.origin + '/#/demo/review/mixed');
      await page.getByRole('button', { name: 'Start', exact: true }).waitFor();
      const layout = await page.locator('.review').evaluate(el => {
        const toolbar = document.querySelector('.topbar').getBoundingClientRect();
        const header = el.querySelector('.review-head').getBoundingClientRect();
        return { gap:header.top-toolbar.bottom, overflow:document.documentElement.scrollWidth-innerWidth };
      });
      assert.ok(layout.gap >= 12 && layout.gap <= 24, `${width}px compact gap: ${layout.gap}`);
      assert.ok(layout.overflow <= 1, `${width}px no horizontal overflow`);
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      const card = page.locator('.q:visible'); await card.waitFor();
      if (width >= 1280) {
        assert.ok(await card.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), `${width}px short question fits without scrolling`);
        assert.equal(await page.evaluate(() => scrollY), 0);
      }
      await page.getByRole('button', { name: 'Finish session' }).click();
      await page.getByRole('button', { name: 'Another set' }).click();
    }
  } finally { await browser.close(); server.close(); }
});
