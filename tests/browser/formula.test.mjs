import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as YAML from "js-yaml";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

for (const width of [1440, 390]) test(`formula checking and independent freeform features at ${width}px`, async () => {
  const server = await serveDist(".");
  const browser = await chromium.launch();
  try {
    const files = JSON.parse(readFileSync("dist/courses/demo.json", "utf8"));
    const key = Object.keys(files).find(k => /sections\/01-[^/]+\/1-.*yaml$/.test(k));
    const unit = YAML.load(files[key]), concept = unit.quiz[0].concept;
    unit.quiz = [
      { type: "Formula", concept, q: "Enter the line equation.", response:
        { kind: "formula", answer: "y=2*exp(x)-exp(2*x)", variables: ["x", "y"], solveFor: "y" } },
      { type: "Symbols", concept, q: "Explain with symbols.", response:
        { kind: "self", model: "Explanation", mathSymbols: true } },
      { type: "Preview", concept, q: "Explain with a preview.", response:
        { kind: "self", model: "<p>The growth is e^x with sqrt(x).</p>", formulaParsing: true } },
      { type: "Uncertain", concept, q: "Enter a fraction.", response:
        { kind: "formula", answer: "x/x", variables: ["x"] } }
    ];
    files[key] = YAML.dump(unit);
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route("**/courses/demo.json", route => route.fulfill({ json: files }));
    await page.goto(server.origin + "/#/demo/s1-1");
    const quiz = page.getByRole("region", { name: "1.1 questions", exact: true });
    const card = quiz.locator('.q:visible');
    await card.waitFor();
    const next = () => quiz.getByRole("button", { name: "Next question", exact: true }).click();
    const enter = async text => {
      await card.locator("math-field").evaluate((field, source) => {
        field.setValue(source, { format: "ascii-math" });
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }, text);
    };
    await card.locator("math-field").waitFor();
    await card.locator("math-field").click();
    assert.equal(await card.locator("math-field").evaluate(field => document.activeElement === field), true,
      "a click must focus the math editor before the first keystroke");
    await page.keyboard.type("sqrt(x)", { delay: 100 });
    assert.match(await card.locator("math-field").evaluate(field => field.value), /\\sqrt/);
    await enter("");
    await card.locator("math-field").click();
    await page.keyboard.type("abs(x)", { delay: 100 });
    assert.match(await card.locator("math-field").evaluate(field => field.value), /\\left\|/);
    assert.equal(await card.locator(".qsyntax,.qpreview").count(), 0);
    await enter("y=");
    await card.getByRole("button", { name: "Check answer", exact: true }).click();
    await card.locator(".qcheck-error").waitFor();
    assert.equal(await card.locator(".qresult").count(), 0);
    await enter("y=2x");
    await card.locator("math-field").click();
    await page.keyboard.press("/");
    assert.equal(await page.getByRole("dialog", { name: "Search", exact: true }).count(), 0);
    await enter("y=2*e^x-e^(2*x)");
    await card.getByRole("button", { name: "Check answer", exact: true }).click();
    await card.locator(".qresult").waitFor();
    assert.equal(await card.locator(".qresult").innerText(), "Correct");
    await card.locator(".ans .katex").waitFor();
    assert.doesNotMatch(await card.locator(".ans").innerText(), /Answer:/);
    
    await next();
    assert.equal(await card.locator(".qpreview").count(), 0);
    await card.locator("textarea").fill("x+");
    await card.getByRole("button", { name: "More math symbols", exact: true }).click();
    const dialog = card.getByRole("dialog");
    assert.equal(await dialog.getByRole("button", { name: "Insert theta", exact: true }).innerText(), "θ");
    for (const name of ["Functions", "Calculus", "Greek letters"])
      assert.equal(await dialog.getByRole("heading", { name, exact: true }).count(), 1);
    assert.equal(await dialog.getByRole("button", { name: "Insert Definite integral", exact: true }).count(), 1);
    await dialog.getByRole("button", { name: "Insert theta", exact: true }).click();
    assert.equal(await card.locator("textarea").inputValue(), "x+theta");
    await card.getByRole("button", { name: "More math symbols", exact: true }).click();
    await page.mouse.click(5, 5);
    assert.equal(await dialog.isVisible(), false);
    await card.getByRole("button", { name: "More math symbols", exact: true }).click();
    await page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), false);
    await next();
    assert.equal(await card.locator(".qsymbols").count(), 0);
    await card.locator("math-field").waitFor();
    await enter("e^x");
    assert.equal(await card.locator(".qpreview").count(), 0);
    assert.match(await card.locator("math-field").evaluate(field => field.value), /\^/);
    await card.getByRole("button", { name: "Check answer", exact: true }).click();
    assert.equal(await card.locator(".qresult").innerText(), "Compare your answer");
    await card.locator(".ans .katex").first().waitFor();
    assert.equal(await card.locator(".ans .katex").count(), 2);
    await next();
    await card.locator("math-field").waitFor();
    await enter("1");
    await card.getByRole("button", { name: "Check answer", exact: true }).click();
    await card.locator(".qresult").waitFor();
    assert.equal(await card.locator(".qresult").innerText(), "Wrong");
    assert.equal(await card.getByRole("button", { name: "Compare answer yourself" }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  } finally { await browser.close(); server.close(); }
});

test("mobile touch keyboard enters and submits formula and formulaParsing answers", async () => {
  const server = await serveDist(".");
  const browser = await chromium.launch();
  try {
    const files = JSON.parse(readFileSync("dist/courses/demo.json", "utf8"));
    const key = Object.keys(files).find(k => /sections\/01-[^/]+\/1-.*yaml$/.test(k));
    const unit = YAML.load(files[key]), concept = unit.quiz[0].concept;
    unit.quiz = [
      { type: "Formula", concept, q: "Enter x squared.", response:
        { kind: "formula", answer: "x^2", variables: ["x"] } },
      { type: "Self", concept, q: "Explain with a formula.", response:
        { kind: "self", model: "x^2", formulaParsing: true } }
    ];
    files[key] = YAML.dump(unit);
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true
    });
    await page.route("**/courses/demo.json", route => route.fulfill({ json: files }));
    await page.goto(server.origin + "/#/demo/s1-1");
    const quiz = page.getByRole("region", { name: "1.1 questions", exact: true });
    const card = quiz.locator(".q:visible");
    const enterSquareByTouch = async (target = card) => {
      const field = target.locator("math-field");
      await field.waitFor();
      await field.tap();
      const keyboard = page.locator(".ML__keyboard.is-visible");
      await keyboard.waitFor();
      await keyboard.locator('.MLK__keycap[aria-label="x"]').first().tap();
      await keyboard.locator('.MLK__keycap[aria-label="#@^2}"]').tap();
      assert.equal(await field.evaluate(el => el.getValue("ascii-math")), "x^2");
    };

    await enterSquareByTouch();
    await card.getByRole("button", { name: "Check answer", exact: true }).tap();
    await card.locator(".qresult").waitFor();
    assert.equal(await card.locator(".qresult").innerText(), "Correct");

    await quiz.getByRole("button", { name: "Next question", exact: true }).tap();
    await enterSquareByTouch();
    assert.equal(await card.locator(".qsymbols").count(), 0,
      "formulaParsing remains independent of the mathSymbols palette");
    await card.getByRole("button", { name: "Check answer", exact: true }).tap();
    await card.locator(".qresult").waitFor();
    assert.equal(await card.locator(".qresult").innerText(), "Compare your answer");

    await page.evaluate(() => { location.hash = "#/demo/review/mixed"; });
    await page.getByRole("group", { name: "Practice settings" }).waitFor();
    await page.locator("#p-from").selectOption("s1-1");
    await page.locator("#p-to").selectOption("s1-1");
    const available = Number.parseInt(await page.locator(".practice-settings .practice-stats strong").innerText(), 10);
    await page.locator("#p-start").tap();
    const mixed = page.locator("#p-run .q");
    for (let i = 0; i < available && !(await mixed.innerText()).includes("Enter x squared."); i++) {
      await mixed.getByRole("button", { name: "Skip" }).tap();
      await mixed.getByRole("button", { name: "Continue" }).tap();
    }
    assert.match(await mixed.innerText(), /Enter x squared\./,
      "the selected subsection's formula question appears in Mixed Practice");
    await enterSquareByTouch(mixed);
    await mixed.getByRole("button", { name: "Check answer", exact: true }).tap();
    await mixed.locator(".qresult").waitFor();
    assert.equal(await mixed.locator(".qresult").innerText(), "Correct");
  } finally { await browser.close(); server.close(); }
});
