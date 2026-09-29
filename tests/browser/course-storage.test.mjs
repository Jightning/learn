import test from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CID = "storage-check";
const files = {
  "course.yaml": "code: STORAGE 1\ntitle: Storage Check\n",
  "sections/01-start/_section.yaml": "title: Start\n",
  "sections/01-start/1-lesson.yaml": "title: Lesson\nblocks:\n  - t: p\n    h: Saved lesson\nquiz: []\n"
};

test("course import and removal report IndexedDB aborts and preserve the shelf", async () => {
  const server = await serveDist(ROOT);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const transaction = IDBDatabase.prototype.transaction;
      window.abortNextCourseWrite = false;
      IDBDatabase.prototype.transaction = function (names, mode, ...rest) {
        const tx = transaction.call(this, names, mode, ...rest);
        if (window.abortNextCourseWrite && mode === "readwrite" &&
            (names === "courses" || [...names].includes("courses"))) {
          window.abortNextCourseWrite = false;
          queueMicrotask(() => tx.abort());
        }
        return tx;
      };
    });
    await page.goto(server.origin + "/");
    const card = page.locator(`.lcard .lhit[href="#/${CID}"]`);
    const upload = async () => page.locator('.modal .cio input[accept*="zip"]').setInputFiles({
      name: `${CID}.course.json`, mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(files))
    });

    await page.locator("#lib-add").click();
    await page.evaluate(() => { window.abortNextCourseWrite = true; });
    await upload();
    await page.locator(".modal .cio-msg.bad").waitFor();
    assert.match(await page.locator(".modal .cio-msg.bad").innerText(), /Could not import this course/);
    await page.keyboard.press("Escape");
    assert.equal(await card.count(), 0);

    await page.locator("#lib-add").click();
    await upload();
    await page.locator(".modal .cio-msg:not(.bad)").waitFor();
    await page.keyboard.press("Escape");
    await card.waitFor();

    const remove = async () => {
      const row = page.locator(`.lcard:has(.lhit[href="#/${CID}"])`);
      if (await row.locator(".lmore").getAttribute("aria-expanded") !== "true")
        await row.locator(".lmore").click();
      await row.locator(".lop.warn").click();
      await page.locator("#lib-drop").click();
    };
    await page.evaluate(() => { window.abortNextCourseWrite = true; });
    await remove();
    await page.locator(".lib > .cio-msg.bad").waitFor();
    assert.match(await page.locator(".lib > .cio-msg.bad").innerText(), /Could not remove Storage Check/);
    assert.equal(await card.count(), 1);

    await remove();
    await page.locator(".lib > .cio-msg:not(.bad)").filter({ hasText: "Removed Storage Check" }).waitFor();
    assert.equal(await card.count(), 0);
    await page.reload();
    assert.equal(await card.count(), 0);
  } finally {
    await browser.close();
    server.close();
  }
});
