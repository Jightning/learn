import test from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("an imported course cannot run authored handlers or plot code", async () => {
  const server = await serveDist(ROOT);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(server.origin + "/");
    await page.locator("#lib-add").click();
    const files = {
      "course.yaml": 'code: SEC\ntitle: "<strong>Safe</strong> course"\nstyles: "body{display:none}"\n',
      "sections/01-start/_section.yaml": "title: Safety\n",
      "sections/01-start/1-import.yaml": [
        "title: Imported content",
        "blocks:",
        "  - t: p",
        "    h: '<img src=x onerror=\"window.__courseHandler = true\"><strong>Formatted</strong> <m>x^2</m> <a href=\"javascript:alert(1)\">unsafe link</a>'",
        "  - t: figure",
        "    kind: plot",
        "    cap: Malicious expression",
        "    spec:",
        "      series:",
        "        - label: attack",
        "          fn: '(window.__coursePlot = true, x)'",
        "quiz: []",
        ""
      ].join("\n")
    };
    await page.locator('.modal .cio input[accept*="zip"]').setInputFiles({
      name: "security-fixture.course.json", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(files))
    });
    await page.locator(".modal .cio-msg:not(.bad)").waitFor();
    await page.keyboard.press("Escape");
    await page.goto(server.origin + "/#/security-fixture/s1-1");
    await page.locator("#s1-1 .bhtml").first().waitFor();
    assert.equal(await page.evaluate(() => window.__courseHandler), undefined);
    assert.equal(await page.evaluate(() => window.__coursePlot), undefined);
    assert.equal(await page.locator("#s1-1 [onerror]").count(), 0);
    assert.equal(await page.locator('#s1-1 a[href^="javascript:"]').count(), 0);
    assert.equal(await page.locator("#s1-1 strong").filter({ hasText: "Formatted" }).count(), 1);
    assert.ok(await page.locator("#s1-1 .katex").count() > 0);
    assert.equal(await page.locator("#s1-1 .fx-s").count(), 0);
    assert.equal(await page.locator('style[id^="cs-"]').count(), 0);
    await page.goto(server.origin + "/#/demo/s3-1");
    await page.locator(".bhtml").first().waitFor();
    const safeStyle = await page.locator(".bhtml").first().evaluate(parent => {
      const probe = document.createElement("div");
      probe.className = "metric";
      parent.appendChild(probe);
      const display = getComputedStyle(probe).display;
      probe.remove();
      return display;
    });
    assert.equal(safeStyle, "flex");
  } finally {
    await browser.close();
    server.close();
  }
});
