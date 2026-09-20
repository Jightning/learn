#!/usr/bin/env node
/* Behavioural tests in a real browser. Loads the built index.html in Chromium
 * and asserts the engine contract for every course it contains.
 *
 *   node tests/browser/app.test.mjs [--shots]
 *
 * --shots also writes screenshots to .shots/ so the result can be looked at.
 */
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serveDist, installDemoFixture } from "../helpers/browser-harness.mjs";
import { testLibrary } from "./features/library.mjs";
import { testCourses } from "./features/course.mjs";
import { testRegressions } from "./features/regressions.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const { origin: ORIGIN, close: closeServer } = await serveDist(ROOT);

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { console.error("playwright not installed.  npm i -D playwright"); process.exit(2); }

const SHOTS = process.argv.includes("--shots");
const shotDir = join(ROOT, ".shots");
if (SHOTS) mkdirSync(shotDir, { recursive: true });

const URL = ORIGIN + "/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("CONSOLE: " + m.text()); });

const R = [];
const ck = (n, ok, x = "") => R.push({ n, ok, x });
const go = async (h = "") => { await page.goto(URL + h); await page.waitForTimeout(450); };
const shot = async name => { if (SHOTS) await page.screenshot({ path: join(shotDir, name + ".png") }); };


const ctx = { ROOT, URL, browser, page, errs, R, ck, go, shot, installDemoFixture,
  sawQueueRow: false };
await testLibrary(ctx);
await testCourses(ctx);
await testRegressions(ctx);

ck("no JavaScript errors", errs.length === 0, errs.join(" | "));
await browser.close();
closeServer();

const bad = R.filter(r => !r.ok);
console.log(`${bad.length ? "FAIL" : "ok  "} dist/       ${R.length - bad.length}/${R.length} checks` +
  (SHOTS ? ` · screenshots in .shots/` : ""));
bad.forEach(r => console.log(`       ✗ ${r.n}${r.x ? "  [" + r.x + "]" : ""}`));
process.exit(bad.length ? 1 : 0);
