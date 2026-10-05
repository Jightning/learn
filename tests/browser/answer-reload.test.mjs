import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as YAML from 'js-yaml';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';

test('lesson answers and math fields survive reload without another rating', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    const files = JSON.parse(readFileSync('dist/courses/demo.json', 'utf8'));
    const key = Object.keys(files).find(k => /sections\/01-[^/]+\/1-.*yaml$/.test(k));
    const unit = YAML.load(files[key]), concept = unit.quiz[0].concept;
    unit.quiz = [
      { type: 'Choice', concept, q: 'Choose two.', response: { kind: 'single', choices: [{text:'One', why:'No'}, {text:'Two', why:'Yes'}], correct: 2 } },
      { type: 'Formula', concept, q: 'Enter x squared.', response: {kind:'formula', answer:'x^2', variables:['x']} },
      { type: 'Self', concept, q: 'Explain with math.', response: {kind:'self', model:'e^x', formulaParsing:true} }
    ];
    files[key] = YAML.dump(unit);
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/courses/demo.json', route => route.fulfill({json:files}));
    await page.goto(server.origin + '/#/demo/s1-1');
    const quiz = page.getByRole('region', {name:'1.1 questions', exact:true});
    const card = quiz.locator('.q:visible');
    const next = () => quiz.getByRole('button', {name:'Next question', exact:true}).click();
    const enter = async source => {
      await card.locator('math-field').waitFor();
      await card.locator('math-field').evaluate((field, value) => {
        field.setValue(value, {format:'ascii-math'});
        field.dispatchEvent(new Event('input', {bubbles:true}));
      }, source);
    };
    await card.getByRole('radio').nth(1).check();
    await card.getByRole('button', {name:'Check answer', exact:true}).click();
    await next();
    await enter('x^2');
    await card.getByRole('button', {name:'Check answer', exact:true}).click();
    await card.locator('.qresult').waitFor();
    await next();
    await enter('e^x');
    await card.getByRole('button', {name:'Check answer', exact:true}).click();
    // An unrated self-check restores its comparison stage, too.
    await card.locator('.qresult').waitFor();
    await page.reload();
    await card.locator('.qresult').waitFor();
    assert.equal(await card.getByRole('radio').nth(1).isChecked(), true);
    assert.equal(await quiz.locator('.qstat').innerText(), '2 answered');
    await next();
    await card.locator('math-field').waitFor();
    assert.equal(await card.locator('math-field').evaluate(field => field.getValue('ascii-math')), 'x^2');
    assert.equal(await card.locator('math-field').evaluate(field => field.readOnly), true);
    assert.equal(await card.locator('.qresult').innerText(), 'Correct');
    await next();
    await card.getByRole('button', {name:'Correct', exact:true}).click();
    await card.getByRole('button', {name:'Continue →', exact:true}).waitFor();
    await page.reload();
    await card.locator('.qresult').waitFor();
    assert.equal(await quiz.locator('.qstat').innerText(), '3 answered');
    assert.equal(await page.getByText('Math input could not load.', {exact:false}).count(), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
