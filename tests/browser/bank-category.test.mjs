import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";
test("bank category practice follows its teaching link and returns to the current card", async () => {
  const files = JSON.parse(readFileSync("tests/fixtures/question-bank/files.json", "utf8"));
  files["categories/methods.json"] = JSON.stringify({ name: "Methods", boundary: "Linear equation methods", note: "Subtract first, then divide." });
  const types = JSON.parse(files["questions/types.json"]);
  types.find(t => t.id === "linear").teach = ["methods", "s1-1"];
  files["questions/types.json"] = JSON.stringify(types);
  const bank = JSON.parse(files["questions/bank.json"]);
  const server = await serveDist("."), browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route("**/courses/demo.json", route => route.fulfill({ json: files }));
    await page.goto(`${server.origin}/#/demo/review/mixed/methods`);
    await page.getByText("Choose subsections and set length", { exact: true }).click();
    assert.equal(await page.locator(".pinfo").innerText(), "2 available");
    await page.locator("#p-start").click();
    const card = page.locator("#p-run .q");
    const id = await card.getAttribute("data-qid");
    await page.reload();
    await card.locator('input[type="number"]').fill(String(bank.find(q => q.id === id).response.value));
    await card.getByRole("button", { name: /^Check answer/ }).click();
    const help = card.getByRole("link", { name: "Review the relevant lesson" });
    await help.waitFor();
    assert.equal(await help.getAttribute("href"), "#/demo/cat/methods");
    await help.click();
    await page.locator(".catpractice").click();
    await page.locator("#p-run .q").waitFor();
    assert.equal(await page.locator("#p-run .q").getAttribute("data-qid"), id);
    assert.equal(await page.locator("#p-run .qresult").innerText(), "Correct");
    const rows = await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open("learn");
      request.onsuccess = () => {
        const db = request.result, read = db.transaction("log").objectStore("log").getAll();
        read.onsuccess = () => { db.close(); resolve(read.result); };
      };
    }));
    assert.ok(rows.find(row => row.event === "attempt" && row.itemId === id).timingFlags.includes("resumed"));
    await page.getByRole("button", { name: "Finish session", exact: true }).click();
    await page.getByRole("button", { name: "Another set", exact: true }).click();
    await page.locator("#p-start").click();
    assert.equal(await page.locator("#p-run .qresult").count(), 0);
    assert.equal(await page.locator('#p-run input[type="number"]').inputValue(), "");
  } finally { await browser.close(); server.close(); }
});
