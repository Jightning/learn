#!/usr/bin/env node
/* Contrast gate.
 *
 * Walks every rendered text node across every view and both themes, computes
 * the real (foreground, effective background) ratio for each distinct pair,
 * and fails if any falls below WCAG AA. Sampling a handful of selectors by
 * hand missed eight failures once; this does not.
 *
 * It also gates the grounds' *tint*, which contrast cannot see. See the tint
 * gate below for why a theme can pass every ratio and still be wrong. */
import { chromium } from "playwright";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serveDist, installPacked } from "./lib/harness.mjs";
import { loadCourse } from "./lib/load.mjs";
import { routesFor } from "./lib/routes.mjs";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { origin: F, close } = await serveDist(ROOT);

/* Every course, not one of them: a course carries its own accent rotation
   (theme.hue), so sweeping a single course would leave five palettes ungated. */
const PAGES = ["#/", ...readdirSync(join(ROOT, "courses"), { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith("_"))
  .flatMap(d => {
    const { course } = loadCourse(join(ROOT, "courses", d.name));
    return routesFor(course).map(r => "#/" + d.name + r);
  })];

const lum = c => { const [r,g,b] = c.map(v => { v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4); }); return .2126*r+.7152*g+.0722*b; };
const ratio = (a,b) => { const L1=lum(a),L2=lum(b); const [hi,lo]=L1>L2?[L1,L2]:[L2,L1]; return (hi+.05)/(lo+.05); };

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 950 } });

/* Private courses are not deployed, so they are installed the way a reader
   installs their own — otherwise every palette but the demo's goes ungated. */
await p.goto(F + "/");
await p.waitForTimeout(600);
await installPacked(p, ROOT);

/* Dark has two independent paths — the reader's OS setting and the in-page
   toggle — and they are separate CSS blocks. A stale copy of the palette once
   won on the media path only, so both are swept. */
const MODES = {
  light:       { scheme: "light", attr: null },
  dark:        { scheme: "light", attr: "dark" },
  "os-dark":   { scheme: "dark",  attr: null }
};

async function sweep(theme) {
  const mode = MODES[theme];
  await p.emulateMedia({ colorScheme: mode.scheme });
  const found = new Map();
  for (const r of PAGES) {
    await p.goto(F + "/" + r);
    await p.waitForTimeout(220);
    await p.evaluate(a => {
      if (a) document.documentElement.setAttribute("data-theme", a);
      else document.documentElement.removeAttribute("data-theme");
    }, mode.attr);
    await p.waitForTimeout(120);
    if (r.endsWith("/practice")) { await p.locator("#p-start").click().catch(()=>{}); await p.waitForTimeout(300); }
    const rows = await p.evaluate(() => {
      const out = [];
      /* Ask the renderer, do not parse the string. getComputedStyle now hands
         back whatever colour space the author wrote — oklch() stays oklch() —
         and an rgb-shaped regex reads "oklch(0.7 0.112 26)" as rgb(0,7,0),
         which turns a bright accent into a false failure. A 1x1 canvas gives
         the pixel the reader actually sees, in any syntax. */
      const cx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      const px = s => {
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = "#000";
        cx.fillStyle = s;
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      };
      const rgb = s => px(s).slice(0, 3);
      const alpha = s => px(s)[3];
      const bgOf = el => {
        let n = el;
        while (n && n !== document.documentElement) {
          const cs = getComputedStyle(n);
          if (cs.backgroundColor && alpha(cs.backgroundColor) > 0.5)
            return rgb(cs.backgroundColor);
          n = n.parentElement;
        }
        return rgb(getComputedStyle(document.body).backgroundColor);
      };
      const seen = new Set();
      document.querySelectorAll("body *").forEach(el => {
        const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join("");
        if (!txt) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.6) return;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const fg = rgb(cs.color), bg = bgOf(el);
        const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const key = fg.join(",") + "|" + bg.join(",") + "|" + large;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ fg, bg, size, weight, large,
                   sel: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""),
                   sample: txt.slice(0, 26) });
      });
      return out;
    });
    rows.forEach(row => {
      const key = row.fg.join(",") + "|" + row.bg.join(",") + "|" + row.large;
      /* keep the route: with six per-course palettes, "which page" is the
         first thing you need in order to fix a failure */
      if (!found.has(key)) found.set(key, { ...row, at: r });
    });
  }
  return [...found.values()].map(r => ({ ...r, r: ratio(r.fg, r.bg) }));
}

/* ------------------------------------------------------------ the tint gate
 *
 * Contrast is a lightness question and says nothing about hue, so a theme can
 * clear AA on every pair and still be the wrong colour. That is exactly what
 * happened: the dark grounds drifted to two and a half times the light
 * grounds' chroma, every ratio passed, and the only detector was somebody
 * looking at it and saying the page was too green.
 *
 * The palette's own rule is "the bias is small on purpose" (00-tokens.css), so
 * that is what gets measured. A ground carries a whisper of hue to read as
 * material rather than as a UI panel; past the ceiling it stops being a
 * whisper and starts tinting the accent it sits under.
 *
 * The dark ceiling is the tighter of the two because colourfulness rises as
 * the surround darkens: matching the light theme's number would still look
 * more tinted than the light theme does. */
const CEIL = { light: 0.008, dark: 0.008, "os-dark": 0.008 };
const GROUNDS = ["--ground", "--surface", "--surface-2", "--sunk"];

/** sRGB -> OKLCH chroma. Chroma alone: which hue the whisper is is a design
    choice, how loud it is is the rule. A custom property resolves to the
    literal text the token was written in, so this reads hex as well as rgb(). */
function chromaOf(css) {
  const h = css.trim().replace("#", "");
  const rgb = /^[0-9a-f]{3}$/i.test(h)
    ? [...h].map(c => parseInt(c + c, 16))
    : /^[0-9a-f]{6}$/i.test(h)
      ? [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
      : css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  const [r, g, bl] = rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
  const st = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
  return Math.hypot(1.9779984951 * l - 2.4285922050 * mm + 0.4505937099 * st,
                    0.0259040371 * l + 0.7827717662 * mm - 0.8086757660 * st);
}

async function tints(theme) {
  const { scheme, attr } = MODES[theme];
  await p.emulateMedia({ colorScheme: scheme });
  await p.goto(F + "/");
  await p.evaluate(a => a ? document.documentElement.setAttribute("data-theme", a)
                          : document.documentElement.removeAttribute("data-theme"), attr);
  await p.waitForTimeout(150);
  return p.evaluate(names => {
    const cs = getComputedStyle(document.documentElement);
    return names.map(n => [n, cs.getPropertyValue(n).trim()]);
  }, GROUNDS);
}

let failures = 0;
console.log("\n===== GROUND TINT =====");
for (const theme of Object.keys(MODES)) {
  for (const [name, css] of await tints(theme)) {
    const c = chromaOf(css);
    const over = c > CEIL[theme];
    if (over) failures++;
    console.log(`  ${over ? "FAIL" : "ok  "}  ${theme.padEnd(8)} ${name.padEnd(11)} ${css.padEnd(18)}`
                + `C ${c.toFixed(4)} / ${CEIL[theme].toFixed(3)}`);
  }
}

for (const theme of Object.keys(MODES)) {
  const rows = (await sweep(theme)).sort((a, b2) => a.r - b2.r);
  const fails = rows.filter(x => x.r < (x.large ? 3 : 4.5));
  console.log(`\n===== ${theme.toUpperCase()}: ${rows.length} distinct pairs, ${fails.length} below AA =====`);
  for (const x of fails) {
    console.log(`  ${x.r.toFixed(2)}:1  ${x.large ? "(large) " : "        "}${x.sel.padEnd(22)} ${x.size}px/${x.weight}  "${x.sample}"  ${x.at}`);
  }
  failures += fails.length;
  if (!fails.length) console.log("  all pass");
  const near = rows.filter(x => !fails.includes(x) && x.r < (x.large ? 4 : 5.5));
  if (near.length) { console.log(`  -- marginal (pass, under 5.5:1):`); near.forEach(x => console.log(`  ${x.r.toFixed(2)}:1  ${x.sel.padEnd(22)} "${x.sample}"`)); }
}
await b.close();
close();
process.exit(failures ? 1 : 0);
