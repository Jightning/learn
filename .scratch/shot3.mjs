import { chromium } from "playwright";
import { serveDist } from "../tools/lib/harness.mjs";
const { origin, close } = await serveDist(".");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = []; p.on("pageerror", e => errs.push(e.message));
const go = async h => { await p.goto(origin + "/" + h); await p.waitForTimeout(900); };
await go("#/demo/s1-4");
await p.locator(".tscroll").nth(1).scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
await p.locator(".tscroll").nth(1).screenshot({ path: ".scratch/tbl-fixed.png" });
await go("#/demo/s5-1");
await p.locator(".modesw-b", { hasText: "Review" }).first().click();
await p.waitForTimeout(700);
console.log("review: asides", await p.locator(".mnote.is-a").count(), "dtabs", await p.locator(".dtab").count(), "tstub", await p.locator(".tstub").count());
await p.screenshot({ path: ".scratch/review-fixed.png" });
// open a depth tab
await p.locator(".dtab").first().click(); await p.waitForTimeout(400);
await p.screenshot({ path: ".scratch/review-tab-open.png" });
// study mode again
await p.locator(".modesw-b", { hasText: "Study" }).first().click();
await p.waitForTimeout(700);
await p.locator(".tstub-b").first().click(); await p.waitForTimeout(400);
console.log("study after expand: dtabs", await p.locator(".dtab").count());
await p.screenshot({ path: ".scratch/study-expanded.png" });
console.log("errors:", errs);
await b.close(); close();
