import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';

const files = {
  'course.yaml': 'code: SKILL\nstate: {enabled: true}\nconcepts: {c: {term: Arithmetic, body: Compute independently}}',
  'sections/01-one/1-lesson.yaml': 'title: Reasoning\nblocks: []\nquiz: [chain]',
  'categorize/objectives.yaml': '- {id: o, title: Solve, families: [f]}',
  'categorize/families.yaml': '- {id: f, title: Arithmetic, concept: c, teach: [s1-1]}',
  'questions/skills.json': JSON.stringify(['a', 'b'].map(id => ({ id, task: `Perform ${id}`, standard: `Independently perform ${id}`, family: 'f' }))),
  'questions/bank.json': JSON.stringify([
    { id: 'chain', skills: ['a', 'b'], q: 'Compute the two parts and their total.', response: { kind: 'number', value: 5 },
      steps: [{ id: 'first', skills: ['a'], q: 'What is one plus one?', response: { kind: 'number', value: 2 } },
        { id: 'second', skills: ['b'], q: 'What is one plus two?', response: { kind: 'number', value: 3 } }] },
    ...['a', 'b'].flatMap(skill => [1, 2].map(n => ({ id: `${skill}-${n}`, skills: [skill], group: `${skill}-${n}`,
      q: `Independent item ${skill}-${n}`, response: { kind: 'number', value: 2 } })))
  ]),
  'questions/assessment.json': JSON.stringify([{ scope: 'course', criteria: 'Independent arithmetic' }])
};
const rows = page => page.evaluate(() => new Promise(resolve => {
  const request = indexedDB.open('learn'); request.onsuccess = () => {
    const db = request.result, query = db.transaction('log').objectStore('log').getAll();
    query.onsuccess = () => { resolve(query.result); db.close(); };
  };
}));

test('new skill metadata reaches stepped questions, persistence, and honest goal planning', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 950 } });
    page.setDefaultTimeout(7000); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/courses/demo.json', route => route.fulfill({ json: files }));
    await page.goto(server.origin + '/#/demo/s1-1');
    for (const [id, answer] of [['first', '2'], ['second', '3']]) {
      const card = page.locator(`[data-qid="chain:step:${id}"]`);
      await card.locator('input[type=number]').fill(answer);
      await card.getByRole('button', { name: /^Check answer/ }).click();
      await card.getByRole('button', { name: /Continue/ }).click();
    }
    const final = page.locator('[data-qid=chain]');
    await final.locator('input[type=number]').fill('5');
    await final.getByRole('button', { name: /^Check answer/ }).click();
    await final.getByText('Correct', { exact: true }).waitFor();
    const events = (await rows(page)).filter(r => r.event === 'attempt');
    assert.equal(events.length, 3);
    assert.deepEqual(events.find(r => r.itemId === 'chain').skills, ['a', 'b']);
    assert.equal(events.find(r => r.itemId === 'chain').assisted, true);
    assert.equal(events.find(r => r.stepId === 'second').dependent, true);
    assert.equal(events.find(r => r.stepId === 'first').submittedResponse, '2');
    await page.reload();
    await page.locator('[data-qid=chain]').getByText('Correct', {exact:true}).waitFor();
    assert.equal((await rows(page)).filter(r => r.event === 'attempt').length, 3, 'reload does not duplicate step events');
    await page.goto(server.origin + '/#/demo/review/deadlines');
    await page.getByLabel('Minutes per day', { exact: true }).fill('1');
    await page.getByLabel('Session minutes', { exact: true }).fill('1');
    await page.getByRole('button', { name: 'Add goal', exact: true }).click();
    await page.getByRole('meter', { name: 'Supported requirements' }).waitFor();
    assert.equal(await page.getByRole('meter').getAttribute('aria-valuenow'), '0');
    await page.getByRole('button', { name: 'Readiness', exact: true }).click();
    const readiness = page.getByRole('dialog', { name: 'Readiness', exact: true });
    await readiness.getByRole('heading', { name: 'Next', exact: true }).waitFor();
    assert.ok(await readiness.getByText('diagnose', { exact: true }).count() > 0, 'unsupported skills retain a scheduled diagnostic action');
    assert.equal(await readiness.getByText('Needs evidence', { exact: true }).count(), 2, 'guided steps do not complete either skill standard');
    await readiness.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('link', { name: 'Mixed practice', exact: true }).click();
    await page.getByLabel('Challenge').selectOption('foundation');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Finish session', exact: true }).waitFor();
    const decision = (await rows(page)).find(r => r.event === 'policy-decision');
    assert.equal(decision.probability, 1);
    assert.ok(decision.eligibleActions.length > 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});

test('independent practice, assessment, and Learn-by agree after replay', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    await page.route('**/courses/demo.json', route => route.fulfill({ json: files }));
    await page.goto(server.origin + '/#/demo/review/mixed');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    const seen = new Set();
    for (let n = 0; n < 4; n++) {
      const card = page.locator('.q:visible');
      const id = await card.getAttribute('data-qid');
      assert.match(id, /^[ab]-[12]$/); assert.equal(seen.has(id), false); seen.add(id);
      await card.locator('input[type=number]').fill('2');
      await card.getByRole('button', { name: /^Check answer/ }).click();
      await card.getByRole('button', { name: /Continue/ }).click();
    }
    await page.getByRole('button', { name: 'Finish session', exact: true }).click();
    await page.getByRole('button', { name: 'Another set', exact: true }).click();
    await page.getByText('Readiness check', { exact: true }).click();
    await page.getByRole('button', { name: 'Confirm this standard applies to my goal', exact: true }).click();
    const check = page.locator('details').filter({ has: page.getByText('Readiness check', { exact: true }) });
    assert.match(await check.textContent(), /meets|supported/i);
    assert.equal(await check.getByRole('button', { name: 'Start fresh check' }).isDisabled(), true, 'adequate existing evidence avoids unnecessary checks');
    await page.goto(server.origin + '/#/demo/review/deadlines');
    await page.getByRole('button', { name: 'Add goal', exact: true }).click();
    assert.equal(await page.getByRole('meter').getAttribute('aria-valuenow'), '100');
    await page.reload();
    await page.getByRole('meter').waitFor();
    assert.equal(await page.getByRole('meter').getAttribute('aria-valuenow'), '100');
    const direct = (await rows(page)).filter(r => r.event === 'attempt' && /^[ab]-[12]$/.test(r.itemId));
    assert.equal(direct.length, 4); assert.ok(direct.every(r => r.firstUnaided && !r.assisted));
  } finally { await browser.close(); server.close(); }
});
