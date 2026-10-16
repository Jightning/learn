import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { chromium } from "playwright";
import { load } from "js-yaml";
import { Blocks } from "../../src/blocks/index.js";
import { INTERACTIVE } from "../../src/blocks/interactive.js";
import registerDemo from "../../courses/demo/blocks.js";
import { serveDist } from "../helpers/browser-harness.mjs";

test("visual options cover the registry with identical content and isolated, usable styles", async () => {
  const root = resolve(".");
  const dir = resolve("courses/demo/sections/06-block-visual-options");
  const names = ["1-open-editorial", "2-grouped-panels", "3-margin-rail"];
  const lessons = names.map(name => load(readFileSync(`${dir}/${name}.yaml`, "utf8")));
  registerDemo(Blocks, { src: () => "" });
  const expected = [...new Set([...Blocks.names(), ...INTERACTIVE])].sort();
  for (const lesson of lessons) {
    assert.deepEqual([...new Set(lesson.blocks.map(b => b.t))].sort(), expected);
    assert.deepEqual(lesson.blocks.slice(1), lessons[0].blocks.slice(1));
  }

  const server = await serveDist(root);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${server.origin}/#/demo/s6-1`);
    await page.locator("#s6-3 .metric").waitFor();
    const shots = resolve(".scratch/block-options-shots");
    mkdirSync(shots, { recursive: true });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      for (const width of [1500, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `no page overflow at ${width}px in ${theme}`);
        for (let i = 1; i <= 3; i++) {
          const sub = page.locator(`#s6-${i}`);
          assert.equal(await sub.locator(".katex-error").count(), 0);
          assert.equal(await sub.locator(".equation .katex").count(), 2);
          await sub.locator(".imgblock img").scrollIntoViewIfNeeded();
          assert.ok(await sub.locator(".imgblock img").evaluate(async img => {
            await img.decode();
            return img.naturalWidth > 0;
          }));
          await sub.locator(".def").scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${shots}/${names[i - 1]}-${theme}-${width}.png` });
        }
      }
    }

    await page.setViewportSize({ width: 1500, height: 1000 });
    const first = page.locator("#s6-1");
    const grouped = page.locator("#s6-2");
    const color = () => grouped.locator(".key").evaluate(el => getComputedStyle(el).borderTopColor);
    const originalColor = await color();
    assert.notEqual(originalColor, "rgba(0, 0, 0, 0)", "grouped rules have a visible semantic edge");
    await page.evaluate(() => {
      document.querySelectorAll("[data-hue]").forEach(el => el.style.setProperty("--hue", "0"));
    });
    assert.equal(await color(), originalColor, "course hue cannot recolor semantic accents");

    const listing = grouped.locator(".codewrap");
    assert.equal(await listing.locator(".lang").evaluate(el => getComputedStyle(el).position), "absolute");
    assert.equal(await listing.locator("pre").evaluate(el => getComputedStyle(el).paddingTop), "0px");
    await listing.locator("pre code").evaluate(el => { el.textContent = "x".repeat(400); });
    assert.ok(await listing.locator("pre").evaluate(el =>
      el.scrollWidth > el.clientWidth && getComputedStyle(el).overflowX === "auto"),
    "long code remains horizontally scrollable");

    await first.locator(".attempt-in").fill("The perpendicular legs give a diagonal of 5.");
    await first.locator("[data-attempt-go]").click();
    await first.locator(".attempt-done").waitFor();
    const slides = first.locator(".slides");
    await slides.getByRole("button", { name: /next/i }).click();
    assert.match(await slides.locator(".slides-count").innerText(), /2/);

    // Removing the demo-only marker simulates the same IDs in another course.
    await page.evaluate(() => document.querySelectorAll(".block-options-marker").forEach(el => el.remove()));
    assert.equal(await first.locator(".def").evaluate(el => getComputedStyle(el).borderLeftWidth), "1px");
    assert.equal(await first.locator(".def").evaluate(el => getComputedStyle(el).getPropertyValue("--option-info").trim()), "");
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
});
