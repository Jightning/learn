import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("ZIP bomb and oversized folder are refused by the import dialog", async () => {
  const temp = await mkdtemp(join(tmpdir(), "course-import-limit-"));
  const folder = join(temp, "course");
  await mkdir(folder);
  await writeFile(join(folder, "course.yaml"), "title: Test\n");
  await writeFile(join(folder, "big.txt"), Buffer.alloc(2 * 1024 * 1024 + 1));
  const server = await serveDist(ROOT);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(server.origin + "/");
    await page.locator("#lib-add").click();

    const zip = zipSync({ "course/course.yaml": new Uint8Array(2 * 1024 * 1024 + 1) });
    assert.ok(zip.length < 1024 * 1024);
    await page.locator('.modal .cio input[accept*="zip"]').setInputFiles({
      name: "course.zip", mimeType: "application/zip", buffer: Buffer.from(zip)
    });
    await page.locator(".modal .cio-msg.bad").waitFor();
    assert.match(await page.locator(".modal .cio-msg.bad").innerText(),
      /entry "course\/course.yaml" is larger than 2048KB/);

    await page.locator('.modal .cio input[data-folder]').setInputFiles(folder);
    await page.locator(".modal .cio-msg.bad").filter({ hasText: "course/big.txt" }).waitFor();
    assert.match(await page.locator(".modal .cio-msg.bad").innerText(),
      /entry "course\/big.txt" is larger than 2048KB/);
  } finally {
    await browser.close();
    server.close();
    await rm(temp, { recursive: true, force: true });
  }
});
