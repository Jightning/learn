import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

test("slide endpoints retain arrow navigation and optional passages stay reachable without lanes", async () => {
  const server = await serveDist(process.cwd());
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const fixture = {
    "course.json": JSON.stringify({ code: "DEMO", title: "Reader controls" }),
    "sections/01-test/_section.json": JSON.stringify({ title: "Reader controls" }),
    "sections/01-test/1-test.json": JSON.stringify({ title: "A complete reading", blocks: [
      { t: "def", term: "Required definition", core: "The main path is complete." },
      { t: "ex", tier: "apply", title: "Required application", h: "<p>Worked applications remain visible.</p>" },
      { t: "note", optional: true, follows: true, label: "Optional rationale", h: "<p>Extra context remains available.</p>" },
      { t: "key", core: "A required relation.", h: "<p>The explanation develops the relation.</p>" },
      { t: "slides", cap: "Keyboard sequence", frames: [
        { title: "First", text: "<p>Start.</p>" },
        { title: "Middle", text: "<p>Continue.</p>" },
        { title: "Last", text: "<p>Finish.</p>" }
      ] }
    ] })
  };
  try {
    await page.route("**/courses/demo.json", route => route.fulfill({ json: fixture }));
    await page.goto(`${server.origin}/#/demo/s1-1`);
    const deck = page.locator(".slides");
    await deck.waitFor();
    assert.equal(await page.locator("[data-lane], [data-lane-cycle]").count(), 0);
    assert.equal(await page.locator(".ex").isVisible(), true);
    assert.equal(await page.locator(".note").count(), 0);
    await page.locator(".dtab").click();
    assert.match(await page.locator(".note").innerText(), /Extra context/);
    await page.locator(".dtab").click();
    assert.equal(await page.locator(".note").count(), 0);

    const count = () => deck.locator(".slides-count").innerText();
    await deck.getByRole("button", { name: "Next slide" }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await count(), "2 / 3");
    await page.keyboard.press("ArrowRight");
    assert.equal(await count(), "3 / 3");
    assert.equal(await deck.evaluate(el => document.activeElement === el), true);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await count(), "2 / 3");
    await deck.getByRole("button", { name: "Previous slide" }).focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await count(), "1 / 3");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
    assert.equal(await count(), "2 / 3");
    await deck.getByRole("button", { name: "Next slide" }).click();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await count(), "2 / 3", "mouse navigation can continue with arrows at the end");
    await deck.focus();
    await page.keyboard.press("Tab");
    assert.equal(await deck.getByRole("button", { name: "Previous slide" }).evaluate(el => document.activeElement === el), true);
    await page.locator(".modesw-b:visible", { hasText: "Review" }).click();
    const marker = page.locator(".nrow.t-key").first();
    await marker.waitFor();
    const accent = () => marker.evaluate(el => getComputedStyle(el, "::before").backgroundColor);
    const originalAccent = await accent();
    await page.evaluate(() => document.querySelectorAll("[data-hue]").forEach(el => el.style.setProperty("--hue", "300")));
    assert.equal(await accent(), originalAccent, "compact rule signals also stay independent of the course hue");
  } finally {
    await browser.close();
    server.close();
  }
});
