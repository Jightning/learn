import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

for (const width of [1440, 390]) test(`bank questions share lesson identity and respect practice scope at ${width}px`, async () => {
  const files = JSON.parse(readFileSync("tests/fixtures/question-bank/files.json", "utf8"));
  const server = await serveDist("."), browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/courses/demo.json", route => route.fulfill({ json: files }));
    await page.goto(`${server.origin}/#/demo/s1-1`);
    const lesson = page.locator('.quiz .q[data-qid="linear-1"]');
    await lesson.waitFor();
    assert.match(await lesson.locator(".qtext").innerText(), /2x/);
    await lesson.locator('input[type="number"]').fill("3");
    await lesson.getByRole("button", { name: /^Check answer/ }).click();
    await lesson.locator(".qresult").filter({ hasText: /^Correct$/ }).waitFor();
    await page.reload();
    await page.locator('.quiz .q[data-qid="linear-1"] .qresult').filter({ hasText: /^Correct$/ }).waitFor();
    await page.goto(`${server.origin}/#/demo/review/mixed`);
    await page.getByText("Choose subsections and set length", { exact: true }).click();
    await page.selectOption("#p-from", "s1-1");
    await page.selectOption("#p-to", "s1-1");
    assert.equal(await page.locator(".pinfo").innerText(), "2 available");
    await page.locator("#p-start").click();
    const narrow = page.locator("#p-run .q");
    await narrow.waitFor();
    assert.ok(["linear-1", "linear-2"].includes(await narrow.getAttribute("data-qid")));
    assert.equal(await page.locator('[data-qid="linear-check"], [data-qid="normalize-diagnostic"]').count(), 0);
    if (process.env.BANK_READER_SHOTS) {
      mkdirSync(process.env.BANK_READER_SHOTS, { recursive: true });
      await page.screenshot({ path: `${process.env.BANK_READER_SHOTS}/narrow-${width}.png`, fullPage: true });
    }
    // A new browser has no active session, so broad selection uses the default range.
    const broadPage = await browser.newPage({ viewport: { width, height: 950 } });
    await broadPage.route("**/courses/demo.json", route => route.fulfill({ json: files }));
    await broadPage.goto(`${server.origin}/#/demo/review/mixed`);
    await broadPage.getByText("Choose subsections and set length", { exact: true }).click();
    assert.equal(await broadPage.locator(".pinfo").innerText(), "4 available");
    await broadPage.locator("#p-start").click();
    await broadPage.locator("#p-run .q").waitFor();
    assert.equal(await broadPage.locator('[data-qid="linear-check"], [data-qid="branch-check"]').count(), 0);
    if (process.env.BANK_READER_SHOTS) await broadPage.screenshot({ path: `${process.env.BANK_READER_SHOTS}/broad-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
