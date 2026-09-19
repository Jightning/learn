import { chromium } from "playwright";
import { serveDist } from "../tools/lib/harness.mjs";
const { origin, close } = await serveDist(".");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const go = async h => { await p.goto(origin + "/" + h); await p.waitForTimeout(1000); };
// Study mode, the aside block in s5-1
await go("#/demo/s5-1");
const n = p.locator(".nref").first();
console.log("nref count study:", await p.locator(".nref").count(), "aside cards:", await p.locator(".mnote.is-a").count());
await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
await p.screenshot({ path: ".scratch/aside-study.png" });
// switch to Review
await p.locator(".modesw-b", { hasText: "Review" }).first().click();
await p.waitForTimeout(800);
console.log("after review: nref", await p.locator(".nref").count(), "aside cards", await p.locator(".mnote.is-a").count());
await p.screenshot({ path: ".scratch/review-s5.png" });
// tier stub in review on s1-4
await go("#/demo/s1-4");
console.log("depth now:", await p.evaluate(() => localStorage.getItem("depth:demo")));
await p.waitForTimeout(400);
const st = p.locator(".tstub").first();
console.log("stubs:", await p.locator(".tstub").count());
if (await st.count()) { await st.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); }
await p.screenshot({ path: ".scratch/review-s1-4.png", fullPage: false });
await b.close(); close();
