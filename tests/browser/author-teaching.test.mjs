/* Synthetic teaching examples exercise the real reader, not a preview renderer. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { courseFiles } from "../../tools/lib/files.mjs";
import { serveDist } from "../helpers/browser-harness.mjs";

const root = resolve("."), shots = resolve(".scratch/author-teaching-shots");
mkdirSync(shots, { recursive: true });
const files = courseFiles(resolve("tests/fixtures/author-teaching"), message => { throw new Error(message); });
const server = await serveDist(root), browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.route("**/courses/demo.json", route => route.fulfill({ json: files }));
    await page.goto(server.origin + "/#/demo/s1-1");
    await page.locator('[id="s1-1~1"] .bhtml').waitFor();
    const dilution = await page.locator('[id="s1-1~1"] .bhtml').textContent();
    assert.ok(dilution.includes("2,000"));
    assert.ok(dilution.includes("500"));
    assert.equal(await page.locator(".fx-miss").count(), 0);
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(shots, `dilution-${width}.png`) });
    await page.goto(server.origin + "/#/demo/s2-1");
    await page.locator(".tbl").waitFor();
    assert.equal(await page.locator(".tbl tbody tr").count(), 4);
    const gist = "Measure the gap, choose an action, then measure again to check its effect.";
    assert.ok(!(await page.locator('[id="s2-1~2"] .bhtml').textContent()).includes(gist));
    assert.ok(await page.locator(".mnote.is-a").count());
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(shots, `feedback-${width}.png`) });
    if (width < 600) await page.locator(".modesw-cycle:visible").click();
    else await page.locator(".modesw-b:visible", { hasText: "Review" }).click();
    assert.ok((await page.locator('[id="s2-1~2"]').textContent()).includes(gist));
    if (width < 600) {
      await page.locator(".modesw-cycle:visible").click();
      await page.locator(".modesw-cycle:visible").click();
    } else await page.locator(".modesw-b:visible", { hasText: "Study" }).click();
    await page.goto(server.origin + "/#/demo/s3-1");
    await page.locator('[id="s3-1~1"] .bhtml').waitFor();
    assert.ok((await page.locator('[id="s3-1~1"] .bhtml').textContent()).includes("Self-selection"));
    assert.equal(await page.locator(".fx-miss").count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("ok author-teaching real reader: 3 lessons, desktop/mobile, full/Notes, table and local clarification");
} finally { await browser.close(); server.close(); }
