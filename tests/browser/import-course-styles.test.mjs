import test from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const REMOTE = "https://style-probe.invalid";

function fixture(id, meta) {
  const files = {
    "course.json": JSON.stringify({ code: id.toUpperCase(), title: id, ...meta }),
    "sections/01-style/_section.json": JSON.stringify({ title: "Style test" }),
    "sections/01-style/1-check.json": JSON.stringify({
      title: `Content ${id}`,
      blocks: [
        { t: "p", h: "<p>Imported course text</p>" },
        { t: "table", mono: true, head: ["Value"], rows: [["1"]] }
      ], quiz: []
    })
  };
  return { name: `${id}.course.json`, mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(files)) };
}

test("imported CSS cannot hide app controls or load a remote URL", async () => {
  const server = await serveDist(ROOT);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const remoteRequests = [];
    await page.route(`${REMOTE}/**`, route => {
      remoteRequests.push(route.request().url());
      return route.abort();
    });
    await page.goto(server.origin + "/");
    await page.locator("#lib-add").click();
    await page.locator('.modal .cio input[accept*="zip"]').setInputFiles([
      fixture("style-global", { styles: "body{display:none}" }),
      fixture("style-control", { styleClasses: ["topbar"], styles: ".topbar{opacity:0}" }),
      fixture("style-url", { valueStyles: { "1": "v1" },
        styles: `.v1{background-color:var(--hi);background:url(${REMOTE}/asset)}` }),
      fixture("style-import", { valueStyles: { "1": "v1" },
        styles: `@import url(${REMOTE}/import.css);.v1{color:var(--hi-ink)}` }),
      fixture("style-value", { valueStyles: { "1": "v1" },
        styles: ".v1{color:var(--hi-ink);font-weight:700}" })
    ]);
    await page.locator('.lcard .lhit[href="#/style-value"]').waitFor();
    await page.keyboard.press("Escape");

    let controlRule = "";
    for (const id of ["style-global", "style-control", "style-url", "style-import", "style-value"]) {
      await page.goto(`${server.origin}/#/${id}/s1-1`);
      await page.locator("#s1-1 h3").filter({ hasText: id }).waitFor();
      await page.locator("#s1-1 .bhtml").first().waitFor();
      await page.waitForTimeout(100);
      assert.equal(await page.locator(".topbar").evaluate(el => getComputedStyle(el).opacity), "1", id);
      assert.notEqual(await page.locator("body").evaluate(el => getComputedStyle(el).display), "none", id);
      if (["style-global", "style-url", "style-import"].includes(id)) {
        const style = page.locator(`#cs-${id}`);
        const count = await style.count();
        assert.equal(count, 0, `${id} stylesheet rejected: ${count ? await style.textContent() : "none"}`);
      }
      if (id === "style-control") controlRule = await page.locator("#cs-style-control").textContent();
    }

    assert.match(controlRule, /\.shell:not\(\.solo\) \.bhtml \.topbar\{opacity:0\}/);
    await page.goto(`${server.origin}/#/style-value/s1-1`);
    await page.locator("#s1-1 .v1").first().waitFor();
    assert.equal(await page.locator("#s1-1 .v1").first().evaluate(el => getComputedStyle(el).fontWeight), "700");
    assert.deepEqual(remoteRequests, []);
  } finally {
    await browser.close();
    server.close();
  }
});
