/* Consult an original diagram while a question draft stays mounted. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

const grid = { t: "figure", id: "map", kind: "grid", cap: "Labeled K-map layout", spec: {
  rowVars: ["A", "B"], colVars: ["C", "D"], rowLabels: ["00", "01", "11", "10"], colLabels: ["00", "01", "11", "10"],
  cells: [["1", "0", "0", "1"], ["0", "0", "0", "0"], ["0", "0", "0", "0"], ["1", "0", "0", "1"]],
  groups: [{ label: "B=0, D=0", cells: [[0, 0], [0, 3], [3, 0], [3, 3]] }]
} };
const fixture = {
  "course.json": JSON.stringify({ code: "DEMO", title: "Reference fixture", concepts: { adjacency: { term: "Adjacency", body: "Adjacent cells differ in one input bit." } } }),
  "sections/01-reference/_section.json": JSON.stringify({ title: "Reference tests" }),
  "sections/01-reference/1-layout.json": JSON.stringify({ title: "Layout", blocks: [grid,
    { t: "table", cap: "Select codes", head: ["Code", "Input"], rows: [["00", "I0"], ["01", "I1"]] },
    { t: "slides", cap: "Two states", frames: [{ title: "Before", text: "Input 0." }, { title: "After", text: "Input 1." }] }
  ], quiz: [
    { type: "first", q: "Explain the map.", response: { kind: "self", model: "Lesson-only solution" } },
    { type: "another", q: "Explain a second arrangement.", response: { kind: "self", model: "Another solution" } }
  ] }),
  "sections/01-reference/2-apply.json": JSON.stringify({ title: "Application", blocks: [
    { t: "p", h: 'Use <f k="map"/> and <c k="adjacency">adjacency</c> to inspect a new transition.' }
  ], quiz: [{ type: "second", q: "Explain a new transition.", response: { kind: "self", model: "Solution-only secret" } }] })
};
const root = resolve("."), shots = resolve(".scratch/reference-shots");
mkdirSync(shots, { recursive: true });
const server = await serveDist(root), browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.route("**/courses/demo.json", route => route.fulfill({ json: fixture }));
    await page.goto(server.origin + "/#/demo/s1-2");
    await page.evaluate(() => document.fonts.ready);
    const draft = page.locator('[id="s1-2-questions"] textarea');
    await draft.fill("Keep my reasoning while I consult a diagram");
    await page.evaluate(() => document.addEventListener("click", e => {
      // Playwright may scroll a sticky button a few pixels before activating it.
      if (e.target.closest('[aria-label="Open references"]')) window.referenceClickY = scrollY;
    }, true));
    await page.getByRole("button", { name: "Open references" }).click();
    const before = await page.evaluate(() => window.referenceClickY);
    const panel = page.getByRole("dialog", { name: "References" });
    await panel.waitFor();
    assert.ok(!(await panel.textContent()).includes("Solution-only secret"));
    const map = panel.locator("details").filter({ hasText: "Labeled K-map layout" });
    await map.locator("summary").click();
    await map.locator(".fx-gcell").first().waitFor();
    assert.equal(await map.locator(".fx-gcell").count(), 16);
    assert.equal(await map.locator(".fx-gcell.g0").count(), 4);
    assert.equal(await map.locator(".fx-gw").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length), 5);
    const bounds = await panel.boundingBox();
    assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= width + 1);
    await page.screenshot({ path: resolve(shots, `references-${width}.png`) });
    const search = panel.getByRole("searchbox");
    await search.fill("No such diagram");
    await panel.getByRole("status").waitFor();
    await search.fill("Two states");
    await panel.locator("summary").click();
    await panel.getByRole("button", { name: "Next slide" }).click();
    assert.ok((await panel.textContent()).includes("After"));
    await search.fill("Adjacency");
    await panel.locator("summary").click();
    await panel.getByText("Adjacent cells differ in one input bit.", { exact: true }).waitFor();
    assert.ok((await panel.textContent()).includes("one input bit"));
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "detached" });
    assert.equal(await draft.inputValue(), "Keep my reasoning while I consult a diagram");
    await page.waitForFunction(y => Math.abs(scrollY - y) < 2, before);
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) < 2,
      `reading offset moved: ${before} to ${await page.evaluate(() => scrollY)} at ${width}px`);
    assert.equal(await page.getByRole("button", { name: "Open references" }).evaluate(el => el === document.activeElement), true);
    const links = page.getByRole("navigation", { name: "Section questions" }).locator("a");
    assert.equal(await links.count(), 2);
    await links.first().click();
    const firstQuiz = page.locator('[id="s1-1-questions"]');
    assert.ok(await firstQuiz.locator(".q:visible textarea").evaluate(el => el === document.activeElement));
    await firstQuiz.getByRole("button", { name: "Next question", exact: true }).click();
    await links.last().click();
    await links.first().click();
    assert.ok(await firstQuiz.locator(".q:visible textarea").evaluate(el => el === document.activeElement));
    assert.equal(await draft.inputValue(), "Keep my reasoning while I consult a diagram");
    await page.getByRole("button", { name: "Open references" }).click();
    await panel.getByRole("searchbox").fill("Labeled K-map");
    await panel.locator("summary").click();
    await panel.getByRole("link", { name: "Open explanation" }).click();
    await panel.waitFor({ state: "detached" });
    assert.ok(page.url().endsWith("/s1-1~0"));
    assert.ok(await page.locator('[id="s1-1~0"] .fx-grid').isVisible());
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.close();
  }
  console.log("ok references and section questions: original map/slides/concept, draft/position/focus preservation, desktop/mobile");
} finally { await browser.close(); server.close(); }
