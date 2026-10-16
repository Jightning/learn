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
    assert.equal(await page.locator('.deadline-card .practice-stats strong').first().textContent(), '0 / 1');
    assert.match(await page.locator('.deadline-card .practice-stats').textContent(), /Estimated practice/);
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
