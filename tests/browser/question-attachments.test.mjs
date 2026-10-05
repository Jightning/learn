import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as YAML from "js-yaml";
import { chromium } from "playwright";
import { serveDist } from "../helpers/browser-harness.mjs";

for (const width of [1440, 390]) test(`ordered question attachments are readable at ${width}px`, async () => {
  const server = await serveDist(".");
  const browser = await chromium.launch();
  try {
    const files = JSON.parse(readFileSync("dist/courses/demo.json", "utf8"));
    const key = Object.keys(files).find(k => /sections\/01-[^/]+\/1-.*yaml$/.test(k));
    const unit = YAML.load(files[key]);
    unit.quiz = [{ type: "Trace", concept: unit.quiz[0].concept,
      q: "What value is returned?", stimulus: [
        { t: "p", h: "Before the diagram, follow the signal." },
        { t: "figure", kind: "circuit", cap: "Signal path", spec: { layout: "rectangle", w: 12, h: 4,
          sides: { top: [{ type: "resistor", label: "R1", value: "1 kΩ" }],
            left: [{ type: "battery", label: "B", value: "9 V" }] } } },
        { t: "p", h: "After the diagram, trace this code." },
        { t: "code", lang: "c", src: "return 6;" },
        { t: "note", label: "Given", h: "Assume integer arithmetic." },
        { t: "image", src: "assets/test.svg", alt: "An input arrow", cap: "Input" },
        { t: "p", h: "Finally, enter the returned value." }
      ], response: { kind: "number", value: 6 } }];
    files[key] = YAML.dump(unit);
    files["assets/test.svg"] = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="80"><path d="M20 40H560" stroke="black"/></svg>').toString("base64");
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route("**/courses/demo.json", route => route.fulfill({ json: files }));
    await page.goto(server.origin + "/#/demo/s1-1");
    const card = page.locator('.quiz .q[data-qid="s1-1#trace"]');
    await card.waitFor();
    assert.deepEqual(await card.locator(".qstim").evaluateAll(nodes => nodes.map(n => n.className)),
      ["qstim qstim-p", "qstim qstim-figure", "qstim qstim-p", "qstim qstim-code", "qstim qstim-note", "qstim qstim-image", "qstim qstim-p"]);
    assert.ok(await card.locator(".fx-circuit path").count() > 0);
    const layout = await card.evaluate(el => {
      const figure = el.querySelector(".figure"), scroll = el.querySelector(".figure-scroll");
      const svg = scroll.querySelector("svg"), note = el.querySelector(".note");
      return { card: el.clientWidth, figure: figure.clientWidth, scroll: scroll.clientWidth,
        svg: svg.getBoundingClientRect().width, noteBorder: getComputedStyle(note).borderTopWidth,
        bodyOverflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(Math.abs(layout.card - layout.figure) < 2, JSON.stringify(layout));
    assert.ok(layout.svg >= 480, JSON.stringify(layout));
    assert.equal(layout.noteBorder, "0px");
    assert.equal(layout.bodyOverflow, false, JSON.stringify(layout));
    if (width === 390) {
      assert.ok(layout.svg > layout.scroll);
      assert.ok(await card.locator(".figure-scroll").evaluate(el => { el.scrollLeft = 100; return el.scrollLeft > 0; }));
    }
    assert.equal(await card.locator("img").evaluate(img => img.complete && img.naturalWidth > 0), true);
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: `/private/tmp/question-attachments-${width}.png` });
    await card.locator('input[type="number"]').fill("6");
    await card.getByRole("button", { name: "Check answer" }).click();
    assert.equal(await card.locator(".qresult").innerText(), "Correct");
  } finally { await browser.close(); server.close(); }
});
