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

test("folder, ZIP, and JSON imports retain lessons and assets without storing sources", async () => {
  const temp = await mkdtemp(join(tmpdir(), "course-import-sources-"));
  const files = {
    "course.json": JSON.stringify({ code: "SOURCES", title: "Source-free import" }),
    "sections/01-test/_section.json": JSON.stringify({ title: "Test" }),
    "sections/01-test/1-check.json": JSON.stringify({
      title: "Imported lesson", blocks: [{ t: "p", h: "<p>Lesson survived</p>" }], quiz: []
    }),
    "assets/dot.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
  };
  const folder = join(temp, "source-test");
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(folder, path)), { recursive: true });
    await writeFile(join(folder, path), text);
  }
  await mkdir(join(folder, "sources"));
  await writeFile(join(folder, "sources/book.pdf"), Buffer.alloc(9 * 1024 * 1024));
  await writeFile(join(folder, "sources/extracted.txt"), "Source text");
  const server = await serveDist(ROOT);
  const browser = await chromium.launch();
  try {
    for (const mode of ["folder", "zip", "json"]) {
      const page = await browser.newPage();
      await page.goto(server.origin + "/");
      await page.locator("#lib-add").click();
      if (mode === "folder") {
        await page.locator('.modal .cio input[data-folder]').setInputFiles(folder);
      } else {
        const entries = {
          ...files, "sources/book.pdf": "x".repeat(3 * 1024 * 1024),
          "sources/extracted.txt": "Source text",
          "assets/dot.svg": `data:image/svg+xml;base64,${Buffer.from(files["assets/dot.svg"]).toString("base64")}`
        };
        const buffer = mode === "json" ? Buffer.from(JSON.stringify(entries)) : Buffer.from(zipSync({
          ...Object.fromEntries(Object.entries(files).map(([p, text]) => [`source-test/${p}`, Buffer.from(text)])),
          "source-test/sources/book.pdf": new Uint8Array(9 * 1024 * 1024),
          "source-test/sources/extracted.txt": Buffer.from("Source text")
        }, { level: 0 }));
        await page.locator('.modal .cio input[accept*="zip"]').setInputFiles({
          name: `source-test.${mode === "json" ? "course.json" : "zip"}`,
          mimeType: mode === "json" ? "application/json" : "application/zip", buffer
        });
      }
      await page.locator('.lcard .lhit[href="#/source-test"]').waitFor();
      const stored = await page.evaluate(() => new Promise((resolve, reject) => {
        const open = indexedDB.open("learn");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction("courses").objectStore("courses").get("source-test");
          request.onsuccess = () => { resolve(request.result.files); db.close(); };
          request.onerror = () => { reject(request.error); db.close(); };
        };
      }));
      assert.deepEqual(Object.keys(stored).sort(), Object.keys(files).sort(), mode);
      assert.match(stored["assets/dot.svg"], /^data:image\/svg\+xml;base64,/);
      await page.goto(server.origin + "/#/source-test/s1-1");
      await page.getByText("Lesson survived", { exact: true }).waitFor();
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
    await rm(temp, { recursive: true, force: true });
  }
});
