import { chromium } from "playwright";
import { serveDist } from "../tools/lib/harness.mjs";
const OUT = ".scratch";
const { origin, close } = await serveDist(".");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const go = async h => { await p.goto(origin + "/" + h); await p.waitForTimeout(900); };
await go("#/demo/s1-4");
const tabs = p.locator(".tscroll");
console.log("tables on page:", await tabs.count());
for (let i = 0; i < await tabs.count(); i++) {
  const cap = await tabs.nth(i).locator("caption").innerText().catch(() => "");
  console.log(i, JSON.stringify(cap));
  await tabs.nth(i).scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  await tabs.nth(i).screenshot({ path: `${OUT}/tbl-${i}.png` });
}
await b.close(); close();
