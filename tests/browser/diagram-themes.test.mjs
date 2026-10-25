import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { circuit } from "../../src/figures/circuit.js";

const css = ["00-tokens", "44-image", "45-figures", "46-slides", "60-quiz"]
  .map(name => readFileSync(`src/css/${name}.css`, "utf8")).join("\n");
const imported = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M10 40H190" stroke="#172554" stroke-width="4"/></svg>').toString("base64");
const native = circuit({ layout: "rectangle", w: 8, h: 4,
  sides: { top: [{ type: "resistor", label: "R", value: "1 kΩ" }] } });

for (const width of [1440, 390]) test(`supplied and native circuit diagrams stay readable in both themes at ${width}px`, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(`<style>${css}</style><div class="qstim"><figure class="imgblock"><img src="${imported}"></figure></div><figure class="slides-image"><img src="${imported}"></figure><div class="figure">${native}</div>`);
    const strokes = [];
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      const result = await page.evaluate(async () => {
        const images = [...document.images];
        await Promise.all(images.map(img => img.decode()));
        const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
        canvas.width = canvas.height = 1;
        const luminance = color => {
          ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
          const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => {
            v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
          });
          return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
        };
        const stroke = getComputedStyle(document.querySelector(".fx-c-wire")).stroke;
        const ink = luminance(stroke), ground = luminance(getComputedStyle(document.querySelector(".figure")).backgroundColor);
        return { images: images.map(img => ({ background: getComputedStyle(img).backgroundColor,
          scheme: getComputedStyle(img).colorScheme, width: img.getBoundingClientRect().width })),
          stroke, contrast: (Math.max(ink, ground) + .05) / (Math.min(ink, ground) + .05) };
      });
      for (const image of result.images) {
        assert.equal(image.background, "rgb(255, 255, 255)");
        assert.equal(image.scheme, "light");
        assert.ok(image.width <= width);
      }
      assert.ok(result.contrast >= 4.5, `${theme}: native circuit contrast ${result.contrast}`);
      strokes.push(result.stroke);
    }
    assert.notEqual(strokes[0], strokes[1], "native wire ink adapts to the theme");
  } finally { await browser.close(); }
});
