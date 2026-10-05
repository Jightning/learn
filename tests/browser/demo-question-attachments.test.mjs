import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

for (const width of [1440, 390]) test(`demo attachment examples render and grade at ${width}px`, async () => {
  const server = await serveDist(".");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const examples = [
      { sub: "s5-1", id: "read-an-attached-code-listing", answer: 2, kind: "code" },
      { sub: "s5-2", id: "read-an-attached-circuit", answer: 1, kind: "figure" },
      { sub: "s5-2", id: "compare-an-attached-image", answer: 3, kind: "image" }
    ];
    for (const { sub, id, answer, kind } of examples) {
      await page.goto(`${server.origin}/#/demo/${sub}`);
      const quiz = page.locator(`.quiz[aria-label="${sub.slice(1).replace("-", ".")} questions"]`);
      const card = quiz.locator(`.q[data-qid="${sub}#${id}"]`);
      await card.waitFor({ state: "attached" });
      for (let i = 0; !(await card.isVisible()) && i < 8; i++)
        await quiz.getByRole("button", { name: "Next question", exact: true }).click();
      assert.equal(await card.isVisible(), true);
      assert.equal(await card.locator(`.qstim-${kind}`).count(), 1);
      assert.equal(await card.locator(".qstim-p").count(), 2);
      if (kind === "code") {
        assert.match(await card.locator("pre").innerText(), /tier: depth/);
        assert.equal(await card.locator(".qstim-note").count(), 1);
      }
      if (kind === "figure") {
        assert.ok(await card.locator(".fx-circuit path").count() > 0);
        assert.equal(await card.locator(".qstim-note").count(), 1);
        if (width === 390) assert.ok(await card.locator(".figure-scroll").evaluate(el => el.scrollWidth > el.clientWidth));
        await card.scrollIntoViewIfNeeded();
        await card.screenshot({ path: `/private/tmp/demo-circuit-question-${width}.png` });
      }
      if (kind === "image") assert.equal(await card.locator("img").evaluate(img => img.complete && img.naturalWidth > 0), true);
      await card.locator('input[type="radio"]').nth(answer - 1).check();
      await card.getByRole("button", { name: "Check answer", exact: true }).click();
      assert.equal(await card.locator(".qresult").innerText(), "Correct");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
  } finally { await browser.close(); server.close(); }
});
