import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { chromium } from "playwright";
import * as YAML from "js-yaml";
import { graph } from "../../src/figures/graph.js";
import { circuit } from "../../src/figures/circuit.js";
import { drawing } from "../../src/figures/drawing.js";
import { bar } from "../../src/figures/bar.js";
import { plot } from "../../src/figures/plot.js";
import { scatter } from "../../src/figures/scatter.js";
import { grid } from "../../src/figures/grid.js";
import { flow } from "../../src/figures/flow.js";
import { watchFigureScroll } from "../../src/lib/figure-scroll.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const css = ["00-tokens.css", "30-typography.css", "40-blocks.css",
  "45-figures.css", "52-asides.css"]
  .map(name => readFileSync(join(root, "src/css", name), "utf8")).join("\n");
const demoDiagrams = YAML.load(readFileSync(join(root,
  "courses/demo/sections/04-figure-catalogue/1-diagrams.yaml"), "utf8"));
const demoCircuit = demoDiagrams.blocks.find(block => block.id === "demo-circuit");
const demoBranch = demoDiagrams.blocks.find(block => block.id === "branched-circuit");
const demoGraph = demoDiagrams.blocks.find(block => block.id === "loop-machine");
const demoFlow = demoDiagrams.blocks.find(block => block.kind === "flow" && block.spec.dir === "row");
globalThis.window = { COURSE: {} }; // grid reads the active course's value styles.

const figures = {
  graph: graph({ layout: "row", nodes: Array.from({ length: 8 }, (_, i) => ({
    id: `n${i}`, label: `Unexpectedly long signal transition ${i}`,
    note: `A note with several words and a verylongunbrokenidentifier${i}`
  })), edges: Array.from({ length: 7 }, (_, i) => ({
    from: `n${i}`, to: `n${i + 1}`, label: `important transition ${i}`
  })) }),
  circuit: circuit({ w: 4, h: 2, parts: [
    { type: "resistor", x: 1, y: 1, label: "Input resistance of first stage", value: "A very long value at node one" },
    { type: "capacitor", x: 2, y: 1, label: "Output capacitance of second stage", value: "A very long value at node two" }
  ] }),
  rectangle: circuit({ layout: "rectangle", sides: {
    top: [{ type: "resistor", label: "Long top resistance", value: "One thousand ohms" }],
    right: [{ type: "capacitor", label: "Long right capacitance", value: "One hundred microfarads" }],
    bottom: [{ type: "lamp", label: "Long bottom lamp", value: "Bright output indicator" }],
    left: [{ type: "battery", label: "Long left battery", value: "Nine volt supply" }]
  } }),
  demo: circuit(demoCircuit.spec, demoCircuit.cap),
  branch: circuit(demoBranch.spec, demoBranch.cap),
  stateGraph: graph(demoGraph.spec, demoGraph.cap),
  demoFlow: flow(demoFlow.spec, demoFlow.cap),
  drawing: drawing({ w: 320, h: 160, alt: "A label near the edge", shapes: [
    { type: "text", x: 290, y: 80, text: "Long label crossing the right edge" },
    { type: "rect", x: 250, y: 100, w: 100, h: 40 }
  ] }),
  bar: bar({ w: 320, h: 180, valueFmt: "{} milliseconds", bars: [
    { label: "Unexpectedly long category label", value: 10 },
    { label: "Another very long category label", value: 11 },
    { label: "Third very long category label", value: 12 }
  ] }),
  plot: plot({ w: 320, h: 180, series: [{ points: [[0, 0], [1, 1000]] }],
    xfmt: "{} milliseconds", yfmt: "{} volts", xlabel: "Long horizontal axis", ylabel: "Long vertical axis" }),
  scatter: scatter({ w: 320, h: 180, series: [{ points: [[0, 0], [1, 1000]] }],
    xfmt: "{} milliseconds", yfmt: "{} volts", xlabel: "Long horizontal axis", ylabel: "Long vertical axis" }),
  grid: grid({ rowLabels: ["long row", "second row"], colLabels: ["long column", "second column"],
    cells: [["Unexpectedly long cell value", "0"], ["1", "1"]] })
};

test("long figure labels remain separate and visible at phone and desktop widths", async () => {
  assert.equal(demoCircuit.spec.layout, "rectangle");
  assert.ok(demoCircuit.spec.sides.right.some(part => part.type === "capacitor"));
  assert.match(figures.demo, /data-wire="top-1"/);
  assert.equal(demoBranch.spec.layout, "manual");
  assert.equal(demoBranch.spec.junctions.length, 2);
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390, 960]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(`<style>${css}</style><main style="width:${width - 32}px">` +
        Object.entries(figures).map(([kind, html]) =>
          `<div class="figure" data-kind="${kind}"><span class="fcap">${kind} caption</span>` +
          `<div class="figure-viewport"><div class="figure-scroll">${html}</div></div></div>`).join("") + "</main>");
      await page.evaluate(watchFigureScroll, await page.locator("main").elementHandle());
      const result = await page.evaluate(() => {
        const out = { pageOverflow: document.documentElement.scrollWidth - innerWidth, figures: {} };
        for (const box of document.querySelectorAll("[data-kind]")) {
          const svg = box.querySelector("svg.fx"), texts = svg ? [...svg.querySelectorAll("text")] : [];
          // Client rectangles include SVG transforms (the rotated y-axis title).
          const boxes = texts.map(el => ({ text: el.textContent, box: el.getBoundingClientRect() }));
          const view = svg?.getBoundingClientRect();
          const outside = boxes.filter(({ box: b }) => view &&
            (b.left < view.left - 1 || b.top < view.top - 1 ||
             b.right > view.right + 1 || b.bottom > view.bottom + 1));
          const overlap = [];
          for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i].box, b = boxes[j].box;
            if (a.left < b.right && b.left < a.right &&
                a.top < b.bottom && b.top < a.bottom)
              overlap.push([boxes[i].text, boxes[j].text]);
          }
          const symbolOverlap = [];
          if (["rectangle", "circuit", "demo", "branch"].includes(box.dataset.kind)) {
            const strokes = [...svg.querySelectorAll("line,path,circle")]
              .map(el => el.getBoundingClientRect());
            for (const { text, box: a } of boxes) for (const b of strokes) {
              if (a.left < b.right + 2 && b.left - 2 < a.right &&
                  a.top < b.bottom + 2 && b.top - 2 < a.bottom)
                symbolOverlap.push(text);
            }
          }
          out.figures[box.dataset.kind] = { outside: outside.map(x => x.text), overlap,
            symbolOverlap,
            scroll: box.querySelector(".figure-scroll").scrollWidth -
              box.querySelector(".figure-scroll").clientWidth,
            cellClipped: [...box.querySelectorAll(".fx-gcell,.fx-gh,.fx-gc")]
              .some(cell => cell.scrollHeight > cell.clientHeight + 1) };
        }
        return out;
      });
      assert.ok(result.pageOverflow <= 1, `${width}px: page overflow ${result.pageOverflow}`);
      for (const [kind, metric] of Object.entries(result.figures)) {
        assert.deepEqual(metric.outside, [], `${width}px ${kind}: text outside canvas`);
        assert.deepEqual(metric.overlap, [], `${width}px ${kind}: overlapping text`);
        assert.deepEqual(metric.symbolOverlap, [], `${width}px ${kind}: text crosses circuit wire or symbol`);
        assert.equal(metric.cellClipped, false, `${width}px ${kind}: clipped grid cell`);
      }
      if (width === 320) assert.ok(result.figures.plot.scroll > 0, "wide chart scrolls inside its frame");
      if (width === 960) {
        const circuitGaps = await page.locator('[data-kind="demo"]').evaluate(el =>
          [...el.querySelectorAll(".fx-c-part")].flatMap(part => {
            const value = part.querySelector(".fx-cv");
            const symbol = part.querySelector(":scope > g");
            if (!value || !symbol) return [];
            const a = value.getBoundingClientRect(), b = symbol.getBoundingClientRect();
            return a.top >= b.bottom ? [{ part: part.querySelector("title")?.textContent,
              gap: a.top - b.bottom }] : [];
          }));
        assert.ok(circuitGaps.length > 0 && circuitGaps.every(item => item.gap <= 20),
          `circuit values stay close below symbols (${JSON.stringify(circuitGaps)})`);
        const missGap = await page.locator('[data-kind="stateGraph"]').evaluate(el => {
          const svg = el.querySelector("svg");
          const path = svg.querySelectorAll(".fx-e")[3];
          const label = [...svg.querySelectorAll(".fx-el")].find(node => node.textContent === "miss");
          const box = label.getBoundingClientRect();
          const center = [box.left + box.width / 2, box.top + box.height / 2];
          let nearest = Infinity;
          for (let i = 0; i <= 100; i++) {
            const p = path.getPointAtLength(path.getTotalLength() * i / 100);
            const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM());
            nearest = Math.min(nearest, Math.hypot(center[0] - screen.x, center[1] - screen.y));
          }
          return nearest;
        });
        assert.ok(missGap <= 24, `miss label stays near its branch (${missGap}px)`);
        const flowBox = page.locator('[data-kind="demoFlow"]');
        const scroll = flowBox.locator(".figure-scroll");
        const start = await flowBox.evaluate(el => ({
          caption: el.querySelector(".fcap").getBoundingClientRect().left,
          gap: el.querySelector(".fx-step:first-child").getBoundingClientRect().left -
            el.querySelector(".figure-scroll").getBoundingClientRect().left,
          right: el.querySelector(".figure-viewport").classList.contains("has-right")
        }));
        assert.equal(start.right, true, "wide flow advertises remaining content");
        await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
        await page.waitForTimeout(250);
        const end = await flowBox.evaluate(el => ({
          caption: el.querySelector(".fcap").getBoundingClientRect().left,
          left: el.querySelector(".figure-viewport").classList.contains("has-left"),
          right: el.querySelector(".figure-viewport").classList.contains("has-right"),
          gap: el.querySelector(".figure-scroll").getBoundingClientRect().right -
            el.querySelector(".fx-step:last-child").getBoundingClientRect().right
        }));
        assert.equal(end.caption, start.caption, "caption stays fixed above scrolling figure");
        assert.equal(end.left, true, "left fade appears after scrolling");
        assert.equal(end.right, false, "right fade disappears at the end");
        assert.ok(Math.abs(end.gap - start.gap) <= 2,
          `flow end spacing matches start (${start.gap}px vs ${end.gap}px)`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
});

test("an aside highlight lines up with inline code", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 300 }, deviceScaleFactor: 2 });
    for (const size of [16, 20]) {
      await page.setContent(`<style>${css}</style><div class="key"><p style="font:${size}px/1.6 sans-serif">` +
        `<span class="nref hot"><code>&lt;n k="…"&gt;</code> in the text and ` +
        `<code>asides.&lt;key&gt;</code> in the block are a matched pair</span></p></div>`);
      await page.evaluate(() => document.fonts.ready);
      const alignment = await page.evaluate(() => {
        const fragments = [...document.querySelector(".nref").getClientRects()];
        return [...document.querySelectorAll(".nref code")].map(code => {
          const box = code.getBoundingClientRect();
          const phrase = fragments.find(rect => rect.top <= box.top && rect.bottom >= box.bottom) ||
            fragments.reduce((a, b) => Math.abs(a.top - box.top) < Math.abs(b.top - box.top) ? a : b);
          return { top: box.top - phrase.top, bottom: phrase.bottom - box.bottom,
            background: getComputedStyle(code).backgroundColor };
        });
      });
      assert.ok(alignment.every(a => a.background !== "rgba(0, 0, 0, 0)"),
        `${size}px code keeps its own background (${JSON.stringify(alignment)})`);
      const shot = await page.locator("p").screenshot();
      const paint = await page.evaluate(async png => {
        const img = new Image();
        img.src = `data:image/png;base64,${png}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3).join(",");
        const paragraph = document.querySelector("p").getBoundingClientRect();
        const code = document.querySelector(".nref code").getBoundingClientRect();
        const scale = devicePixelRatio;
        const xCode = Math.round((code.left + code.width / 2 - paragraph.left) * scale);
        const xGap = Math.round((code.right + 3 - paragraph.left) * scale);
        const mid = Math.round((code.top + code.height / 2 - paragraph.top) * scale);
        const highlight = pixel(xGap, mid);
        let first = mid, last = mid;
        while (first > 0 && pixel(xGap, first - 1) === highlight) first--;
        while (last < img.height - 1 && pixel(xGap, last + 1) === highlight) last++;
        const codeRows = Array.from({ length: last - first + 1 }, (_, y) => first + y)
          .filter(y => pixel(xCode, y) !== highlight);
        return { above: codeRows[0] - first, below: last - codeRows.at(-1) };
      }, shot.toString("base64"));
      assert.ok(paint.above >= 2 && paint.below >= 2 &&
        Math.abs(paint.above - paint.below) <= 2,
        `${size}px painted highlight has equal space above and below code (${JSON.stringify(paint)})`);
    }
  } finally { await browser.close(); }
});
