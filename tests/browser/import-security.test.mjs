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
    await page.locator('.lcard .lhit[href="#/security-fixture"]').waitFor();
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
    // Own the allowed CSS fixture so demo presentation changes cannot break this check.
    await page.route("**/courses/demo.json", route => route.fulfill({ json: {
      "course.yaml": 'code: SAFE\ntitle: Safe styles\nstyleClasses: [security-safe]\nstyles: ".security-safe{display:flex}"\n',
      "sections/01-safe/1-styles.yaml": 'title: Safe styles\nblocks:\n  - t: p\n    h: Safe styling fixture\n'
    } }));
    await page.goto(server.origin + "/#/demo/s1-1");
    await page.locator(".bhtml").first().waitFor();
    const safeStyle = await page.locator(".bhtml").first().evaluate(parent => {
      const probe = document.createElement("div");
      probe.className = "security-safe";
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

for (const width of [1440, 390]) test(`sanitized grid figures retain their columns at ${width}px`, async () => {
  const server = await serveDist(ROOT), browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const files = {
      "course.yaml": "code: GRID\ntitle: Grid layout\n",
      "sections/01-map/_section.yaml": "title: Maps\n",
      "sections/01-map/1-grid.yaml": [
        "title: Four-variable map", "blocks:",
        "  - t: figure", "    kind: grid", "    cap: Four-variable map", "    spec:",
        "      rowVars: [A, B]", "      colVars: [C, D]",
        '      rowLabels: ["00", "01", "11", "10"]',
        '      colLabels: ["00", "01", "11", "10"]',
        '      cells: [["1", "0", "0", "1"], ["0", "0", "0", "0"], ["0", "0", "0", "0"], ["1", "X", "1", "1"]]',
        "  - t: p",
        `    h: '<div class="bad-grid" style="grid-template-columns:repeat(999,auto);position:fixed;background:url(https://example.test/track)">Unsafe style</div><div class="wide-grid" style="grid-template-columns:repeat(65,auto)">Bounded style</div><div class="dynamic-grid" style="grid-template-columns:repeat(auto-fill,minmax(1px,1fr))">Dynamic style</div>'`,
        "quiz: []"
      ].join("\n")
    };
    await page.route("**/courses/demo.json", route => route.fulfill({ json: files }));
    await page.goto(`${server.origin}/#/demo/s1-1`);
    await page.locator(".fx-gcell").first().waitFor();
    const layout = await page.locator(".fx-gw").evaluate(el => ({
      columns: getComputedStyle(el).gridTemplateColumns.split(" ").length,
      cells: [...el.querySelectorAll(".fx-gcell")].map(cell => {
        const rect = cell.getBoundingClientRect();
        return { x: rect.x, y: rect.y };
      })
    }));
    assert.equal(layout.columns, 5);
    assert.equal(layout.cells.length, 16);
    assert.equal(layout.cells[0].y, layout.cells[3].y);
    assert.ok(layout.cells[3].x > layout.cells[0].x);
    assert.ok(layout.cells[4].y > layout.cells[0].y);
    assert.equal(await page.locator(".bad-grid").getAttribute("style"), null);
    assert.equal(await page.locator(".dynamic-grid").getAttribute("style"), null);
    assert.match(await page.locator(".wide-grid").getAttribute("style"), /repeat\(65,\s*auto\)/);
  } finally { await browser.close(); server.close(); }
});
