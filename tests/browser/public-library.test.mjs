import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serveDist } from '../helpers/browser-harness.mjs';

test('only DEMO starts on a fresh shelf and MVCALC can be added from the catalog', async () => {
  const server = await serveDist('.'), browser = await chromium.launch();
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(server.origin + '/#/');
    await page.locator('.lhit[href="#/demo"]').waitFor();
    assert.equal(await page.locator('.lhit').count(), 1);
    assert.equal(await page.locator('.lhit[href="#/mvcalc"]').count(), 0);
    await page.reload();
    await page.locator('.lhit[href="#/demo"]').waitFor();
    assert.equal(await page.locator('.lhit').count(), 1);
    await page.locator('#lib-add').click();
    await page.locator('.cio-catalog > summary').click();
    const mathematics = page.getByRole('region', { name: 'Mathematics', exact: true });
    await mathematics.getByText('Multivariable Calculus', { exact: true }).waitFor();
    await mathematics.getByRole('button', { name: 'Add', exact: true }).click();
    await page.locator('.lhit[href="#/mvcalc"]').waitFor();
    await page.waitForTimeout(550); // Shelf preferences use a 400 ms write debounce.
    await page.reload();
    await page.locator('.lhit[href="#/mvcalc"]').waitFor();
    assert.equal(await page.locator('.lhit').count(), 2);
    await page.locator('.lhit[href="#/mvcalc"]').click();
    await page.locator('.desk h1').filter({ hasText: 'Multivariable Calculus' }).waitFor();
    await page.reload();
    await page.locator('.desk h1').filter({ hasText: 'Multivariable Calculus' }).waitFor();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
