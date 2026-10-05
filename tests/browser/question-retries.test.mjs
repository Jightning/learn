import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as YAML from "js-yaml";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

for (const width of [1440, 390]) test(`question retries, final results and reload at ${width}px`, async () => {
  const server = await serveDist("."), browser = await chromium.launch();
  try {
    const files = JSON.parse(readFileSync("dist/courses/demo.json", "utf8"));
    const key = Object.keys(files).find(k => /sections\/01-[^/]+\/1-.*yaml$/.test(k));
    const unit = YAML.load(files[key]), concept = unit.quiz[0].concept;
    const choices = ["One", "Two", "Three"].map(text => ({ text, why: `Reason for ${text}` }));
    unit.quiz = [
      { type: "Single", tries: 3, response: { kind: "single", choices, correct: 3 } },
      { type: "Multi", tries: 2, response: { kind: "multi", choices, correct: [1, 3] } },
      { type: "Number", tries: 2, response: { kind: "number", value: 12 } },
      { type: "Formula", tries: 2, response: { kind: "formula", answer: "x^2", variables: ["x"] } },
      { type: "Self", tries: 2, response: { kind: "self", model: "A model answer." } },
      { type: "Default", response: { kind: "single", choices, correct: 3 } },
      { type: "Skip", tries: 3, response: { kind: "number", value: 12 } }
    ].map(q => ({ ...q, concept, q: `Solve ${q.type}.`, why: "Full explanation." }));
    files[key] = YAML.dump(unit);
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/courses/demo.json", route => route.fulfill({ json: files }));
    await page.goto(server.origin + "/#/demo/s1-1");
    const quiz = page.getByRole("region", { name: "1.1 questions", exact: true });
    const card = quiz.locator(".q:visible");
    const check = () => card.getByRole("button", { name: /^Check answer/ }).click();
    const retry = async () => {
      await card.getByRole("button", { name: /^Try again/ }).click();
      await card.getByRole("button", { name: /^Check answer/ }).waitFor();
    };
    const next = () => quiz.getByRole("button", { name: "Next question", exact: true }).click();
    const result = async text => { await card.locator(".qresult").filter({ hasText: new RegExp(`^${text}$`) }).waitFor(); assert.equal(await card.locator(".qresult").innerText(), text); };
    const enterMath = async source => {
      await card.locator("math-field").waitFor();
      await card.locator("math-field").evaluate((field, value) => {
        field.setValue(value, { format: "ascii-math" });
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }, source);
    };
    await card.getByRole("radio").nth(0).check(); await check(); await result("Wrong");
    assert.equal(await card.locator(".is-right,.qexplain,.ans").count(), 0);
    assert.equal(await quiz.locator(".qstat").innerText(), "0 answered");
    assert.match(await card.getByRole("button", { name: /^Try again/ }).innerText(), /2 tries left/);
    await page.reload(); await card.getByRole("button", { name: /^Try again/ }).waitFor();
    await retry();
    assert.equal(await card.getByRole("radio").nth(0).isDisabled(), true);
    assert.equal(await card.getByText("Incorrect", { exact: true }).count(), 1);
    assert.equal(await card.getByRole("radio").nth(1).isEnabled(), true);
    await card.screenshot({ path: `/private/tmp/question-retry-${width}.png` });
    await card.getByRole("radio").nth(1).check(); await check(); await retry();
    assert.equal(await card.getByRole("radio").nth(1).isDisabled(), true);
    await page.reload(); await card.getByRole("radio").nth(2).waitFor();
    assert.equal(await card.getByRole("radio").nth(0).isDisabled(), true);
    assert.match(await card.getByRole("button", { name: /^Check answer/ }).innerText(), /1 try left/);
    await card.getByRole("radio").nth(2).check(); await check(); await result("Correct");
    assert.equal(await quiz.locator(".qstat").innerText(), "1 answered");
    await next();
    await card.getByRole("checkbox").nth(0).check(); await check(); await result("Wrong");
    assert.equal(await card.locator(".qchoice-why,.qexplain").count(), 0);
    await retry();
    assert.equal(await card.getByRole("button", { name: /^Check answer/ }).isDisabled(), true);
    for (const input of await card.getByRole("checkbox").all()) assert.equal(await input.isEnabled(), true);
    await card.getByRole("checkbox").nth(2).check(); await check(); await result("Correct");
    await next();
    await card.locator('input[type="number"]').fill("11"); await check(); await result("Wrong");
    assert.equal(await card.locator(".ans,.qexplain").count(), 0);
    await retry(); assert.equal(await card.locator('input[type="number"]').inputValue(), "11");
    await card.locator('input[type="number"]').fill("10"); await check(); await result("Wrong");
    assert.equal(await card.getByRole("button", { name: /^Try again/ }).count(), 0);
    assert.match(await card.locator(".ans").innerText(), /12/);
    await next();
    await enterMath("x+"); await check(); await card.locator(".qcheck-error").waitFor();
    assert.match(await card.getByRole("button", { name: /^Check answer/ }).innerText(), /2 tries left/);
    await enterMath("x"); await check(); await result("Wrong");
    assert.equal(await card.locator(".ans,.qexplain").count(), 0);
    await retry(); assert.equal(await card.locator("math-field").evaluate(field => field.readOnly), false);
    await enterMath("x^2"); await check(); await result("Correct");
    await next();
    await card.locator("textarea").fill("My first answer"); await check(); await result("Compare your answer");
    assert.equal(await card.locator(".ans").innerText(), "A model answer.");
    await card.getByRole("button", { name: "Wrong", exact: true }).click(); await retry();
    await card.locator("textarea").fill("My second answer"); await check();
    await card.getByRole("button", { name: "Wrong", exact: true }).click(); await result("Wrong");
    assert.equal(await card.getByRole("button", { name: /^Try again/ }).count(), 0);
    await next();
    assert.equal(await card.getByRole("button", { name: "Check answer", exact: true }).count(), 1);
    await card.getByRole("radio").nth(0).check(); await check(); await result("Wrong");
    assert.equal(await card.getByRole("button", { name: /^Try again/ }).count(), 0);
    await next();
    await card.getByRole("button", { name: "Skip", exact: true }).click(); await result("Skipped");
    assert.equal(await card.getByRole("button", { name: /^Try again/ }).count(), 0);
    assert.equal(await quiz.locator(".qstat").innerText(), "7 answered");
    await page.reload(); await card.locator(".qresult").waitFor();
    assert.equal(await quiz.locator(".qstat").innerText(), "7 answered");
    const ratings = await page.evaluate(() => new Promise((resolve, reject) => {
      const opening = indexedDB.open("learn");
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result, request = db.transaction("kv").objectStore("kv").openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) { db.close(); resolve(null); return; }
          if (String(cursor.key).startsWith("study:")) {
            const state = JSON.parse(cursor.value);
            db.close(); resolve(state.q); return;
          }
          cursor.continue();
        };
        request.onerror = () => reject(request.error);
      };
    }));
    assert.equal(Object.keys(ratings).length, 7);
    for (const rating of Object.values(ratings)) assert.equal(rating.reps, 1);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
