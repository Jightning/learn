import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

test("the trend question keeps its scatterplot in subsection, Review, and Mixed Practice", async () => {
  const server = await serveDist(".");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.clock.install({ time: new Date() });
    const prompt = 'What does that slope difference mean?';
    const cardFor = scope => page.locator(`${scope} .q[data-qid="s4-2#read-a-trend"]`);
    const quiz = page.locator('.quiz[aria-label="4.2 questions"]');
    const hasStimulus = card => card.locator(".qstim .figure").count();
    const miss = async card => {
      await card.locator("textarea").fill("A comparison of the slopes.");
      await card.getByRole("button", { name: "Check answer" }).click();
      await card.getByRole("button", { name: "Needs work" }).click();
    };

    await page.goto(server.origin + "/#/demo/s4-2");
    const subsection = cardFor(".quiz");
    await subsection.waitFor({ state: "attached" });
    while (!(await subsection.isVisible()))
      await quiz.locator('button[aria-label="Next question"]').click();
    assert.equal(await hasStimulus(subsection), 1);
    assert.ok((await subsection.innerText()).includes(prompt));
    await miss(subsection);
    await page.clock.fastForward(2 * 24 * 60 * 60 * 1000);

    await page.evaluate(() => { location.hash = "#/demo/review"; });
    const review = cardFor(".review");
    await review.waitFor();
    assert.equal(await hasStimulus(review), 1);
    assert.match(await review.innerText(), /What does that slope difference mean\?/);

    await page.evaluate(() => { location.hash = "#/demo/review/mixed"; });
    await page.locator(".pcfg > summary").click();
    await page.locator("#p-from").selectOption("s4-2");
    await page.locator("#p-to").selectOption("s4-2");
    const available = parseInt(await page.locator(".pinfo").innerText(), 10);
    assert.ok(available <= Number(await page.locator("#p-count").inputValue()),
      "the run must include every question in the selected subsection");
    await page.locator("#p-start").click();
    const mixed = page.locator("#p-run .q");
    for (let i = 0; i < available * 2 &&
      (await mixed.getAttribute("data-qid")) !== "s4-2#read-a-trend"; i++) {
      await mixed.getByRole("button", { name: "Skip" }).click();
      await mixed.getByRole("button", { name: "Continue" }).click();
      assert.equal(await mixed.count(), 1, "the trend question must appear in this run");
    }
    assert.equal(await mixed.getAttribute("data-qid"), "s4-2#read-a-trend");
    assert.equal(await hasStimulus(mixed), 1);
    assert.match(await mixed.innerText(), /What does that slope difference mean\?/);
  } finally {
    await browser.close();
    server.close();
  }
});
