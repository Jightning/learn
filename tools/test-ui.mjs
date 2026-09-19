#!/usr/bin/env node
/* Behavioural tests in a real browser. Loads the built index.html in Chromium
 * and asserts the engine contract for every course it contains.
 *
 *   node tools/test-ui.mjs [--shots]
 *
 * --shots also writes screenshots to .shots/ so the result can be looked at.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serveDist, installPacked } from "./lib/harness.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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
/* Scoped assertions that allow "absent" need one place that proves the thing
   is ever present, or a feature that stopped rendering everywhere would pass
   every per-course check in the sweep. */
let sawQueueRow = false;
let sawAside = false;      /* a course aside survived the switch to Review */
let sawDepthTab = false;   /* a collapsed run drew its margin tab */
const go = async (h = "") => { await page.goto(URL + h); await page.waitForTimeout(450); };
const shot = async name => { if (SHOTS) await page.screenshot({ path: join(shotDir, name + ".png") }); };

await go();

/* Only the courses in PUBLIC reach dist/, so the deployment ships one. The
   rest are private and arrive the way a reader's own courses do — through the
   import control — which both restores full coverage here and exercises that
   path on every run. */
const installed = await installPacked(page, ROOT);
if (installed) {
  const failed = await page.locator(".cio-msg.bad").count();
  ck("packed courses install", failed === 0,
     failed ? await page.locator(".cio-msg.bad").first().innerText() : `${installed} courses`);
  await go();
}

/* the app does not expose its data, so drive it through the DOM instead */
const courseIds = await page.evaluate(() =>
  [...document.querySelectorAll(".lcard .lhit")].map(a => a.getAttribute("href").slice(2)));
const single = courseIds.length === 0;
let ids = courseIds;

if (single) {
  /* one course redirects straight past the picker */
  const cid = await page.evaluate(() => (location.hash.match(/#\/([^/]+)/) || [])[1]);
  ids = [cid];
  ck("single course opens directly", !!cid, cid);
} else {
  ck("library lists courses", courseIds.length > 0, courseIds.join(", "));
  /* the picker has no sidebar, so it must not render inside the reserved
     sidebar track — it once did, at 308px of a 1440px viewport */
  const libW = await page.evaluate(() =>
    document.querySelector("main").getBoundingClientRect().width / innerWidth);
  ck("library uses the full width", libW > 0.9, Math.round(libW * 100) + "% of viewport");
  /* each card wears its own course's accent rotation. Two courses may pick the
     same hue, so the invariant is that the accent tracks the hue, not that all
     cards differ: as many distinct accents as there are distinct hues. */
  const hues = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".lcard")];
    return {
      h: new Set(cards.map(a => getComputedStyle(a).getPropertyValue("--hue").trim())).size,
      c: new Set(cards.map(a => getComputedStyle(a).borderTopColor)).size
    };
  });
  ck("card accent follows the course hue", hues.c === hues.h,
     hues.c + " accents / " + hues.h + " hues");
  await shot("library");

  /* Adding is a dialog behind a plus, not a slab under the shelf. */
  ck("the shelf carries an add control", await page.locator("#lib-add").count() === 1);
  await page.locator("#lib-add").click(); await page.waitForTimeout(220);
  ck("add opens a dialog", await page.locator("dialog.modal[open]").count() === 1);
  ck("the dialog holds the install controls",
     await page.locator(".modal .cio-foot .dbtn").count() >= 1);
  await shot("library-add");
  await page.keyboard.press("Escape"); await page.waitForTimeout(220);
  ck("escape closes the dialog", await page.locator(".modal").count() === 0);
  /* The top layer is what keeps it on screen once the reading column is
     zoomed: a fixed overlay inside .wrap is laid out against the zoomed
     column, not the viewport. */
  await page.keyboard.press("Control+Equal");
  await page.keyboard.press("Control+Equal");
  await page.waitForTimeout(250);
  await page.locator("#lib-add").click(); await page.waitForTimeout(250);
  const z = await page.evaluate(() => {
    const m = document.querySelector(".modal").getBoundingClientRect();
    return { on: m.top >= 0 && m.bottom <= innerHeight && m.left >= 0 && m.right <= innerWidth,
             box: [Math.round(m.top), Math.round(m.height)] };
  });
  ck("the dialog ignores the reading column's zoom", z.on, z.box.join("/"));
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  await page.keyboard.press("Control+Digit0"); await page.waitForTimeout(200);

  /* Removal acts on the card it belongs to, and only on courses this device
     installed — the built-in one ships with the site and cannot be dropped. */
  /* Management moved behind each card's overflow, so "can be taken off the
     shelf" is now a claim about *reachability* rather than about a button
     existing in the markup. Each card's menu is therefore actually opened —
     which is the only way to assert the reader can get there, and the failure
     the shallower check would have missed is a control that renders but never
     mounts. */
  const ops = await page.evaluate(() => ({
    cards: document.querySelectorAll(".lcard").length,
    hit: document.querySelectorAll(".lcard .lhit").length
  }));
  ck("every card opens its course", ops.hit === ops.cards, `${ops.hit}/${ops.cards}`);

  let gone = 0, exports = 0;
  for (let i = 0; i < ops.cards; i++) {
    const card = page.locator(".lcard").nth(i);
    await card.locator(".lmore").click();
    await page.waitForTimeout(90);
    if (await card.locator(".lop.warn").count()) gone++;
    /* The grab handle wears .lop too and is on every card, so it has to be
       excluded here — otherwise "only imported courses offer export" passes on
       a control that has nothing to do with exporting. */
    if (await card.locator(".lop:not(.warn):not(.lmore):not(.lgrab)").count()) exports++;
  }
  /* Close the last one, so the state the following checks see is the resting
     one rather than whatever this loop left open. */
  await page.locator(".lcard").nth(ops.cards - 1).locator(".lmore").click();
  await page.waitForTimeout(90);

  /* Every course can leave the shelf — a bundled one is hidden rather than
     deleted, since the next load would bring it back either way. Only a course
     this device holds the bytes for can be exported. */
  ck("every card can be taken off the shelf", gone === ops.cards,
     `${gone} of ${ops.cards}`);
  ck("only imported courses offer export", exports === ops.cards - 1 || exports === ops.cards,
     `${exports} of ${ops.cards} exportable`);

  const before = ops.cards;

  /* Remove and Hide do opposite things to the reader's answers — Remove purges
     them (lib/purge.js), Hide keeps them because it is reversible — so the two
     dialogs have to say opposite things. A confirmation that promised the wrong
     one would be the most expensive sentence in the product. */
  /* Management is behind the card's overflow now, so reaching Remove or Hide is
     two presses: open one card's menu, then read what its warn button says.
     The menu is exclusive — pressing another card's control closes this one —
     so the cards can simply be walked in order.
     
     It is a loop with awaits rather than one page.evaluate because the menu is
     component state: the button does not exist in the DOM until Preact has
     re-rendered, which a synchronous evaluate cannot wait for. */
  const openConfirm = async word => {
    const n = await page.locator(".lcard").count();
    for (let i = 0; i < n; i++) {
      const card = page.locator(".lcard").nth(i);
      const more = card.locator(".lmore");
      if (!(await more.count())) continue;
      await more.click();
      await page.waitForTimeout(90);
      const warn = card.locator(".lop.warn");
      if (!(await warn.count())) continue;
      if ((await warn.innerText()).trim() === word) { await warn.click(); return true; }
    }
    return false;
  };

  /* Opening a course is the only thing on the card that should compete for the
     reader. Export and Remove used to sit on the face at the weight of the
     title — two admin controls, one destructive, on the object you are trying
     to open. */
  ck("the card face carries no management controls",
     await page.locator(".lcard .lop:not(.lmore)").count() === 0);
  ck("management is behind one control per card",
     await page.locator(".lcard .lmore").count() === await page.locator(".lcard").count());
  /* And the card reports on the reading rather than on the box: an inventory
     until there is history, the history once there is. */
  ck("an untouched card says how big the course is",
     /\d+ sections/.test(await page.locator(".lcard .lstat").first().innerText()));

  /* ------------------------------------------------------------ reordering
   * Where a course sits on the shelf is the reader's, not the build's.
   *
   * The arrow keys are asserted first, and not because a drag is hard to
   * automate: they are the only way this is reachable without a mouse at all,
   * so they are the path that has to hold. The drag is checked after, through
   * the browser's own HTML5 drag-and-drop, because the handle is what a mouse
   * actually reaches for.
   *
   * Four claims: the move happens, focus travels with the card (or a second
   * press goes to the page instead), the new order survives a reload — it is a
   * preference, not view state — and an arrow at the end of the shelf moves
   * nothing rather than wrapping a card to the far end. */
  if (ops.cards > 1) {
    const shelf = () => page.evaluate(() =>
      [...document.querySelectorAll(".lcard .lhit")].map(a => a.getAttribute("href").slice(2)));
    /* The handle lives behind the same overflow as Export and Remove, so
       reaching it is a press — and the menu is exclusive and toggling, so this
       opens one only when it is not already open. */
    const handle = async i => {
      const card = page.locator(".lcard").nth(i);
      if (!(await card.locator(".lgrab").count())) {
        await card.locator(".lmore").click();
        await page.waitForTimeout(120);
      }
      return card.locator(".lgrab");
    };
    const start = await shelf();

    ck("the handle is behind the card's overflow, like the rest of management",
       await page.locator(".lcard .lgrab").count() === 0,
       (await page.locator(".lcard .lgrab").count()) + " on the card face");
    const grab = await handle(0);
    ck("the card's menu offers one", await grab.count() === 1);

    await grab.focus();
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(250);
    const moved = await shelf();
    ck("an arrow key moves the course along the shelf",
       moved[0] === start[1] && moved[1] === start[0],
       `${start.join(",")} -> ${moved.join(",")}`);
    ck("the handle keeps focus across the move",
       await page.evaluate(() => !!document.activeElement?.classList.contains("lgrab")));

    await go();
    ck("the order is the reader's and survives a reload",
       (await shelf()).join(",") === moved.join(","), (await shelf()).join(","));

    /* Back the other way, which asserts the reverse key on the same card. */
    await (await handle(1)).focus();
    await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(250);
    ck("the reverse key puts it back",
       (await shelf()).join(",") === start.join(","), (await shelf()).join(","));
    await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(250);
    ck("an arrow at the end of the shelf moves nothing",
       (await shelf()).join(",") === start.join(","), (await shelf()).join(","));

    /* The mouse path: a real drag from the handle onto another card lands the
       course at that card's place. */
    await handle(0);
    await page.dragAndDrop(".lgrid .lcard:nth-child(1) .lgrab", ".lgrid .lcard:nth-child(2)");
    await page.waitForTimeout(300);
    const dragged = await shelf();
    ck("dragging the handle onto another card moves it there",
       dragged[0] === start[1] && dragged[1] === start[0],
       `${start.join(",")} -> ${dragged.join(",")}`);

    /* Leave the shelf as it was found: everything below counts cards and reads
       the first one. */
    await (await handle(1)).focus();
    await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(250);
    ck("the shelf is back the way it was found",
       (await shelf()).join(",") === start.join(","), (await shelf()).join(","));
    await go();
  }

  await openConfirm("Remove"); await page.waitForTimeout(220);
  ck("removal asks first", await page.locator(".modal.danger").count() === 1);
  const removeSays = await page.locator(".modal.danger").innerText();
  ck("removing says the answers go too",
     /* The wording is the author's; what is asserted is that both halves of the
        promise are made — irreversible, and the answers go too. */
     /answers[^.]*deleted/i.test(removeSays) && /cannot be undone/i.test(removeSays),
     removeSays.replace(/\s+/g, " "));
  /* A question waits in front of the reader; a notification slides in along an
     edge. The confirm is the first kind, and on a desktop it was rendering as
     the second: `.lib>*:last-child{margin-bottom:0}` matched the dialog and
     zeroed the bottom half of the `margin:auto` the browser centres it with,
     so it sat on the viewport floor. Measured rather than asserted on the
     rule, because any later rule reaching the dialog's margin breaks it the
     same way. The phone sheet is a deliberate exception and is checked
     alongside it, so a fix to one cannot quietly undo the other. */
  {
    const box = () => page.evaluate(() => {
      const r = document.querySelector("dialog[open]").getBoundingClientRect();
      return { top: Math.round(r.top), gap: Math.round(innerHeight - r.bottom) };
    });
    const wide = await box();
    ck("the confirm sits in the middle of a desktop window",
       Math.abs(wide.top - wide.gap) <= 2, `top ${wide.top} / bottom ${wide.gap}`);

    await page.setViewportSize({ width: 390, height: 780 });
    await page.waitForTimeout(250);
    const narrow = await box();
    ck("the confirm stays centred on a phone rather than docking",
       Math.abs(narrow.top - narrow.gap) <= 2, `top ${narrow.top} / bottom ${narrow.gap}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);
  }

  await shot("library-remove");
  await page.locator(".modal.danger .dbtn.ghost").click(); await page.waitForTimeout(220);
  ck("cancelling removes nothing",
     await page.locator(".modal").count() === 0 &&
     await page.locator(".lcard").count() === before);

  /* An icon set is only correct if the page points at it and the platform
     constraints hold: iOS needs an opaque 180, Android crops to a circle, and
     the tab falls back to favicon.ico when SVG is not understood. */
  const icons = await page.evaluate(async () => {
    const link = sel => document.querySelector(sel)?.getAttribute("href") || "";
    const head = {
      svg: link('link[rel="icon"][type="image/svg+xml"]'),
      ico: link('link[rel="alternate icon"]'),
      apple: link('link[rel="apple-touch-icon"]'),
      themes: [...document.querySelectorAll('meta[name="theme-color"]')]
        .map(m => m.getAttribute("content"))
    };
    const status = {};
    for (const [k, href] of Object.entries(head)) {
      if (typeof href !== "string" || !href) continue;
      status[k] = (await fetch(href, { method: "GET" })).status;
    }
    const manifest = await (await fetch(link('link[rel="manifest"]'))).json();
    /* Every pixel opaque: iOS composites transparency onto black. */
    const img = new Image();
    img.src = head.apple;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = img.width;
    c.getContext("2d").drawImage(img, 0, 0);
    const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let clear = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) clear++;
    return { head, status, manifest, appleSize: img.width, clear };
  });
  ck("the page points at an SVG favicon and an ICO fallback",
     /icon\.svg/.test(icons.head.svg) && /favicon\.ico/.test(icons.head.ico));
  ck("every icon the head names is actually served",
     Object.values(icons.status).every(s => s === 200), JSON.stringify(icons.status));
  ck("the apple icon is 180 square", icons.appleSize === 180, String(icons.appleSize));
  ck("and fully opaque, as iOS requires", icons.clear === 0, `${icons.clear} translucent pixels`);
  ck("the manifest declares a maskable icon",
     (icons.manifest.icons || []).some(i => i.purpose === "maskable"));
  ck("the browser chrome uses the app's own ground, per scheme",
     icons.head.themes.includes("#DFE3E9") && icons.head.themes.includes("#101319"),
     icons.head.themes.join(" "));

  /* The backup belongs to whoever holds the secret, and the site is public, so
     a reader without one must not be shown it, told about it, or able to spend
     its quota. The setup route is reachable only by knowing it. */
  const seenByVisitor = await page.evaluate(() => ({
    panel: document.querySelectorAll(".cloud").length,
    words: /backup|cloudflare|secret/i.test(document.querySelector(".lib").innerText)
  }));
  ck("a reader without the secret sees no backup panel", seenByVisitor.panel === 0);
  ck("and is told nothing about a backend", !seenByVisitor.words);

  await go("#/sync");
  ck("the setup route exists for whoever knows it",
     await page.locator("#cloud-secret").count() === 1);
  await page.fill("#cloud-secret", "suite-secret");
  await page.locator("#cloud-sync").click(); await page.waitForTimeout(400);
  await go();
  ck("entering a secret is what makes a device the owner's",
     await page.locator(".cloud").count() === 1);
  /* Put it back: the rest of the suite runs as an ordinary reader. */
  await page.locator("#cloud-forget").click(); await page.waitForTimeout(400);
  await go();
  ck("forgetting the secret removes it again", await page.locator(".cloud").count() === 0);

  /* The bundled guide: hidden, then brought back from the Add dialog. Its
     entry survives the hiding, so a link to it still opens. */
  const demo = await page.evaluate(() =>
    [...document.querySelectorAll(".lcard")]
      .find(c => c.querySelector(".lhit").getAttribute("href") === "#/demo")
      ?.querySelector(".lop.warn")?.textContent.trim());
  if (demo) {
    ck("the bundled course says hide, not remove", demo === "Hide", demo);
    await page.evaluate(() => [...document.querySelectorAll(".lcard")]
      .find(c => c.querySelector(".lhit").getAttribute("href") === "#/demo")
      .querySelector(".lop.warn").click());
    await page.waitForTimeout(200);
    const hideSays = await page.locator(".modal.danger").innerText();
    ck("hiding says the answers are kept, and that it comes back",
       /answers are kept/i.test(hideSays) && /add this back/i.test(hideSays),
       hideSays.replace(/\s+/g, " "));
    await page.locator("#lib-drop").click(); await page.waitForTimeout(300);
    ck("the bundled course leaves the shelf",
       await page.locator(".lcard").count() === before - 1);
    /* Hidden is not gone: the route still resolves, which is what keeps an old
       link and an id collision honest. */
    await go("#/demo");
    ck("a hidden course still opens from a link",
       await page.locator(".desk h1").count() === 1);
    await go();
    ck("hiding survives a reload", await page.locator(".lcard").count() === before - 1);
    await page.locator("#lib-add").click(); await page.waitForTimeout(250);
    ck("the add dialog offers it back",
       await page.locator('[data-restore="demo"]').count() === 1);
    await page.locator('[data-restore="demo"]').click(); await page.waitForTimeout(300);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    ck("restoring puts it back", await page.locator(".lcard").count() === before);
  }

  /* The Home Screen advice is for a reader who is not already there. WebKit
     deletes an origin's storage after seven days without a visit and installing
     is the exemption, so once installed the sentence names a rule that no
     longer applies and an action already taken. Driven under an iOS user agent
     because that is the only place the warning is shown at all. */
  const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 " +
              "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  for (const [where, standalone] of [["a Safari tab", false], ["the Home Screen", true]]) {
    const ip = await browser.newPage({ viewport: { width: 390, height: 844 },
                                       isMobile: true, hasTouch: true, userAgent: IOS });
    await ip.addInitScript(on => {
      Object.defineProperty(navigator, "standalone", { get: () => on, configurable: true });
      const mm = window.matchMedia.bind(window);
      window.matchMedia = q => /display-mode/.test(q)
        ? { matches: on && /standalone/.test(q), media: q,
            addEventListener() {}, removeEventListener() {},
            addListener() {}, removeListener() {} }
        : mm(q);
      /* storage that is never granted persistence, which is the case the
         warning exists for */
      if (navigator.storage) {
        navigator.storage.persisted = async () => false;
        navigator.storage.persist = async () => false;
      }
    }, standalone);
    await ip.goto(URL); await ip.waitForTimeout(400);
    await installPacked(ip, ROOT);
    await ip.goto(URL); await ip.waitForTimeout(1100);
    const warn = await ip.locator(".cio-warn").count();
    ck(`on ${where} the install advice is ${standalone ? "silent" : "shown"}`,
       standalone ? warn === 0 : warn === 1, "warnings: " + warn);
    await ip.close();
  }
}

for (const cid of ids) {
  const P = n => `${cid}: ${n}`;
  await go(`#/${cid}`);
  ck(P("course home renders"), await page.locator(".desk h1").isVisible());
  const nSections = await page.locator(".spine .srow").count();
  ck(P("the spine lists sections"), nSections > 0, nSections + " sections");

  /* The Desk's whole claim is that it answers "what now" before it reports
     anything. A course with no history has to open on an action that goes
     somewhere real, and it has to carry the reason — a bare button is the
     dashboard again with one fewer number. */
  const lead = await page.evaluate(() => {
    const a = document.querySelector(".desk .now");
    if (!a) return null;
    const spine = document.querySelector(".spine");
    return {
      href: a.getAttribute("href"),
      title: (a.querySelector(".now-h") || {}).textContent || "",
      why: (a.querySelector(".now-w") || {}).textContent || "",
      /* above the fold in the sense that matters: before the contents */
      first: !!spine && a.compareDocumentPosition(spine) & Node.DOCUMENT_POSITION_FOLLOWING
    };
  });
  ck(P("the course opens on one recommendation"), !!lead && !!lead.href,
     JSON.stringify(lead));
  ck(P("the recommendation says why"), !!lead && lead.why.length > 10,
     lead ? lead.why : "");
  ck(P("the recommendation comes before the contents"), !!lead && !!lead.first);
  /* It must resolve. A recommendation pointing at a route that renders nothing
     is worse than no recommendation, and it is exactly what a stale reading
     position or an off-by-one over the sections would produce. */
  if (lead && lead.href) {
    await go(lead.href);            /* go() takes the hash, # included */
    const landed = await page.evaluate(() =>
      !!document.querySelector("section.sec-body, .review, .practice, .desk"));
    ck(P("the recommendation resolves to a view"), landed, lead.href);
    await go(`#/${cid}`);
  }
  await shot(cid + "-home");

  const secIds = await page.evaluate(() =>
    [...document.querySelectorAll(".spine .srow")].map(a => a.getAttribute("href").split("/").pop()));
  const last = secIds[secIds.length - 1];

  await go(`#/${cid}/${last}`);
  ck(P("one section in the flow"), await page.locator("section.sec-body").count() === 1);
  ck(P("no end-of-section dump"), await page.locator(".refby").count() === 0);

  /* T7/T8: the measure is a property of the face, not the pixel width, so it
     is measured rather than assumed — changing the body font moves it. */
  const cpl = await page.evaluate(() => {
    const para = [...document.querySelectorAll(".bmain p")].find(e => e.textContent.length > 200);
    if (!para) return null;
    const cs = getComputedStyle(para);
    const probe = document.createElement("span");
    probe.style.cssText = `font:${cs.font};visibility:hidden;position:absolute;white-space:pre`;
    probe.textContent = "abcdefghijklmnopqrstuvwxyz".repeat(2);
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width / 52;
    probe.remove();
    return Math.round(para.getBoundingClientRect().width / w);
  });
  if (cpl) ck(P("reading measure is 50-75 characters"), cpl >= 50 && cpl <= 75, cpl + " CPL");

  /* T7 must hold at the reader's text size too, not only the default. A px-locked
     body once made the UI scale while the prose did not. */
  const cplLarge = await page.evaluate(() => {
    document.documentElement.style.fontSize = "22px";
    const para = [...document.querySelectorAll(".bmain p")].find(e => e.textContent.length > 200);
    if (!para) return null;
    const cs = getComputedStyle(para);
    const s = document.createElement("span");
    s.style.cssText = `font:${cs.font};visibility:hidden;position:absolute;white-space:pre`;
    s.textContent = "abcdefghijklmnopqrstuvwxyz".repeat(2);
    document.body.appendChild(s);
    const w = para.getBoundingClientRect().width / (s.getBoundingClientRect().width / 52);
    s.remove();
    document.documentElement.style.fontSize = "";
    return Math.round(w);
  });
  if (cplLarge) ck(P("measure holds at 22px text"), cplLarge >= 50 && cplLarge <= 75, cplLarge + " CPL");

  /* T41: uppercase is for labels the reader scans. The renderer cannot tell a
     label from a sentence, so the check is the string — anything set in caps
     that runs past a short label is being shouted at the reader. Captions, the
     why_prompt, the answer and the course meta line all used to fail this. */
  const shouted = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll("body *")) {
      if (getComputedStyle(el).textTransform !== "uppercase") continue;
      if ([...el.children].some(c => getComputedStyle(c).textTransform === "uppercase")) continue;
      const t = el.textContent.trim().replace(/\s+/g, " ");
      if (t && t.split(" ").length > 5) bad.push(t.slice(0, 40));
    }
    return [...new Set(bad)];
  });
  ck(P("nothing longer than a label is set in caps"), shouted.length === 0, shouted.slice(0, 2).join(" | "));

  /* A row flow gives every step an equal share of the width, so a step is not
     as wide as its longest word: an unbreakable token was drawn straight
     through the step's border. Nothing inside a figure may exceed its own box
     unless that box is a scroll container. */
  const spill = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll(".fx-step, .fcap, .fx-leg span")) {
      const cs = getComputedStyle(el);
      if (cs.overflowX !== "visible") continue;
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        bad.push(el.className + " by " + (el.scrollWidth - el.clientWidth) + "px");
    }
    return bad;
  });
  ck(P("no figure step is drawn outside its own box"), spill.length === 0, spill.slice(0, 2).join(" "));

  /* The toolbar's contents line up with the reading column beneath it: the
     breadcrumb starts where the heading starts. They were 71px apart. */
  const crumbAlign = await page.evaluate(() => {
    const crumb = document.querySelector(".crumb").getBoundingClientRect();
    const text = document.querySelector(".bmain").getBoundingClientRect();
    return Math.round(Math.abs(crumb.left - text.left));
  });
  ck(P("the breadcrumb starts where the prose does"), crumbAlign <= 1, crumbAlign + "px apart");

  /* Collapsing the sidebar gives the reader the space rather than spending it
     on gutter, and cannot strand a narrow reader with no navigation at all. */
  if (await page.locator(".tuck").count()) {
    await page.locator(".tuck").click();
    await page.waitForTimeout(250);
    const t = await page.evaluate(() => {
      const b = document.querySelector(".bmain").getBoundingClientRect();
      const w = document.querySelector(".wrap").getBoundingClientRect();
      return {
        off: Math.round(Math.abs(b.left + b.width / 2 - innerWidth / 2)),
        gutter: Math.round(innerWidth - w.right),
        overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth)
      };
    });
    ck(P("tucked, the reading column is centred"), t.off <= 2, t.off + "px off centre");
    ck(P("tucked, the rail keeps a gutter"), t.gutter >= 20 && !t.overflow,
       t.gutter + "px, overflow " + t.overflow);
    /* Tucked is the one state where the bar does *not* follow the column.
       Holding the alignment here left the crumb 420px in with 420px of empty
       chrome to its left — the whole vacated sidebar, unused, while the trail
       truncated on the right. So it takes the page's own gutter instead, and
       the column stays centred where the two checks above put it. */
    const tuckedCrumb = await page.evaluate(() => {
      const crumb = document.querySelector(".crumb").getBoundingClientRect();
      const text = document.querySelector(".bmain").getBoundingClientRect();
      /* The gutter, resolved in pixels: --wrap-pad is a rem below 90em, so the
         token's own text does not compare against a rect. The wrap declares
         the same `--wrap-pad + --safe-l` in 10-shell.css and computes it. */
      const pad = parseFloat(getComputedStyle(document.querySelector(".wrap")).paddingLeft);
      return { gutter: Math.round(crumb.left), pad: Math.round(pad),
               fromProse: Math.round(text.left - crumb.left) };
    });
    ck(P("tucked, the breadcrumb takes the page gutter"),
       Math.abs(tuckedCrumb.gutter - tuckedCrumb.pad) <= 1,
       `${tuckedCrumb.gutter}px in, gutter is ${tuckedCrumb.pad}px`);
    ck(P("tucked, the column does not follow the crumb left"),
       tuckedCrumb.fromProse > 100, tuckedCrumb.fromProse + "px apart");

    await page.setViewportSize({ width: 390, height: 800 });
    await page.waitForTimeout(250);
    const stranded = await page.evaluate(() => !document.querySelector(".sidebar"));
    ck(P("the tuck does not strand a narrow reader"), !stranded);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(220);

    /* The preference outlives the course, and the library has no sidebar to
       apply it to: `tucked` was set there anyway, so the reading-column rules
       ran over a view that has no reading column and the shelf sat 171px right
       of centre with the vacated sidebar width empty beside it. Checked from a
       tucked course, because that is the only way to arrive in that state. */
    await go("#/");
    const shelf = await page.evaluate(() => {
      const r = document.querySelector(".lib").getBoundingClientRect();
      return Math.round(Math.abs(r.left - (innerWidth - r.right)));
    });
    ck(P("the library ignores a tuck it has no sidebar for"), shelf <= 2,
       shelf + "px off centre");
    await go(`#/${cid}/${last}`);

    /* the control that brings it back is the tab, not the one that hid it */
    await page.locator(".untuck").click();
    await page.waitForTimeout(220);
  }

  /* T6: a control pushed off-screen is unreachable. The toolbar used to put
     Theme and Reset past the right edge on a phone. */
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(250);
  const narrow = await page.evaluate(() => {
    const bar = document.querySelector(".topbar");
    const shown = [...bar.querySelectorAll(".tbtn")].filter(b => b.offsetParent !== null);
    const mid = b => { const r = b.getBoundingClientRect(); return r.top + r.height / 2; };
    return {
      overflow: document.body.scrollWidth > window.innerWidth + 1,
      offscreen: shown.filter(b => b.getBoundingClientRect().right > window.innerWidth + 1).length,
      barH: Math.round(bar.getBoundingClientRect().height),
      rows: new Set(shown.map(b => Math.round(mid(b)))).size,
      /* What the toolbar sheds has to still exist. It is in the sidebar now,
         under Settings, at every width rather than only below this
         breakpoint — so this counts the panel's contents rather than asking
         whether a mobile-only band is showing. */
      shed: document.querySelectorAll(".axes-acts .lane-b").length,
      queue: [...document.querySelectorAll(".navtop .rv-row")].map(a => ({
        href: a.getAttribute("href"),
        count: (a.querySelector(".rv-n") || {}).textContent || null
      }))
    };
  });
  ck(P("no horizontal overflow at 390px"), !narrow.overflow);
  ck(P("no toolbar control off-screen at 390px"), narrow.offscreen === 0, narrow.offscreen + " clipped");
  /* The toolbar is sticky, so its height is charged against the reading area
     for the whole session. It was 142px of a 664px viewport, in two wrapped
     rows, before the secondary controls moved into the drawer. */
  ck(P("toolbar is one row on a phone"), narrow.rows === 1, narrow.rows + " rows");
  ck(P("toolbar costs under a sixth of a phone screen"), narrow.barH < 800 / 6, narrow.barH + "px");
  ck(P("the controls it sheds are in the sidebar"), narrow.shed >= 2,
     narrow.shed + " under Settings");
  /* The row is scoped to this course, so a course with no drill bank of its
     own has none — which is most of them, and asserting one unconditionally
     asserted that every course runs a review schedule. What has to hold is
     that there is never more than one, and that the one there is points at
     this course and carries its count. */
  ck(P("at most one review row, and it is this course's"),
     narrow.queue.length <= 1
     && narrow.queue.every(r => r.href === `#/${cid}/review` && /^\d+$/.test((r.count || "").trim())),
     JSON.stringify(narrow.queue));
  if (narrow.queue.length) sawQueueRow = true;

  /* WCAG 2.5.8 is 24px; 44px is the platform guidance. Inline links inside a
     sentence are exempt and excluded. Measured by hit-testing rather than by
     reading boxes, because a target may be widened by a pseudo-element. */
  const taps = await page.evaluate(() => {
    const small = [];
    for (const el of document.querySelectorAll(
      ".topbar .tbtn, .crumb-home, .cbtn, .gbtn, .dtab, .note-pull")) {
      const r0 = el.getBoundingClientRect();
      if (!r0.width || !r0.height) continue;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const owns = y => { const t = document.elementFromPoint(cx, y); return t === el || el.contains(t); };
      let up = 0, down = 0;
      while (up < 24 && owns(cy - up - 1)) up++;
      while (down < 24 && owns(cy + down + 1)) down++;
      if (up + down < 24) small.push(el.className + ":" + (up + down));
    }
    return small;
  });
  ck(P("every control is at least 24px tappable"), taps.length === 0, taps.slice(0, 3).join(" "));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(250);
  await shot(cid + "-section");

  /* A flow figure is an ordered list with CSS connectors. It used to emit
     arrow characters between boxes, and the arrow — centred in the figure —
     never lined up with boxes sized by their own text. */
  const flows = await page.locator(".fx-flow").count();
  if (flows) {
    const flow = await page.evaluate(() => {
      const f = document.querySelector(".fx-flow");
      const steps = [...f.querySelectorAll(".fx-step")];
      return {
        ol: f.tagName === "OL",
        strayArrows: document.querySelectorAll(".fx-arr").length,
        /* every step starts on the same left edge, or in a row every step
           shares one top edge — either way nothing is half-aligned */
        aligned: new Set(steps.map(e => Math.round(e.getBoundingClientRect().left))).size === 1 ||
                 new Set(steps.map(e => Math.round(e.getBoundingClientRect().top))).size === 1,
        /* A figure may be wider than the reading column — a graph past a
           handful of nodes, a row of flow steps each holding a note that needs
           a measure of its own. `.figure` is overflow-x:auto precisely so it
           can be, and it carries the shading that says an edge is hiding
           something. What must never happen is the *page* growing a second
           axis, which is what an unframed overflow does. */
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    ck(P("flow figure is an ordered list"), flow.ol);
    ck(P("flow figure has no stray arrow glyphs"), flow.strayArrows === 0);
    ck(P("flow steps share an edge"), flow.aligned);
    ck(P("a wide figure scrolls its frame, not the page"), flow.page <= 1,
       flow.page + "px of page overflow");
  }

  /* Questions are separate cards, not one wall of text. */
  const qGap = await page.evaluate(() => {
    const q = document.querySelectorAll(".q");
    if (q.length < 2) return null;
    return Math.round(q[1].getBoundingClientRect().top - q[0].getBoundingClientRect().bottom);
  });
  if (qGap !== null) ck(P("questions are spaced apart"), qGap >= 12, qGap + "px");

  /* A margin stack is a margin, not a second column of prose. */
  const stack = await page.evaluate(() =>
    Math.max(0, ...[...document.querySelectorAll(".bside")].map(a => a.querySelectorAll(".mnote:not(.is-x):not(.is-f)").length)));
  ck(P("margin card stacks are bounded"), stack <= 2, stack + " cards");

  /* A row is as tall as the taller of the block and its card, so a card beside
     a one-line heading is paid for with a hole in the reading column. "Used
     later in" rides the first block instead, and where that block already
     carries reference cards it gives up its titles rather than the row. */
  const headCard = await page.evaluate(() =>
    [...document.querySelectorAll(".brow:has(h3) .bside .mnote.is-f")].length);
  ck(P("no full card beside a heading"), headCard === 0, headCard + " rows");
  const ulStack = await page.evaluate(() =>
    [...document.querySelectorAll(".bside:has(.mnote.is-f)")]
      .filter(a => a.querySelector(".mnote:not(.is-f)")
                && !a.querySelector(".mnote.is-f .mn-chips")).length);
  ck(P("used-later yields to reference cards"), ulStack === 0, ulStack + " rows");

  /* Maths is rendered at build time, so if it is wrong it is wrong here. */
  const maths = await page.locator(".katex").count();
  if (maths) {
    const m = await page.evaluate(() => {
      const k = document.querySelector(".katex");
      const mml = document.querySelector(".katex-mathml");
      const glyph = k.querySelector(".katex-html .mord");
      return {
        drew: !!glyph && glyph.getBoundingClientRect().width > 0,
        face: glyph ? getComputedStyle(glyph).fontFamily : "",
        /* KaTeX ships the equation twice; the MathML twin is for assistive
           technology and must never be painted, or every formula doubles */
        mathmlHidden: !mml || mml.getBoundingClientRect().height < 2
      };
    });
    ck(P("equations render"), m.drew);
    ck(P("KaTeX fonts are present"), /KaTeX/.test(m.face), m.face);
    ck(P("the MathML twin is not painted"), m.mathmlHidden);
  }

  /* figures must actually draw, not fail silently */
  const figs = await page.locator(".figure").count();
  if (figs) {
    const drawn = await page.locator(".figure svg, .figure .fx-flow, .figure .fx-grid, .figure .fx-mx, .figure .fx-tm").count();
    ck(P("figures draw a body"), drawn >= figs, `${drawn}/${figs}`);
  }
  ck(P("no render errors"), await page.locator(".blabel", { hasText: /Render error|Unknown block/ }).count() === 0);
  ck(P("no unrendered figure or block"), await page.locator(".fx-miss").count() === 0);

  /* A course may register its own block and style it from its own `styles`.
     Both were supported and unexercised; ECE 20001 uses both. */
  const custom = await page.evaluate(() => {
    const el = document.querySelector("svg.sc");
    if (!el) return null;
    const wire = el.querySelector(".sc-w");
    return { drew: !!wire, styled: wire && getComputedStyle(wire).strokeWidth !== "1px" };
  });
  if (custom) {
    ck(P("a course's own block renders"), custom.drew);
    ck(P("a course's own styles apply"), custom.styled);
  }
  ck(P("no unresolved figure references"), await page.locator(".xr-miss").count() === 0);

  /* a caption is citable only once it carries a number */
  const capped = await page.locator(".fcap, figcaption").count();
  if (capped) {
    const numbered = await page.locator(".fcap .fnum, figcaption .fnum").count();
    ck(P("captions are numbered"), numbered === capped, `${numbered}/${capped}`);
  }

  /* T6: the first tab stop must reach the material, not the rail */
  await page.evaluate(() => document.querySelector(".skip")?.focus());
  await page.waitForTimeout(250);      /* it slides in; measuring mid-transition lies */
  const skipVisible = await page.evaluate(() => {
    const el = document.querySelector(".skip");
    return !!el && el.getBoundingClientRect().top >= 0;
  });
  ck(P("skip link appears on focus"), skipVisible);

  /* The margin channel aligns with the block it annotates. A block that
     carries its own top margin pushes its text down while the card beside it
     stays put, so the note reads as floating above what it annotates. */
  const align = await page.evaluate(() => {
    const off = [];
    for (const r of document.querySelectorAll(".brow")) {
      const side = r.querySelector(".bside > *"), main = r.querySelector(".bmain > div > *");
      if (!side || !main) continue;
      const sb = side.getBoundingClientRect(), mb = main.getBoundingClientRect();
      /* only meaningful while the card is actually beside the block; below a
         breakpoint the row wraps and the card sits under it by design */
      if (sb.left < mb.right) continue;
      off.push(Math.round(sb.top - mb.top));
    }
    return off;
  });
  if (align.length) {
    const worst = align.reduce((a, b2) => Math.abs(b2) > Math.abs(a) ? b2 : a, 0);
    ck(P("margin cards align with their blocks"), Math.abs(worst) <= 2,
       `${align.length} rows, worst ${worst}px`);
  }

  /* A sidebar that scrolls away with the page is not navigation. */
  await page.evaluate(() => scrollTo(0, 1400));
  await page.waitForTimeout(350);
  const sbTop = await page.evaluate(() =>
    Math.round(document.querySelector(".sidebar").getBoundingClientRect().top));
  ck(P("sidebar stays put while the page scrolls"), sbTop >= -1 && sbTop <= 1, sbTop + "px");
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(250);

  /* Hovering a section must not move its neighbours: motion that carries no
     information is noise, and it once came from a mangled selector. */
  const rowsBefore = await page.evaluate(() =>
    [...document.querySelectorAll(".sec")].map(e => Math.round(e.getBoundingClientRect().top)));
  await page.locator(".sec-btn").nth(Math.min(3, nSections - 1)).hover();
  await page.waitForTimeout(250);
  const rowsAfter = await page.evaluate(() =>
    [...document.querySelectorAll(".sec")].map(e => Math.round(e.getBoundingClientRect().top)));
  const moved = rowsBefore.filter((v, i) => Math.abs(v - rowsAfter[i]) > 1).length;
  ck(P("hovering the rail moves nothing"), moved === 0, moved + " rows moved");
  /* Off the sidebar, not to 4,4 — that is over it, and the rail deliberately
     holds still while the pointer is on it. */
  await page.mouse.move(Math.round(page.viewportSize().width * 0.7), 400);

  /* The rail marks where the reader IS, not where they clicked. The two agree
     for one screen and then part company for the rest of the section, which is
     most of a session — a subsection runs 2000px and the route does not change
     while somebody reads. */
  const railSubs = await page.evaluate(() => [...document.querySelectorAll(".sub")].map(e => e.id));
  if (railSubs.length > 1) {
    const marked = () => page.evaluate(() =>
      document.querySelector(".rail .subs a.cur")?.getAttribute("href")?.split("/").pop() || null);
    /* Park the reader on the last subsection without touching the route. */
    await page.evaluate(id => {
      const el = document.getElementById(id);
      const bar = document.querySelector(".topbar").getBoundingClientRect().bottom;
      scrollTo({ top: scrollY + el.getBoundingClientRect().top - bar - 1, behavior: "instant" });
    }, railSubs[railSubs.length - 1]);
    await page.waitForTimeout(220);
    const at = await marked();
    const route = await page.evaluate(() => location.hash);
    ck(P("the rail follows the scroll, not the route"),
       at === railSubs[railSubs.length - 1] && !route.endsWith(at),
       `rail ${at}, route ${route}`);

    /* A mark below the fold of its own list is not a mark. At 900px of sidebar
       a 15-section course put it 721px down and a 62-section one 2021px down,
       so this is most courses, not an edge case. */
    /* The rail may still be gliding; a fixed wait is a guess, and on the
       62-section course it was the wrong one. */
    const railStill = async () => {
      let last = -1, same = 0;
      for (let i = 0; i < 40 && same < 3; i++) {
        const v = await page.evaluate(() => Math.round(document.querySelector(".sidebar").scrollTop));
        same = v === last ? same + 1 : 0;
        last = v;
        await page.waitForTimeout(50);
      }
      return last;
    };
    await railStill();
    ck(P("the rail keeps the mark in view"), await page.evaluate(() => {
      const side = document.querySelector(".sidebar");
      const cur = side.querySelector(".rail .subs a.cur");
      if (!cur) return true;
      const s = side.getBoundingClientRect(), c = cur.getBoundingClientRect();
      return c.top >= s.top - 1 && c.bottom <= s.bottom + 1;
    }));

    /* ...but never while the reader is working down the list by hand. */
    await page.evaluate(() => { document.querySelector(".sidebar").scrollTop = 0; });
    await railStill();                       /* no glide left to fight */
    await page.locator(".sidebar .brand").hover();
    await page.waitForTimeout(150);
    await page.evaluate(id => {
      const el = document.getElementById(id);
      const bar = document.querySelector(".topbar").getBoundingClientRect().bottom;
      scrollTo({ top: scrollY + el.getBoundingClientRect().top - bar - 1, behavior: "instant" });
    }, railSubs[0]);
    await page.waitForTimeout(500);
    ck(P("a hovered rail is not yanked"), (await railStill()) === 0);
    await page.mouse.move(Math.round(page.viewportSize().width * 0.7), 400);

    /* And back: it has to let go as well as take hold. */
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(220);
    ck(P("above the first subsection the rail marks none"), (await marked()) === null);

    /* A subsection reached by its own URL is marked once the scroll settles.
       This used to be silently broken on a cold load: the course had not
       arrived, so the scroll found no element and never retried. */
    await go(`#/${cid}/${railSubs[1]}`);
    await page.waitForTimeout(900);
    ck(P("a linked subsection is marked on arrival"), (await marked()) === railSubs[1],
       `${await marked()} wanted ${railSubs[1]}`);
    await go(`#/${cid}/${secIds[0]}`);
  }

  /* Ctrl +/- scales the reading column and leaves the chrome alone. */
  /* height, not width: the column is often already at the width its container
     allows, and zoom then shows up as taller type rather than a wider box */
  const wrapAt = () => page.evaluate(() =>
    Math.round(document.querySelector(".wrap").getBoundingClientRect().height));
  const sideAt = () => page.evaluate(() =>
    Math.round(document.querySelector(".sidebar").getBoundingClientRect().width));
  const w0 = await wrapAt(), s0 = await sideAt();
  await page.keyboard.press("Control+Equal"); await page.waitForTimeout(300);
  const w1 = await wrapAt(), s1 = await sideAt();
  ck(P("ctrl + zooms the content"), w1 > w0, `${w0} -> ${w1}`);
  ck(P("ctrl + leaves the chrome alone"), s1 === s0, `${s0} -> ${s1}`);
  await page.keyboard.press("Control+0"); await page.waitForTimeout(300);
  ck(P("ctrl 0 resets the zoom"), (await wrapAt()) === w0, `${await wrapAt()} vs ${w0}`);

  /* cross-reference round trip */
  const xr = page.locator(".bmain a.xr").first();
  if (await xr.count()) {
    await xr.hover(); await page.waitForTimeout(180);
    ck(P("hover pairs mention and card"), await page.locator(".mnote.hot").count() > 0);

    /* Where the mention sits on screen before the trip, so the return can be
       measured against it rather than against the subsection it happens to be
       in. A subsection runs 2000px and a mention can be at the bottom of one.
     *
     * Positioned and clicked from inside the page rather than through the
     * locator. Playwright re-runs scrollIntoViewIfNeeded as part of clicking,
     * so a seat measured beforehand is a seat the click then moves — which
     * read as a 50px miss by the product when the product was exact. */
    await page.evaluate(() =>
      document.querySelector(".bmain a.xr").scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(250);
    const seat = await page.evaluate(() => {
      const a = document.querySelector(".bmain a.xr");
      return { top: Math.round(a.getBoundingClientRect().top), href: a.getAttribute("href") };
    });
    await page.evaluate(() => document.querySelector(".bmain a.xr").click());
    await page.waitForTimeout(400);
    ck(P("return pill appears"), await page.locator(".pill.on").isVisible());
    await page.locator(".pill.on").click(); await page.waitForTimeout(400);
    ck(P("pill returns"), await page.locator("section.sec-body").count() === 1);

    /* And returns to the sentence, not to the heading above it. Waited out
       rather than sampled once: the section re-renders on the way back and its
       maths and figures settle over the next few frames, which used to leave
       the landing 250-380px short. */
    let seatNow = null;
    for (let i = 0; i < 30; i++) {
      seatNow = await page.evaluate(() => {
        const a = document.querySelector(".bmain a.xr");
        return a ? Math.round(a.getBoundingClientRect().top) : null;
      });
      if (seatNow !== null && Math.abs(seatNow - seat.top) <= 8) break;
      await page.waitForTimeout(100);
    }
    ck(P("the return lands where the link was clicked"),
       seatNow !== null && Math.abs(seatNow - seat.top) <= 8,
       `mention was ${seat.top}px from the top, came back at ${seatNow}px`);

    /* The trail ends when the reader steps off it. Otherwise the pill sits
       there offering to return to a page they left several sections ago. */
    await xr.click(); await page.waitForTimeout(400);
    await page.locator(".sec-btn").nth(Math.min(2, nSections - 1)).click();
    await page.waitForTimeout(500);
    ck(P("return pill clears on a deliberate move"),
       await page.locator(".pill.on").count() === 0);
  }

  /* A concept mention promises a click with a dashed underline and a pointer
     cursor; it has to keep that promise, and the way back has to work. */
  const cref = page.locator(".bmain a.cref").first();
  if (await cref.count()) {
    await cref.click(); await page.waitForTimeout(450);
    ck(P("a concept mention opens its entry"), await page.locator(".cdet h1").count() === 1);
    await page.locator(".pill.on").click(); await page.waitForTimeout(450);
    ck(P("returning from a concept lands on the section"),
       await page.locator("section.sec-body").count() === 1,
       await page.evaluate(() => location.hash));
  }

  /* WCAG 1.4.1: mastery must not be carried by colour alone. */
  const dots = await page.locator(".mdot").count();
  if (dots) {
    const named = await page.evaluate(() =>
      [...document.querySelectorAll(".mdot")].every(d => (d.getAttribute("aria-label") || "").length > 3));
    ck(P("mastery markers are named, not just coloured"), named);
  }

  /* quiz + state: predict, state a reason, then reveal */
  await go(`#/${cid}/${secIds[0]}`);
  /* No AI affordance precedes an attempt. The browser's assistant is not ours
     to gate, but our own pointer to help is. */
  ck(P("no help control before a prediction"), await page.locator(".qstuck").count() === 0);
  const conf = page.locator(".q .cbtn[data-conf='1']").first();
  if (await conf.count()) {
    await conf.click(); await page.waitForTimeout(250);
    ck(P("the reveal stays inert until a reason is stated"),
       await page.locator(".q.open").count() === 0 && await page.locator(".q .why-in").count() === 1);
    await page.locator(".q .why-in").first().fill("stating the reason before looking");
    await page.locator(".q .why-nav .cbtn").first().click(); await page.waitForTimeout(250);
    ck(P("a stated reason reveals the answer"), await page.locator(".q.open").first().isVisible());
    const missed = page.locator(".q.open .gbtn[data-got='0']").first();
    if (await missed.count()) {
      await missed.click(); await page.waitForTimeout(250);
      const note = await page.locator(".gnote").first().innerText();
      /* The note names what actually happened, and the three outcomes it can
         report are three different events rather than one word for all of
         them. A confident miss on a concept with a bank is drilled on the
         spot; without one there is nothing to drill and the note must not
         claim otherwise. */
      ck(P("a confident miss says what follows from it"),
         /drilling it now|worth another look/i.test(note), note);
      /* a confident miss on a concept with a bank is corrected in place */
      const drilled = await page.locator(".recruit .drill").count();
      if (drilled) ck(P("a confident miss recruits a drill"), drilled === 1);
    }
    /* The reason comes back beside the question the next time it is met.
       The round trip leaves the section rather than reloading it, so a
       single-section course exercises the same path as any other. */
    await go(`#/${cid}`);
    await go(`#/${cid}/${secIds[0]}`);
    await page.locator(".q .cbtn[data-conf='1']").first().click(); await page.waitForTimeout(250);
    ck(P("the reader's previous reason returns"),
       await page.locator(".q .why-prior").count() >= 1);
  }

  /* The context record: course content in, answers and reader content out.
     It is what the browser's own assistant reads, and it is invisible. */
  {
    const raw = await page.evaluate(() => {
      const el = document.getElementById("page-context");
      return el ? el.textContent : null;
    });
    ck(P("a context record sits in the head"), !!raw);
    if (raw) {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { /* reported below */ }
      ck(P("the context record is valid JSON-LD"), !!parsed && !!parsed["@context"]);
      ck(P("the context record names the section it describes"),
         !!parsed && typeof parsed.name === "string" && parsed.name.length > 2);
      ck(P("the context record changes nothing visible"),
         await page.evaluate(() => {
           const el = document.getElementById("page-context");
           return !el || el.getClientRects().length === 0;
         }));
      const ans = await page.locator(".q.open .ans").first().innerText().catch(() => "");
      if (ans && ans.trim().length > 6)
        ck(P("the context record withholds quiz answers"), !raw.includes(ans.trim()), ans.slice(0, 30));
      ck(P("the context record carries nothing the reader wrote"),
         !raw.includes("stating the reason before looking"));
    }
  }

  /* lanes: the count changes, the route and the scroll do not */
  {
    await go(`#/${cid}/${secIds[0]}`);
    const all = await page.locator(".brow").count();
    const hash = await page.evaluate(() => location.hash);
    /* The axes moved out of the content flow into a disclosure at the foot of
       the navigation, so reaching them is a step the reader takes rather than
       one they are made to take. Opening it is part of the contract now. */
    ck(P("the axes are not in the reading column"),
       await page.locator(".wrap .lane, .wrap .depth").count() === 0);
    const axes = page.locator(".axes");
    ck(P("the axes are reachable from the navigation"), await axes.count() === 1);
    await axes.locator("summary").click(); await page.waitForTimeout(200);
    await page.locator(".lane-b[data-lane='spine']").click(); await page.waitForTimeout(300);
    const spine = await page.locator(".brow").count();
    ck(P("the spine lane never shows more than every lane"), spine <= all, `${spine} of ${all} rows`);
    ck(P("changing lane does not change the route"), await page.evaluate(() => location.hash) === hash);
    const tab = page.locator('.dtab[aria-expanded="false"]').first();
    if (await tab.count()) {
      const panelId = await tab.getAttribute("aria-controls");
      const toggle = page.locator(`.dtab[aria-controls="${panelId}"]`);
      ck(P("a collapsed tier has a rail tab"), !!panelId);
      await toggle.click(); await page.waitForTimeout(300);
      ck(P("a tab expands in place"), await toggle.getAttribute("aria-expanded") === "true" &&
         await page.evaluate(() => location.hash) === hash);
      await toggle.click(); await page.waitForTimeout(200);
      ck(P("a tab closes its content"), await toggle.getAttribute("aria-expanded") === "false");
    }
    await page.locator(".lane-b[data-lane='apply']").click(); await page.waitForTimeout(250);
  }

  /* depth: a second axis that closes prose rather than removing blocks.
     The two must compose, and neither may change the route or lose a block. */
  {
    await go(`#/${cid}/${secIds[0]}`);
    const hash = await page.evaluate(() => location.hash);
    const fullRows = await page.locator(".brow").count();
    /* The settings panel used to carry a "Show" row — Full / Notes / Names —
       beside the lane. It was the toolbar's Study / Review / Names under three
       other names, so a reader who found both had two controls for one setting
       and no way to tell that they were the same one. The axis is unchanged and
       still bound to `d`; only the duplicate control is gone. */
    ck(P("the panel carries no second control for the depth"),
       await page.locator(".axes .depth").count() === 0);

    /* Driven by the key the reader has, since that is now the direct way in.
       The depth is read back off the section, which is where it shows: `full`
       carries no class, the other two name themselves. */
    const depthNow = () => page.evaluate(() => {
      const el = document.querySelector(".sec-body");
      if (!el) return null;
      return el.classList.contains("depth-index") ? "index"
           : el.classList.contains("depth-notes") ? "notes" : "full";
    });
    const setDepth = async d => {
      for (let i = 0; i < 4 && (await depthNow()) !== d; i++) {
        await page.keyboard.press("d");
        await page.waitForTimeout(220);
      }
      return (await depthNow()) === d;
    };
    await setDepth("notes"); await page.waitForTimeout(300);
    const closed = await page.locator(".nrow, .ntopic-h").count();
    ck(P("notes depth closes blocks"), closed > 0, `${closed} closed`);
    ck(P("changing depth does not change the route"),
       await page.evaluate(() => location.hash) === hash);
    ck(P("a closed block still says something"),
       await page.evaluate(() =>
         [...document.querySelectorAll(".nrow .nname, .nrow .nclaim, .ntopic-t")]
           .every(n => n.textContent.trim().length > 1)));
    /* The note form is grouped, not a flat list: a definition opens a topic and
       what develops it sits under that topic. */
    ck(P("notes depth groups claims under their topic"),
       await page.locator(".ntopic").count() > 0);

    /* An aside is the course explaining a phrase the reader may not know, and
       help that exists in one reading mode is help nobody can lean on — so it
       does not belong to Study. At a closed depth the block it annotates may be
       shut, so the card moves to the run's one rail; a card that can light
       nothing carries the way to its phrase instead of a dead pairing. */
    const asidesHere = await page.locator(".mnote.is-a").count();
    if (asidesHere) {
      sawAside = true;
      ck(P("every aside is either paired or offers the way to its phrase"),
         await page.evaluate(() =>
           [...document.querySelectorAll(".mnote.is-a")]
             .every(n => n.hasAttribute("data-xr") || !!n.querySelector(".mn-open"))));
    }

    /* A collapsed run at a closed depth is a tab in the margin, never the
       dashed rule across the measure a first read gets: on a page of one-line
       rows that rule was the loudest thing there, and it announced what was
       absent more firmly than the rows announced what was present. */
    ck(P("no tier stub crosses the reading column at a closed depth"),
       await page.locator(".sec-body .tstub").count() === 0);
    const tab = page.locator('.dtab[aria-expanded="false"]').first();
    if (await tab.count()) {
      sawDepthTab = true;
      const panelId = await tab.getAttribute("aria-controls");
      const toggle = page.locator(`.dtab[aria-controls="${panelId}"]`);
      const panel = page.locator(`[id="${panelId}"]`);
      await toggle.click(); await page.waitForTimeout(300);
      ck(P("a margin tab opens the full run it holds"), await panel.isVisible() &&
         await panel.locator(".bhtml, .attempt").count() > 0);
      await toggle.click(); await page.waitForTimeout(300);
      ck(P("and closes it again from the same place"), await panel.isHidden());
    }
    /* A row showing nothing but its own label is a row you must open before it
       says anything, which is what notes depth is not for.
       
       Asserted on the built-in course only. Every other course here predates
       `core:` and would fail at 94-100%, and that is content debt rather than a
       broken engine — `npm run audit` owns it as the `nameonly` fraction, with
       a ceiling each course declares for itself. What is worth gating in a
       browser is that the shipped example actually meets the rule §6.7 sets. */
    if (cid === "demo") {
      const bare = await page.locator(".nrow.is-closed").count();
      const rows = await page.locator(".nrow").count();
      ck(P("every row says something without being opened"), bare === 0,
         `${bare} of ${rows} show only a name`);
      /* A claim on a list is a count of it, so the list stays whole. The
         failure this guards is the one that shipped: "four places a course can
         take you" rendered as the note, with the four places closed behind it. */
      const listClosed = await page.evaluate(() =>
        [...document.querySelectorAll(".nrow")].some(n => /\bt-(list|table|code)\b/.test(n.className)));
      ck(P("a claim never closes a list, table or listing"), !listClosed);
    }
    ck(P("no row is prefixed with the engine's word for its block type"),
       await page.locator(".nrow .gkind").count() === 0);

    /* T42: no depth removes a block. Every block still has its row in the
       document, whether open or closed. */
    const rowsNow = await page.locator(".brow").count();
    ck(P("notes depth removes no block that is not a p"), rowsNow <= fullRows && rowsNow > 0,
       `${rowsNow} of ${fullRows}`);

    const lead = await page.locator(".nrow.is-lead").count();
    if (lead) {
      ck(P("a lead row shows a claim, not just a name"),
         (await page.locator(".nrow.is-lead .nclaim, .nrow.is-lead .npoints").first().innerText())
           .trim().length > 15);
      await page.evaluate(() => document.querySelector(".nrow.is-lead .nrow-b").click());
      await page.waitForTimeout(250);
      ck(P("a closed block opens in place"),
         await page.locator(".nrow.is-lead").count() === lead - 1 &&
         await page.evaluate(() => location.hash) === hash);
      /* And it closes from its own title, which is where it opened. A
         disclosure whose way out is somewhere other than its way in makes the
         reader go looking for it. */
      ck(P("an opened block closes from its own title"),
         await page.locator(".nopen .nopen-h, .ntopic-h.is-open .ntopic-b").count() > 0);
      await page.evaluate(() =>
        (document.querySelector(".nopen .nopen-h") ||
         document.querySelector(".ntopic-h.is-open .ntopic-b")).click());
      await page.waitForTimeout(250);
      ck(P("closing puts the block back"),
         await page.locator(".nrow.is-lead").count() === lead &&
         await page.locator(".nopen").count() === 0);

      /* Pressing a title that the reader has just selected is a copy, not a
         press. Closing the block out from under a drag loses the selection and
         their place at once. */
      await page.evaluate(() => document.querySelector(".nrow.is-lead .nrow-b").click());
      await page.waitForTimeout(200);
      const openNow = await page.locator(".nopen, .ntopic-h.is-open").count();
      await page.evaluate(() => {
        const el = document.querySelector(".nopen-h, .ntopic-h.is-open .ntopic-b");
        if (!el) return;
        const r = document.createRange(); r.selectNodeContents(el);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        el.click();
      });
      await page.waitForTimeout(250);
      ck(P("selecting a title does not close the block"),
         await page.locator(".nopen, .ntopic-h.is-open").count() === openNow);
      await page.evaluate(() => getSelection().removeAllRanges());
    }

    await setDepth("index"); await page.waitForTimeout(300);
    const named = await page.locator(".nrow .nname, .ntopic-t").count();
    ck(P("index depth names every block it shows"), named > 0, `${named} names`);
    /* The topic heading is the term; a row repeating it underneath was the
       same string twice on every definition in the course. */
    ck(P("index depth does not print a topic's name twice"),
       await page.evaluate(() => [...document.querySelectorAll(".ntopic-h")].every(h => {
         const t = h.querySelector(".ntopic-t")?.textContent.trim();
         const r = h.querySelector(".nrow .nname")?.textContent.trim();
         return !t || !r || t !== r;
       })));
    /* A quiz at a closed depth is a line, not a stack of cards. */
    ck(P("the quiz closes with the depth"),
       await page.locator(".quiz-line").count() > 0 || await page.locator(".quiz").count() === 0);

    /* `d` cycles, and it is the only control over this axis that is left. */
    const wasDepth = await depthNow();
    await page.keyboard.press("d"); await page.waitForTimeout(250);
    ck(P("d cycles the depth"), (await depthNow()) !== wasDepth,
       `${wasDepth} -> ${await depthNow()}`);
    /* The page-level control is a round trip, not a one-way door: reveal, then
       close, and the depth's own view has to come back — including any block
       the reader had opened by hand underneath it. */
    await setDepth("notes"); await page.waitForTimeout(300);
    /* Both moved out of the toolbar and into the sidebar's Settings panel,
       which is a <details>. Opened first, because a control a reader cannot
       reach is not a control — clicking it through the DOM would pass this
       test with the disclosure permanently shut. */
    await page.evaluate(() => document.querySelector(".axes")?.setAttribute("open", ""));
    const act = re => page.evaluate(r =>
      [...document.querySelectorAll(".axes-acts .lane-b")]
        .find(b => new RegExp(r, "i").test(b.textContent))?.click(), re);
    const reveal = () => act("Reveal all");
    const closeAll = () => act("Close all");
    ck(P("the reading panel carries the controls the toolbar shed"),
       await page.locator(".axes-acts .lane-b").count() >= 2);

    /* "Close all" returns the page to what the *depth* defines, which is not
       necessarily what was on screen a moment ago: a tier stub the reader had
       expanded by hand is closed too, because closing everything means
       everything. So the invariant to assert is idempotence — one cycle and
       two cycles land in the same place — rather than a count taken before the
       first one. */
    await reveal(); await page.waitForTimeout(350);
    ck(P("reveal all opens every closed block"), await page.locator(".nrow").count() === 0);
    ck(P("the reveal control renames itself to its reverse"),
       await page.evaluate(() =>
         !!([...document.querySelectorAll(".axes-acts .lane-b")]
             .find(b => /Close all/i.test(b.textContent)))));
    await closeAll(); await page.waitForTimeout(350);
    const settled = await page.locator(".nrow").count();
    ck(P("close all returns to the depth, not to the full text"), settled > 0, `${settled} rows`);

    await reveal(); await page.waitForTimeout(300);
    await closeAll(); await page.waitForTimeout(350);
    ck(P("revealing and closing again lands in the same place"),
       await page.locator(".nrow").count() === settled,
       `${await page.locator(".nrow").count()} of ${settled}`);

    await setDepth("full"); await page.waitForTimeout(250);
    ck(P("full depth closes nothing"), await page.locator(".nrow, .quiz-line").count() === 0);
  }

  /* ---------------------------------------------------------- the settings
   * The panel at the foot of the navigation: what it is called, where it
   * stays, whether it reads as a thing in front of the list or as the last
   * line of it, and the one setting that is neither a lane nor a depth.
   * ------------------------------------------------------------------------ */
  {
    await go(`#/${cid}/${secIds[0]}`);
    const panel = page.locator(".axes");
    ck(P("the panel says what it is"),
       (await panel.locator("summary").innerText()).trim() === "Settings",
       await panel.locator("summary").innerText());

    /* Pinned to the foot of the sidebar, not parked at the end of the section
       list. The viewport is squeezed first so the rail is guaranteed to
       overflow — on a five-section course at 900px it may not, and an
       assertion that silently skips is not an assertion. */
    await page.setViewportSize({ width: 1440, height: 520 });
    await page.waitForTimeout(250);
    const stuck = await page.evaluate(() => {
      const side = document.querySelector(".sidebar"), ax = document.querySelector(".axes");
      if (!side || !ax) return null;
      side.scrollTop = 0;
      const a = ax.getBoundingClientRect(), s = side.getBoundingClientRect();
      return { room: Math.round(side.scrollHeight - side.clientHeight),
               gap: Math.round(s.bottom - a.bottom) };
    });
    ck(P("the rail is long enough for the question to mean anything"),
       stuck && stuck.room > 40, JSON.stringify(stuck));
    ck(P("the settings stay at the foot of the sidebar while the rail scrolls"),
       stuck && Math.abs(stuck.gap) <= 2, JSON.stringify(stuck));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);

    /* Open, it is a card in front of the list rather than its last row: its own
       ground and its own border, both of which the closed form has neither of. */
    const look = async () => page.evaluate(() => {
      const ax = document.querySelector(".axes");
      const c = getComputedStyle(ax);
      return { bg: c.backgroundColor,
               border: parseFloat(c.borderLeftWidth) || 0,
               side: getComputedStyle(document.querySelector(".sidebar")).backgroundColor };
    });
    const shut = await look();
    await page.evaluate(() => document.querySelector(".axes")?.setAttribute("open", ""));
    await page.waitForTimeout(200);
    const open = await look();
    ck(P("the open panel is set on its own ground"),
       open.bg !== open.side && open.bg !== shut.bg,
       `${shut.bg} -> ${open.bg} on ${open.side}`);
    ck(P("and draws its own edge"), open.border > 0 && shut.border === 0,
       `${shut.border} -> ${open.border}`);

    /* The panel reads by how long a control's reach is: the page actions on one
       line first — pressed mid-read and forgotten — then the settings that stay
       set. Asserted as geometry rather than as markup, because "on one line" is
       the claim, and a flex row that wraps at this width would satisfy any
       structural check while failing the thing it is there for. */
    const row = await page.evaluate(() => {
      const acts = document.querySelector(".axes .axes-acts");
      const lane = document.querySelector(".axes .lane");
      if (!acts || !lane) return null;
      const btns = [...acts.querySelectorAll(".lane-b")];
      return {
        labels: btns.map(b => b.textContent.trim()),
        rows: new Set(btns.map(b => Math.round(b.getBoundingClientRect().top))).size,
        above: acts.getBoundingClientRect().bottom <= lane.getBoundingClientRect().top + 1
      };
    });
    ck(P("the page actions sit on one line"),
       row && row.labels.length >= 2 && row.rows === 1, JSON.stringify(row));
    ck(P("above the reading lane, not beside it"), row && row.above, JSON.stringify(row));

    /* The course's accent, which the reader may overrule on this device. */
    const swatch = page.locator(".hues .hue-b:not(.hue-own)");
    ck(P("the panel offers the course's colour"), await swatch.count() >= 4,
       (await swatch.count()) + " swatches");
    const hue = () => page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--hue"));
    const authored = await hue();
    await swatch.nth(3).click(); await page.waitForTimeout(250);
    const picked = await hue();
    ck(P("picking a colour rotates the course's accent"),
       picked !== "" && picked !== authored, `${authored || "(course)"} -> ${picked}`);
    ck(P("and the swatch says which one is on"),
       await page.locator(".hues .hue-b.sel").count() === 1);

    /* It is a preference, so it outlives the page — and it is per course, so
       the shelf has to agree with it. */
    await go(`#/${cid}/${secIds[0]}`);
    ck(P("the chosen colour is remembered"), (await hue()) === picked, await hue());
    await go();
    const card = await page.evaluate(id => {
      const a = [...document.querySelectorAll(".lcard .lhit")]
        .find(x => x.getAttribute("href") === "#/" + id);
      return a ? getComputedStyle(a.parentElement).getPropertyValue("--hue").trim() : null;
    }, cid);
    if (card !== null)
      ck(P("and the library card wears it too"), card === picked, `${card} vs ${picked}`);

    /* And there is a way back to what the author chose. */
    await go(`#/${cid}/${secIds[0]}`);
    await page.evaluate(() => document.querySelector(".axes")?.setAttribute("open", ""));
    await page.locator(".hues .hue-own").click(); await page.waitForTimeout(250);
    ck(P("the course's own colour can be put back"), (await hue()) === authored,
       `${await hue()} vs ${authored || "(none)"}`);
  }

  /* categories: membership, a boundary, and the sibling it is defined against.
     The hub is the Kinds band of the index; the detail page is its own. */
  {
    await go(`#/${cid}/index`);
    const kinds = page.locator('.ix-row[href*="/cat/"]');
    const cards = await kinds.count();
    if (cards) {
      ck(P("the index lists the course's kinds"), cards > 0, `${cards}`);
      /* Navigated rather than clicked: the toolbar is sticky, and a row that
         scrolls under it intercepts the pointer. The link's own href is what
         is being tested anyway. */
      const href = await kinds.first().getAttribute("href");
      await go(href); await page.waitForTimeout(350);
      ck(P("a category page states its boundary"),
         (await page.locator(".cbound-lg").first().innerText()).trim().length > 20);
      ck(P("a category page lists members"), await page.locator(".cmem").count() > 0);
      const sibs = await page.locator(".csib").count();
      if (sibs) ck(P("a category names what it is not"), sibs > 0);
      /* A member carries the section it actually lives in, because a category
         is not a section and the reader has to be able to get back. */
      ck(P("a member says where it lives"), await page.locator(".cmem-at").count() > 0);
    }
  }

  /* explore: the faceted surface, which the overlay deliberately is not */
  {
    /* What this course actually declares, read off the index rather than off
       Explore: asking Explore whether it offers a Category facet and then
       asserting that it offers one is not a test. */
    await go(`#/${cid}/index`);
    const declared = await page.evaluate(() => ({
      cats: !!document.querySelector('.ix-row[href*="/cat/"]'),
      tags: !!document.querySelector(".tagrow .gtag")
    }));
    await go(`#/${cid}/explore`);
    ck(P("explore opens with no query"), await page.locator(".xq").count() === 1);
    /* A facet per axis the course actually has. Kind and Show are structural
       and always present; Category and Tag are declared, and a course with no
       taxonomy must show neither rather than an empty menu. Counting buttons
       would pass on the wrong two, so the labels are what is read. */
    const facets = await page.evaluate(() =>
      [...document.querySelectorAll(".xfacets .dd-b .dd-l")].map(e => e.textContent));
    ck(P("explore offers a facet for every axis the course has"),
       facets.includes("Kind") && facets.includes("Show")
       && facets.includes("Category") === declared.cats
       && facets.includes("Tag") === declared.tags,
       facets.join(", "));

    /* Kind, not whichever facet happens to sit second: it is the one axis every
       course has, and picking a value on it is what makes the page faceted.
       Pointing this at nth(1) passed on the demo and quietly chose `Show` on
       every course with no taxonomy, which filters nothing. */
    const kindBtn = page.locator(".xfacets .dd", { has: page.locator('.dd-l:text-is("Kind")') })
                        .locator(".dd-b");
    await kindBtn.click(); await page.waitForTimeout(200);
    const opened = await page.locator(".dd-menu .dd-i").count();
    ck(P("a facet opens onto its values"), opened > 1, `${opened} values`);
    /* Kind takes several values at once, so it deliberately does *not* close
       on a pick: a reader ticking two kinds should not have to reopen it. */
    await page.locator(".dd-menu .dd-i").nth(1).click();
    await page.waitForTimeout(250);
    ck(P("a multi-value facet stays open after a pick"),
       await page.locator(".dd-menu").count() === 1);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    ck(P("escape closes a facet"), await page.locator(".dd-menu").count() === 0);

    /* Browsing with no query is the whole point: a facet is a request. */
    const rows = await page.locator(".xrow").count();
    ck(P("a facet alone returns results, with no query typed"), rows > 0, `${rows} rows`);
    await page.locator(".xq").fill("the"); await page.waitForTimeout(400);
    ck(P("a query narrows rather than replaces the facet"),
       await page.locator(".xrow").count() <= rows + 1);

    /* A single-value facet is the other half of the contract, and only a course
       that declares categories can be asked about it. */
    if (declared.cats) {
      await page.locator(".xq").fill(""); await page.waitForTimeout(250);
      await page.locator(".xfacets .dd", { has: page.locator('.dd-l:text-is("Category")') })
                .locator(".dd-b").click();
      await page.waitForTimeout(200);
      await page.locator(".dd-menu .dd-i").nth(1).click();
      await page.waitForTimeout(250);
      ck(P("a single-value facet closes on a pick"),
         await page.locator(".dd-menu").count() === 0);
      /* Its own button, not the first one on the row: Kind is still set from
         the step above, so reading .dd-v.first() would pass on Kind's value. */
      ck(P("and reports the value it is set to on its own button"),
         (await page.locator(".xfacets .dd", { has: page.locator('.dd-l:text-is("Category")') })
                    .locator(".dd-v").innerText()).trim().length > 0);
    }
  }

  /* A block is addressable, and the address is what a block-grain search hit
     links to. Arriving at a closed row would make the address a lie, so the
     named block is forced open whatever depth the reader left the course in. */
  {
    await go(`#/${cid}/${secIds[0]}`);
    const bid = await page.evaluate(() => {
      const el = document.querySelector(".brow[id*='~']");
      return el ? el.id : null;
    });
    if (bid) {
      /* Set the course to its most closed depth first, so "forced open" is a
         claim about this route rather than about the default. Through the key,
         which is the control the reader has. */
      for (let i = 0; i < 4; i++) {
        const at = await page.evaluate(() =>
          !!document.querySelector(".sec-body")?.classList.contains("depth-index"));
        if (at) break;
        await page.keyboard.press("d"); await page.waitForTimeout(220);
      }
      await go(`#/${cid}/${bid}`);
      ck(P("a block address resolves to its section"),
         await page.locator(".sec-body").count() === 1);
      /* "Open" means the block's own content is rendered, not that nothing
         else is. A definition keeps its heading in place while open — the
         heading is the control that closes it again — so the test is for the
         rendered body, not for the absence of a title. */
      const openAtIndexDepth = await page.evaluate(id => {
        const el = document.getElementById(id);
        return !!el && !el.querySelector(".nrow") && !!el.querySelector(".bhtml");
      }, bid);
      ck(P("an addressed block is open even at index depth"), openAtIndexDepth, bid);
      for (let i = 0; i < 4; i++) {
        const el = await page.evaluate(() => {
          const b = document.querySelector(".sec-body");
          return !b || (!b.classList.contains("depth-index") && !b.classList.contains("depth-notes"));
        });
        if (el) break;
        await page.keyboard.press("d"); await page.waitForTimeout(220);
      }
    }
  }

  /* search */
  await page.keyboard.press("/"); await page.waitForTimeout(250);
  await page.locator("#s-input").fill(await page.evaluate(() =>
    document.querySelector(".sec-title")?.textContent.split(" ")[0] || "a"));
  await page.waitForTimeout(350);
  ck(P("search returns results"), await page.locator(".sres").count() > 0);
  /* the browser's own clear glyph is the one thing on the page this stylesheet
     does not draw, and it is redundant beside `esc` and Close */
  /* getComputedStyle on a webkit pseudo-element reports the host element, so
     the shipped rule is what gets asserted */
  ck(P("no native search clear button"), await page.evaluate(() =>
    [...document.styleSheets].some(sh => {
      try {
        return [...sh.cssRules].some(r =>
          /search-cancel-button/.test(r.selectorText || "") && /none/.test(r.style.appearance || ""));
      } catch { return false; }
    })));
  /* T6: results must be reachable without tabbing through every hit */
  if (await page.locator(".sres").count() > 1) {
    await page.mouse.move(4, 4);       /* off the list, so hover cannot answer for it */
    await page.keyboard.press("ArrowDown"); await page.waitForTimeout(150);
    const second = await page.evaluate(() =>
      [...document.querySelectorAll(".sres")].findIndex(e => e.classList.contains("on")));
    ck(P("arrow keys move the search selection"), second === 1, "row " + second);
  }
  /* A body mention is a first-class hit, and the row says how many there are:
     the count is what separates a passing reference from the subsection the
     subject is actually treated in. */
  {
    const word = await page.evaluate(() => {
      /* A word from deep inside the material, not from any heading — and via
         innerText, since textContent runs the last word of one element into
         the first of the next and invents a word no index can hold. */
      const t = (document.querySelector(".bhtml")?.innerText || "");
      return (t.match(/\b[A-Za-z]{7,}\b/g) || ["a"])[0].toLowerCase();
    });
    await page.locator("#s-input").fill(word); await page.waitForTimeout(350);
    const hit = await page.evaluate(() => {
      const r = document.querySelector(".sres");
      return r && { marks: r.querySelectorAll("mark").length,
                    snip: r.querySelector(".sx").innerText };
    });
    ck(P("a word from the body is found"), !!hit, word);
    if (hit) {
      ck(P("the matched words are marked in the snippet"), hit.marks > 0,
         `${hit.marks} marks for "${word}"`);
      /* Lowercasing the indexed text used to reach the snippet as well, so the
         course's own prose was quoted back in a case it was never written in. */
      ck(P("the snippet keeps the material's own case"), /[A-Z]/.test(hit.snip),
         JSON.stringify(hit.snip.slice(0, 48)));
    }
  }
  /* Ranking, not merely matching. A title is the strongest evidence there is,
     so the entry named after the query has to come first — the old scorer
     never counted term frequency at all and could not order two hits. */
  {
    const title = await page.evaluate(() => {
      const a = [...document.querySelectorAll(".toc a")].pop();
      return a ? a.textContent.replace(/^[\d.\s]+/, "").trim() : "";
    });
    if (title.split(/\s+/).length >= 2) {
      await page.locator("#s-input").fill(title); await page.waitForTimeout(400);
      const first = await page.evaluate(() =>
        document.querySelector(".sres b")?.innerText.trim() || "");
      ck(P("the entry a query names ranks first"),
         first.toLowerCase() === title.toLowerCase(), `"${title}" -> "${first}"`);
    }
  }
  /* T1/T2 for the one pair the contrast sweep cannot read. A mark's ground is
     a translucent tint of the course accent, and `audit-color.mjs` walks up
     past any background under half opacity — so it would measure the ink
     against the surface underneath and report a pair that is not on screen.
     Composited here instead, in both themes, since the tint rotates with the
     course hue and the ground moves with the theme. */
  {
    const measure = () => page.evaluate(() => {
      const m = document.querySelector(".sres mark");
      if (!m) return null;
      const cx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      const px = v => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = v;
        cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255]; };
      const over = (f, b) => f.slice(0, 3).map((c, i) => f[3] * c + (1 - f[3]) * b[i]);
      const lum = c => { const v = c.map(x => { x /= 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      let n = m.parentElement, base = null;
      while (n && !base) {
        const b = px(getComputedStyle(n).backgroundColor);
        if (b[3] > 0.5) base = b.slice(0, 3);
        n = n.parentElement;
      }
      base = base || px(getComputedStyle(document.body).backgroundColor).slice(0, 3);
      const cs = getComputedStyle(m);
      const bg = over(px(cs.backgroundColor), base);
      const fg = over(px(cs.color), bg);
      const a = lum(fg), b2 = lum(bg);
      return { r: (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05),
               weight: parseInt(cs.fontWeight) || 400 };
    });
    /* Theme left the toolbar for the sidebar's Settings panel, which is a
       <details>; opened first so this drives the control a reader has. */
    const toggleTheme = async () => {
      await page.evaluate(() => document.querySelector(".axes")?.setAttribute("open", ""));
      await page.locator(".axes-acts .lane-b", { hasText: "Theme" }).click();
    };
    const lit = await measure();
    if (lit) {
      ck(P("a marked word clears AA on the accent tint"), lit.r >= 4.5,
         lit.r.toFixed(2) + ":1");
      /* T26: the tint is not the only thing saying "matched". */
      ck(P("and is not marked by colour alone"), lit.weight >= 600, "weight " + lit.weight);
      await page.keyboard.press("Escape");
      await toggleTheme();
      await page.waitForTimeout(250);
      await page.keyboard.press("/"); await page.waitForTimeout(200);
      await page.locator("#s-input").fill("the"); await page.waitForTimeout(300);
      const dark = await measure();
      if (dark) ck(P("and clears it in the other theme too"), dark.r >= 4.5,
                   dark.r.toFixed(2) + ":1");
      await page.keyboard.press("Escape");
      await toggleTheme();
      await page.waitForTimeout(250);
      await page.keyboard.press("/"); await page.waitForTimeout(200);
    }
  }
  await shot(cid + "-search");
  await page.keyboard.press("Escape");

  /* One index, two bands. The two hubs it replaced were adjacent rows in the
     rail opening onto identical card grids; what has to hold now is that both
     kinds of entry are on one page and that each band says which it is. */
  await go(`#/${cid}/index`);
  const ix = await page.evaluate(() => {
    /* Read by what a band *contains*, never by what its heading says. A
       concept entry is `/c/<key>` and a category is `/cat/<key>`, and those
       are routes rather than wording, so renaming a band cannot quietly turn
       this assertion off. The band head is "<title><span class=ix-n>count</
       span>", so its first child node is the title on its own. */
    const band = b => ({
      title: (b.querySelector(".ix-h")?.firstChild?.textContent || "").trim(),
      counted: !!b.querySelector(".ix-n"),
      concepts: b.querySelectorAll('.ix-row[href*="/c/"]').length,
      cats: b.querySelectorAll('.ix-row[href*="/cat/"]').length
    });
    return {
      heads: [...document.querySelectorAll(".ix-band")].map(band),
      ideas: [...document.querySelectorAll('.ix-row[href*="/c/"] .ix-name')].map(e => e.textContent),
      kinds: document.querySelectorAll('.ix-row[href*="/cat/"]').length
    };
  });
  if (ix.ideas.length || ix.kinds) {
    /* A band per kind of entry the course *has*. Most courses declare concepts
       and no categories, so asserting two bands unconditionally asserts that
       every course runs a taxonomy, which nothing requires it to. */
    ck(P("the index bands every kind of entry the course declares"),
       ix.heads.filter(h => h.concepts).length === (ix.ideas.length ? 1 : 0)
       && ix.heads.filter(h => h.cats).length === (ix.kinds ? 1 : 0),
       ix.heads.map(h => `${h.title || "?"}[${h.concepts}c/${h.cats}k]`).join(" ") || "no bands");
    ck(P("every band names what it holds and counts it"),
       ix.heads.length > 0 && ix.heads.every(h => h.title && h.counted));
    /* Alphabetical, because position is what an index is reached for when it
       has failed you, and the rail already carries course order. */
    ck(P("ideas are in alphabetical order"),
       ix.ideas.every((n, i) => !i || ix.ideas[i - 1].localeCompare(n) <= 0),
       ix.ideas.slice(0, 6).join(" | "));
  }
  /* The routes the two hubs used still land on it rather than on nothing. */
  for (const old of ["concepts", "cat"]) {
    await go(`#/${cid}/${old}`);
    ck(P(`the old /${old} route still reaches the index`),
       await page.locator(".ix-band").count() > 0);
  }

  /* map + practice */
  await go(`#/${cid}/map`);
  ck(P("map has a node per section"), await page.locator(".mapwrap .fx-node").count() === nSections);
  /* Edgeless sections are packed into a band rather than columned, so they cost
     a strip of height instead of stretching every other node apart. Overlap is
     what a wrong packing looks like, and it cannot be seen in a node count. */
  const overlap = await page.evaluate(() => {
    const n = [...document.querySelectorAll(".mapwrap .fx-node")].map(e => {
      const b = e.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, r: b.width / 2 };
    });
    let hits = 0;
    for (let i = 0; i < n.length; i++)
      for (let j = i + 1; j < n.length; j++)
        if (Math.hypot(n[i].x - n[j].x, n[i].y - n[j].y) < (n[i].r + n[j].r) * 0.9) hits++;
    return hits;
  });
  ck(P("map nodes do not overlap"), overlap === 0, overlap + " overlapping pairs");
  await shot(cid + "-map");
  /* arriving from a section rings the node you came from */
  await go(`#/${cid}/map/${last}`);
  ck(P("map rings the section you came from"),
     await page.locator(`.fx-node.is-here[data-node="${last}"]`).count() === 1);
  /* the drill bank: a concept enters Loop B on contact, never before, and the
     concept page is one of the three places contact can happen */
  await go(`#/${cid}/index`);
  const banked = await page.evaluate(() => {
    const row = [...document.querySelectorAll(".ix-row")].find(c => c.querySelector(".ix-badge"));
    return row ? row.getAttribute("href") : null;
  });
  if (banked) {
    await go(banked);
    ck(P("a banked concept names its state in words"),
       (await page.locator(".cstate-box b").first().innerText()).length > 3);
    await page.locator("#c-drill").click(); await page.waitForTimeout(300);
    ck(P("the concept page drills its own concept"), await page.locator(".drill").count() === 1);
    ck(P("a drill withholds its answer until the reader commits"),
       await page.locator(".drill .drill-a").count() === 0);
    await page.locator(".drill .cbtn[data-conf='sure']").click(); await page.waitForTimeout(200);
    await page.locator(".drill .why-in").fill("stating it first");
    await page.locator(".drill .why-nav .cbtn").click(); await page.waitForTimeout(250);
    ck(P("a stated reason reveals the worked solution"),
       await page.locator(".drill .drill-steps li").count() > 0);
    await page.locator(".drill .gbtn[data-got='1']").click(); await page.waitForTimeout(250);
    ck(P("a graded drill reports the concept's new state"),
       /learning|criterion|durable/.test(await page.locator(".drill .gnote").innerText()));
    await shot(cid + "-drill");
  }

  await go(`#/${cid}/practice`);

  /* The page opens on its action, not on its settings.
   *
   * It used to open as a form — three dropdowns and a dead checkbox — in front
   * of the activity with the largest effect on the site, when all four controls
   * already had the right default. Start is now primary; the controls are one
   * disclosure away. */
  ck(P("practice opens on Start, not on a form"),
     await page.locator("#p-start").isVisible());
  ck(P("the controls are not in the way"),
     await page.locator(".pcfg-row").isVisible() === false);
  /* A control nothing reads is a promise the page does not keep. */
  ck(P("no dead controls remain"), await page.locator("#p-timed").count() === 0);

  const pcfg = page.locator(".pcfg > summary");
  if (await pcfg.count()) { await pcfg.click(); await page.waitForTimeout(200); }
  const drillMode = await page.locator("#p-source").count() > 0;

  /* A scope the reader cannot see is a scope they cannot change: the control is
     disabled in drill mode, so it must not hold a section from before the
     switch and hand it back on the way out. */
  if (drillMode) {
    /* Drills are the default where a bank exists, and the scope control is
       disabled there — so the trap is set from the other side, exactly as a
       reader sets it: pick a section under Question types, then switch. */
    await page.selectOption("#p-source", "types"); await page.waitForTimeout(150);
    await page.selectOption("#p-scope", { index: 1 });
    const picked = await page.inputValue("#p-scope");
    await page.selectOption("#p-source", "drills"); await page.waitForTimeout(150);
    const after = await page.inputValue("#p-scope");
    ck(P("switching to drills resets the scope"), after === "all",
       `${picked} -> ${after}`);
    await page.selectOption("#p-source", "types"); await page.waitForTimeout(150);
    ck(P("the scope comes back usable"),
       await page.inputValue("#p-scope") === "all" &&
       !(await page.locator("#p-scope").isDisabled()));
    await page.selectOption("#p-source", "drills"); await page.waitForTimeout(150);
  }

  await page.locator("#p-start").click(); await page.waitForTimeout(400);
  ck(P("practice serves an item"),
     await page.locator(drillMode ? "#p-run .drill" : "#p-run .q").count() === 1 ||
     await page.locator(".pempty").count() === 1);
  /* Nothing due is the normal state of an unanswered course, so the empty
     drill queue has to say that rather than blame a scope that is not in play. */
  if (drillMode && await page.locator(".pempty").count() === 1) {
    ck(P("an empty drill queue explains itself"),
       /nothing is due/i.test(await page.locator(".pempty").innerText()));
  }
  await shot(cid + "-practice");

  /* T6-adjacent: the library is where courses are installed and removed, so a
     way back to it cannot depend on chrome the reader is allowed to hide. */
  ck(P("the breadcrumb starts at the library"), await page.locator(".crumb #tb-home").count() === 1);
  await page.locator("#tb-home").click(); await page.waitForTimeout(300);
  ck(P("home reaches the library"),
     await page.evaluate(() => location.hash === "#/" || location.hash === ""));
  await page.setViewportSize({ width: 390, height: 800 });
  await go(`#/${cid}/practice`);
  /* Tappability is swept for every control at this width above; what matters
     here is that the crumb truncating does not take the way home with it. */
  /* The crumb clips, and it clips from the right, so the trail's deep end is
     what yields. The root must never be what gets cut — including when the
     Review count beside it is wide enough to squeeze the whole line. */
  const home = await page.evaluate(() => {
    const a = document.getElementById("tb-home");
    if (!a || a.offsetParent === null) return null;
    const crumb = document.querySelector(".crumb").getBoundingClientRect();
    const box = a.getBoundingClientRect();
    return { w: Math.round(box.width), whole: box.right <= crumb.right + 1,
             bar: Math.round(document.querySelector(".topbar").getBoundingClientRect().height) };
  });
  ck(P("the route home survives a phone"), !!home && home.whole && home.w > 0,
     home ? `${home.w}px wide, bar ${home.bar}px` : "absent");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(200);

  /* calibration reports on the log rather than on the literature */
  await go(`#/${cid}/calibration`);
  /* The page's one finding, in words.
   *
   * This used to assert "at least four stat chips", which was a proxy for the
   * intent the comment above states rather than the intent itself — and the
   * chips were seven zeros on a course nobody had answered in. What has to hold
   * is that the page opens on something derived from the log and says it in a
   * sentence a reader can act on. */
  const lede = await page.locator(".cal-lede").first();
  ck(P("calibration leads with a finding from the log"), await lede.count() === 1);
  const ledeText = (await lede.innerText()).trim();
  ck(P("and states it in words, not in counts"), ledeText.split(/\s+/).length >= 8, ledeText);
  /* On a course with no history it must say so rather than say it in zeros. */
  ck(P("an empty log is named, not counted"),
     /nothing to calibrate/i.test(ledeText) || /\d/.test(ledeText), ledeText);
  ck(P("the zero dashboard is gone"), await page.locator(".cal .dash .dstat").count() === 0);

  /* The one control that can lose work lives here, beside the log it erases and
     below the row that offers to export that log first — not in the toolbar a
     thumb-width from Search. */
  ck(P("reset is not in the toolbar"),
     await page.evaluate(() => !/reset/i.test(document.querySelector(".topbar").innerText)));
  ck(P("confidence is reported against correctness"),
     await page.locator(".cal-t").first().locator("tr").count() > 0);
  ck(P("the model's prediction is reported against the outcome"),
     await page.locator(".cal-t").count() === 2 ||
     await page.locator(".cal-empty").count() === 1);
  ck(P("the log can be taken away"), await page.locator("#cal-export").count() === 1);
  ck(P("calibration states what leaves the device"),
     await page.locator(".cal-priv").count() === 1);
  await shot(cid + "-calibration");

  /* the collapse control belongs to the sidebar, and must not take the margin
     cards with it — those are a benefit, not clutter */
  await go(`#/${cid}/${secIds[0]}`);
  const cardsBefore = await page.locator(".mnote").count();
  ck(P("collapse control is on the sidebar"), await page.locator(".sidebar .tuck").count() === 1);
  await page.locator(".sidebar .tuck").click(); await page.waitForTimeout(350);
  ck(P("collapse hides the sidebar"), await page.locator(".sidebar").count() === 0);
  ck(P("collapse keeps the margin cards"), await page.locator(".mnote").count() === cardsBefore,
     `${cardsBefore} before/after`);
  ck(P("a reveal tab remains"), await page.locator(".untuck").count() === 1);
  await shot(cid + "-tucked");
  await page.locator(".untuck").click(); await page.waitForTimeout(350);
  ck(P("collapse is reversible"), await page.locator(".sidebar").count() === 1);

  /* pre-training: panel on the section, and the stepped module behind it */
  ck(P("key terms panel present"), await page.locator(".pretrain").count() > 0);
  /* A gloss is flattened from a block's HTML. KaTeX renders one span per
     glyph, so flattening a formula like ordinary prose turns an integral into
     "∫ 0 ∞ e −st d t" — space-heavy in a way real prose never is. */
  const airy = await page.evaluate(() =>
    [...document.querySelectorAll(".pt-list dd")]
      .map(e => e.textContent.trim())
      .filter(t => t.length > 24)
      .map(t => ({ t: t.slice(0, 40), r: (t.match(/ /g) || []).length / t.length }))
      .filter(x => x.r > 0.35));
  ck(P("glosses are not shredded maths"), airy.length === 0,
     airy.length ? airy[0].t : "");
  const primerLink = page.locator(".pt-run").first();
  if (await primerLink.count()) {
    await primerLink.click(); await page.waitForTimeout(400);
    ck(P("primer withholds the meaning"), await page.locator(".primer-hint").count() === 1);
    await page.locator("button.dbtn", { hasText: "Show meaning" }).click(); await page.waitForTimeout(200);
    ck(P("primer reveals on request"), await page.locator(".primer-gloss").count() === 1);
    await shot(cid + "-primer");
  }

  /* A note is started by pulling the foot of a block down, and once written it
     is a card in the margin channel stacked with the author's own cards. There
     is no standing affordance to click: the "+ note" button that used to sit in
     every block's margin was 32 permanently visible buttons on one section of a
     phone. */
  await go(`#/${cid}/${secIds[0]}`);
  const grip = page.locator(".note-pull").first();
  if (await grip.count()) {
    ck(P("no standing note button"), await page.locator(".note-add").count() === 0);
    /* The reason the affordance is allowed to be on every block at all. */
    ck(P("the note affordance costs no layout"), await page.evaluate(() =>
      [...document.querySelectorAll(".notes")].every(e => !e.getBoundingClientRect().height)));
    ck(P("a block with no note shows nothing in the margin"),
       await page.locator(".mnote.is-n").count() === 0);

    await grip.scrollIntoViewIfNeeded();
    const g = await grip.boundingBox();
    const pull = async dy => {
      await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await page.mouse.down();
      for (const y of [6, dy]) {
        await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + y);
        await page.waitForTimeout(40);
      }
      await page.mouse.up(); await page.waitForTimeout(250);
    };
    /* A scroll that grazes the grip must not drop a textarea under the reader. */
    await pull(12);
    ck(P("a short pull snaps back"), await page.locator(".note-area").count() === 0);
    await pull(48);
    ck(P("a pull past the threshold opens the note in the margin"),
       await page.locator(".bside .note-area").count() === 1);
    ck(P("the opened note takes focus"),
       await page.evaluate(() => document.activeElement?.classList.contains("note-area")));

    await page.locator(".note-area").first().fill("**check** note `persistence`");
    await page.locator(".note-area").first().blur();       /* commit before leaving */
    await page.waitForTimeout(500);
    await go(`#/${cid}/index`);
    await go(`#/${cid}/${secIds[0]}`);

    /* Shown by default, and read as Markdown rather than as raw asterisks. */
    ck(P("a written note shows in the margin by default"),
       await page.locator(".bside .mnote.is-n .note-body").count() === 1);
    ck(P("the card is labelled NOTE"),
       (await page.locator(".note-fold").first().innerText()).trim().toUpperCase() === "NOTE",
       await page.locator(".note-fold").first().innerText());
    const body = await page.locator(".note-body").first().innerHTML();
    ck(P("the note renders as markdown"), /<b>check<\/b>/.test(body) && /<code>persistence<\/code>/.test(body), body);
    /* T12: a reference card must be level with its mention, a note need not be,
       so the note is what yields when the two want the same row. */
    ck(P("the note stacks under the author's cards"), await page.evaluate(() => {
      const side = [...document.querySelectorAll(".bside")].find(a => a.querySelector(".mnote.is-n"));
      const kids = [...side.children];
      return kids.indexOf(side.querySelector(".mnote.is-n")) === kids.length - 1;
    }));

    /* Folding is per note and is remembered. */
    await page.locator(".note-fold").first().click(); await page.waitForTimeout(250);
    ck(P("folding hides the note body"), await page.locator(".note-body").count() === 0);
    await go(`#/${cid}/index`);
    await go(`#/${cid}/${secIds[0]}`);
    ck(P("a folded note stays folded"),
       await page.locator(".mnote.is-n.is-shut").count() === 1 &&
       await page.locator(".note-body").count() === 0);
    await page.locator(".note-fold").first().click(); await page.waitForTimeout(250);
    ck(P("unfolding brings it back"), await page.locator(".note-body").count() === 1);

    await page.locator(".note-edit").first().click(); await page.waitForTimeout(250);
    const saved = await page.locator(".note-area").first().inputValue();
    ck(P("notes persist"), saved.includes("persistence"), saved.slice(0, 30) || "not found");
    await page.locator(".note-area").first().blur(); await page.waitForTimeout(300);

    /* A block takes more than one note: a lecture adds one thing and a past
       paper another, and a single textarea makes the reader edit around what
       they already wrote. The grip stays put and adds the next one. */
    await grip.scrollIntoViewIfNeeded();
    await grip.click(); await page.waitForTimeout(300);
    await page.locator(".note-area").first().fill("a second note");
    await page.locator(".note-edit", { hasText: "done" }).first().click();
    await page.waitForTimeout(400);
    ck(P("a block takes a second note"), await page.locator(".note-one").count() === 2,
       (await page.locator(".note-one").count()) + " shown");
    await go(`#/${cid}/index`);
    await go(`#/${cid}/${secIds[0]}`);
    ck(P("both notes survive"), await page.locator(".note-one").count() === 2);

    /* Deleting one was impossible at first: the textarea blurs before the
       button beside it receives pointerdown, and both handlers then wrote the
       same stale array back, so the note reappeared. */
    await page.locator(".note-edit", { hasText: "edit" }).last().click();
    await page.waitForTimeout(250);
    await page.locator(".note-drop").click(); await page.waitForTimeout(400);
    ck(P("a note can be deleted"), await page.locator(".note-one").count() === 1,
       (await page.locator(".note-one").count()) + " left");
  }

  /* One course's styles at a time: they used to be appended and never removed,
     so opening several courses left several stylesheets fighting. */
  const sheets = await page.evaluate(() => document.querySelectorAll('style[id^="cs-"]').length);
  ck(P("at most one course stylesheet is live"), sheets <= 1, sheets + " injected");

  /* dark theme actually repaints */
  await go(`#/${cid}/${secIds[0]}`);
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.evaluate(() => document.querySelector(".axes")?.setAttribute("open", ""));
  await page.locator(".axes-acts .lane-b", { hasText: "Theme" }).click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ck(P("theme toggle repaints"), before !== after, `${before} -> ${after}`);
  await shot(cid + "-dark");
}

/* ---------------------------------------------------------------------------
 * The one mark on the page that is about the page rather than the subject.
 *
 * A block whose claim nobody grounded says so in a word — `unverified` or
 * `generated` — and that word is now the whole of the device: no rule, no
 * indent, no box, and a red that belongs to nothing else on the site. It used
 * to take a dashed left edge and half a rem of padding as well, which made a
 * one-word confession the loudest object in a callout that had already made
 * its point.
 *
 * Pinned to the demo, which is the course that deliberately ships both.
 * ------------------------------------------------------------------------ */
if (ids.includes("demo")) {
  const P = n => `unsourced badge: ${n}`;
  await go("#/demo/s5-2");
  const badge = page.locator(".bsrc.is-un").first();
  ck(P("the demo still ships one"), await badge.count() === 1);
  if (await badge.count()) {
    ck(P("it is one word and nothing else"),
       /^(generated|unverified)$/.test((await badge.innerText()).trim()),
       await badge.innerText());
    const drawn = await badge.evaluate(el => {
      const c = getComputedStyle(el);
      const px = v => {
        const cx = document.createElement("canvas").getContext("2d");
        cx.fillStyle = "#000"; cx.fillStyle = v; cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
      };
      return {
        edges: ["Top", "Right", "Bottom", "Left"]
          .reduce((n, s2) => n + (parseFloat(c["border" + s2 + "Width"]) || 0), 0),
        pad: ["Top", "Right", "Bottom", "Left"]
          .reduce((n, s2) => n + (parseFloat(c["padding" + s2]) || 0), 0),
        ink: px(c.color),
        /* what a grounded citation is drawn in, where the page has one */
        plain: (() => {
          const o = document.querySelector(".bsrc:not(.is-un)");
          return o ? px(getComputedStyle(o).color) : null;
        })()
      };
    });
    ck(P("it draws no rule and takes no indent"),
       drawn.edges === 0 && drawn.pad === 0, JSON.stringify(drawn));
    /* Red, and measurably so: more red than either other channel, by a margin
       no grey or terracotta on this palette reaches. Asserted on the channels
       rather than on a hex, because the token is stated in OKLCH and the exact
       sRGB it resolves to is the browser's business. */
    const [r, g, b] = drawn.ink;
    ck(P("and is red"), r > g + 60 && r > b + 60, drawn.ink.join(","));
    if (drawn.plain)
      ck(P("which a grounded citation is not"),
         drawn.plain.join(",") !== drawn.ink.join(","), drawn.plain.join(","));
  }
}

/* ---------------------------------------------------------------------------
 * Structure inside and between blocks, on the page that motivated it.
 *
 * ma26600 §1.6 carries all three: a procedure in `items:`, a depth "why"
 * attached to the definition it explains, and an aside anchored to one step.
 * Pinned to that subsection rather than swept, because each is authored in a
 * handful of places and a sweep would pass vacuously wherever it is absent.
 * ------------------------------------------------------------------------ */
if (ids.includes("ma26600")) {
  const P = n => `ma26600 §1.6: ${n}`;
  await go("#/ma26600/s1-6");
  const sub = page.locator("#s1-6");
  const potential = sub.locator(".key", { hasText: "Building the potential" });
  ck(P("a callout's steps render as a list"),
     await potential.locator("ol.bitems > li").count() === 4);

  /* The default lane hides depth, so the why is a stub hanging off its parent. */
  const attached = sub.locator('.dtab[aria-expanded="false"]').first();
  ck(P("a hidden follow-up has a rail tab"), await attached.count() === 1,
     await sub.locator(".dtab-t").allInnerTexts().then(t => t.join(" | ")));
  const rail = await sub.locator(".brow[data-follow] > .bmain").first()
    .evaluate(el => getComputedStyle(el).borderLeftWidth).catch(() => "");
  ck(P("a follow-up draws its rail"), rail === "2px", rail);
  if (await attached.count()) {
    await attached.click(); await page.waitForTimeout(300);
    ck(P("the tab opens the why in place, still attached"),
       await sub.locator(".brow[data-follow] .note", { hasText: "The mixed-partials argument" }).count() === 1);
  }

  /* The aside pairs with its phrase the way a concept card does. */
  const anchor = sub.locator('.nref[data-xr="n:only-y"]');
  const card = sub.locator('.mnote.is-a[data-xr="n:only-y"]');
  ck(P("an anchored phrase is marked"), await anchor.count() === 1);
  ck(P("its aside sits in the margin of the same row"),
     await sub.locator('.brow:has(.nref[data-xr="n:only-y"]) .bside .mnote.is-a').count() === 1);
  if (await anchor.count() && await card.count()) {
    await anchor.hover(); await page.waitForTimeout(150);
    ck(P("hovering the phrase lights its aside"),
       await card.evaluate(el => el.classList.contains("hot")));
  }
  ck(P("no raw anchor markup reaches the page"),
     !(await page.locator("#s1-6").innerHTML()).includes("<n "));

  /* Review keeps the steps: they are the content, not development under a claim.
     Set from the toolbar, which is the one control over this axis since the
     sidebar's duplicate of it was removed. */
  const review = page.locator(".modesw-b:not(.modesw-cycle)", { hasText: "Review" });
  if (await review.count()) {
    await review.click(); await page.waitForTimeout(300);
    ck(P("Review depth keeps a callout's steps open"),
       await sub.locator("ol.bitems > li").count() >= 4);
    ck(P("Review depth shows the phrase without its anchor mark"),
       await sub.locator(".nrow .nref").count() === 0);
    await page.locator(".modesw-b:not(.modesw-cycle)", { hasText: "Study" }).click();
    await page.waitForTimeout(250);
  }
  await shot("ma26600-s1-6");
}

/* ---------------------------------------------------------------------------
 * The reading position, which is an anchor and not an offset.
 *
 * Two things used to move the reader without being asked to: changing the
 * width re-wrapped every line above them and left the scroll offset pointing
 * somewhere else, and an installed app relaunched at start_url with no hash at
 * all. Both are the same question — where was the reader — so both are asserted
 * against the same anchor.
 * ------------------------------------------------------------------------ */
{
  const anchor = () => page.evaluate(() => {
    const subs = [...document.querySelectorAll(".sub[id]")];
    let hit = subs[0];
    for (const el of subs) if (el.getBoundingClientRect().top <= 4) hit = el;
    return hit && { id: hit.id, top: Math.round(hit.getBoundingClientRect().top),
                    y: Math.round(scrollY), hash: location.hash };
  });
  const topOf = id => page.evaluate(i => {
    const el = document.getElementById(i);
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  }, id);

  const cid = ids[0];
  const secs = await page.evaluate(async c => {
    location.hash = "#/" + c;
    await new Promise(r => setTimeout(r, 600));
    return [...document.querySelectorAll(".toc a[href]")].map(a => a.getAttribute("href"));
  }, cid);
  /* the longest section available, so a reflow has something to move */
  let deep = null;
  for (const h of secs.slice(0, 8)) {
    await go(h);
    const tall = await page.evaluate(() => document.documentElement.scrollHeight);
    if (!deep || tall > deep.tall) deep = { h, tall };
  }
  if (deep && deep.tall > 2400) {
    await go(deep.h);
    await page.evaluate(t => scrollTo({ top: Math.round(t * 0.45), behavior: "instant" }), deep.tall);
    await page.waitForTimeout(700);
    const was = await anchor();

    await page.setViewportSize({ width: 620, height: 900 });
    await page.waitForTimeout(1200);
    const now = { top: await topOf(was.id),
                  y: await page.evaluate(() => Math.round(scrollY)) };
    /* The offset moved and the anchor did not: that is the whole of the fix.
       Asserting the offset held would assert the bug. */
    ck("a change of width holds the reading position",
       now.top != null && Math.abs(now.top - was.top) <= 8,
       `anchor ${was.top} -> ${now.top}, offset ${was.y} -> ${now.y}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);

    /* Relaunch: the platform hands the app start_url and nothing else. */
    await go(deep.h);
    await page.evaluate(t => scrollTo({ top: Math.round(t * 0.45), behavior: "instant" }), deep.tall);
    await page.waitForTimeout(1500);
    const closed = await anchor();
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(300);
    await go("");                          /* no hash, as a home-screen launch */
    await page.waitForTimeout(1800);
    const back = { hash: await page.evaluate(() => location.hash), top: await topOf(closed.id) };
    ck("reopening with no route resumes the one it was closed on",
       back.hash === closed.hash, `${closed.hash} -> ${back.hash}`);
    ck("and at the place it was closed at",
       back.top != null && Math.abs(back.top - closed.top) <= 8,
       `anchor ${closed.top} -> ${back.top}`);
  }
}

/* ---------------------------------------------------------------------------
 * Grading a quiz question is one answer, not a repeatable action.
 *
 * The buttons used to stay live, and every extra press was folded in as
 * another recall: `rateStep` multiplies the interval by the ease factor each
 * time, so pressing "Got it" five times on a question answered once pushed the
 * next review out by a fortnight and wrote five rows into the log everything
 * else is a fold over.
 * ------------------------------------------------------------------------ */
{
  const cid = ids[0];
  const first = await page.evaluate(async c => {
    location.hash = "#/" + c;
    await new Promise(r => setTimeout(r, 600));
    return (document.querySelector(".toc a[href]") || {}).hash || "";
  }, cid);
  await go(first);
  const q = page.locator(".q").first();
  if (await q.count() && await q.locator('.cbtn[data-conf="1"]').count()) {
    await q.scrollIntoViewIfNeeded();
    await q.locator('.cbtn[data-conf="1"]').click(); await page.waitForTimeout(200);
    const skip = q.locator("button", { hasText: /^skip$/i });
    if (await skip.count()) { await skip.click(); await page.waitForTimeout(300); }
    const ok = q.locator(".gbtn.ok");
    if (await ok.count()) {
      /* An earlier check in this run already missed this question, and a missed
         question's interval is zero — so it is legitimately due again and this
         is a second answer. Only the rows written from here on are this test's. */
      const t0 = await page.evaluate(() => Date.now());
      await ok.click({ force: true }); await page.waitForTimeout(400);
      const once = await page.evaluate(() =>
        document.querySelector(".q .gnote").innerText);
      for (let i = 0; i < 4; i++) { await ok.click({ force: true }); await page.waitForTimeout(100); }
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => {
        const g = document.querySelector(".q .qgrade");
        return { note: g.querySelector(".gnote").innerText,
                 inert: g.querySelector(".gbtn.ok").disabled && g.querySelector(".gbtn.no").disabled };
      });
      ck("an answered question stops taking answers", after.inert);
      ck("pressing Got it again does not move the review date",
         after.note === once, `"${once}" -> "${after.note}"`);
      const qid = await q.getAttribute("data-qid");
      const rows = await page.evaluate(([id, since]) => new Promise(res => {
        const r = indexedDB.open("learn");
        r.onsuccess = () => {
          const g = r.result.transaction("log").objectStore("log").getAll();
          g.onsuccess = () => res(g.result.filter(
            x => x.loop === "A" && x.itemId === id && x.correct != null && x.ts >= since).length);
        };
      }), [qid, t0]);
      ck("and writes one row, not five", rows === 1, rows + " outcome rows for " + qid);
    }
  }
}

/* A row of flow steps gives each note a measure rather than a share of the
   column. Four notes across a 566px reading column came out at seventeen
   characters a line; past the floor the steps stop shrinking and the figure
   frame is what scrolls. */
{
  for (const cid of ids) {
    await go("#/" + cid);
    const secs = await page.evaluate(() =>
      [...document.querySelectorAll(".toc a[href]")].map(a => a.getAttribute("href")));
    let seen = false;
    for (const h of secs) {
      await go(h);
      await page.keyboard.press("3"); await page.waitForTimeout(300);
      const row = page.locator(".fx-flow.is-row").first();
      if (!(await row.count())) continue;
      seen = true;
      const m = await row.evaluate(el => {
        const step = el.querySelector(".fx-step");
        const cs = getComputedStyle(step);
        const inner = step.getBoundingClientRect().width -
          parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const frame = el.closest(".figure");
        return { inner: Math.round(inner),
                 framed: !!frame && frame.scrollWidth >= el.scrollWidth - 1,
                 nested: getComputedStyle(el).overflowX === "auto" };
      });
      /* ~24 characters at the note's size. Below that a note is a squeezed
         block rather than a sentence. */
      ck("a flow step gives its note a readable measure", m.inner >= 130, m.inner + "px");
      ck("the figure frame is what scrolls, not the list", !m.nested && m.framed);
      break;
    }
    if (seen) break;
  }
}

/* Review, at both scopes.
 *
 * It used to be one cross-course route that drew its own full-bleed frame with
 * no sidebar and a Close button, which made it the only page on the site that
 * was really a modal. It is an ordinary page now, at the scope that matches the
 * frame it is drawn in: a course's queue inside that course's shell, the
 * cross-course queue on the library, which has no course either. Both render
 * whether or not anything is due — an empty queue is a state, and the reader
 * has to be able to see that it is empty. */
{
  await go("#/review");
  const has = await page.locator(".review").count() === 1;
  ck("the cross-course review renders", has);
  if (has) {
    /* Every page's way out, and no way out of its own. A Close button was the
       last thing claiming this was a modal. */
    ck("review has no close button of its own",
       await page.evaluate(() => ![...document.querySelectorAll(".review button, .review a")]
         .some(b => /close/i.test(b.textContent || ""))));
    ck("review is framed by the toolbar like every other page",
       await page.locator(".topbar").count() === 1);
    ck("and the breadcrumb is the way back",
       /Review/.test(await page.locator(".crumb").innerText()));
    ck("it names which queue it is",
       /all courses/i.test(await page.locator(".review-scope").innerText()),
       await page.locator(".review-scope").innerText());
    ck("review states its progress in words", await page.locator(".review-n, .review h1").count() >= 1);
    await shot("review");
    await page.setViewportSize({ width: 390, height: 780 });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ck("review does not scroll sideways on a phone", overflow <= 1, overflow + "px");
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  /* Somewhere in the sweep a course does have a drill bank, and its rail must
     have shown the row. Without this the per-course check above would pass on
     a build where the row never rendered at all. */
  ck("the review queue reaches the rail of a course that has one", sawQueueRow);
ck("some course carries an aside into Review", sawAside);
ck("some collapsed run draws its tab in the margin", sawDepthTab);

  /* The course-scoped one. This is the half that needed the reframing: a rail
     belongs to one course, and a row in it that drilled every other course was
     the reason the page wanted a frame of its own. */
  await go(`#/${ids[0]}/review`);
  ck("a course has a review of its own", await page.locator(".review").count() === 1);
  ck("and it keeps that course's sidebar", await page.locator(".sidebar").count() === 1);
  ck("and names the course as its scope",
     (await page.locator(".review-scope").innerText()).trim().length > 0,
     await page.locator(".review-scope").innerText());
  ck("the rail marks the row you are standing on",
     await page.locator(".navtop a.rv-row.cur").count() === 1);
}

/* Reading a page aloud.
 *
 * The engine's state machine is driven against a fake in tools/test-speech.mjs,
 * because CI has no audio device and no platform voice. What is left to assert
 * here is the wiring the fake cannot see: that the control is reachable, that
 * pressing it turns the rendered column into cues, that the bar appears only
 * while a session does, and that the page says which line is being spoken. */
{
  /* secIds belongs to the per-course sweep above; this block runs once, so it
     asks the rail for a section rather than borrowing a name out of scope. */
  await go(`#/${ids[0]}`);
  const firstSec = await page.evaluate(() => {
    const a = document.querySelector(".rail .sec-btn");
    return a ? (a.getAttribute("href") || "").split("/").pop() : null;
  });
  await go(`#/${ids[0]}/${firstSec}`);
  const engine = await page.evaluate(() => typeof speechSynthesis !== "undefined");
  if (!engine) ck("no speech engine in this browser, wiring not asserted", true);
  else {
    ck("no bar before a session", await page.locator(".spk").count() === 0);
    /* Under Settings, in the Reading band. It has to be a real press
       and not a call: iOS and Chrome only let speech begin inside a user
       gesture, so a test that started the session any other way would pass
       against a build no reader could use. */
    await page.evaluate(() => document.querySelector(".axes")?.setAttribute("open", ""));
    const go1 = page.locator(".spk-go");
    ck("Listen sits with the other reading controls", await go1.count() === 1);
    await go1.click();
    await page.waitForTimeout(700);

    ck("a session docks a bar", await page.locator(".spk").count() === 1);
    ck("the bar carries a speed control",
       await page.locator(".spk-set .dd-b").count() >= 1);
    /* The queue is the rendered column, so it must have found the prose. */
    const total = await page.locator(".spk-n").innerText();
    ck("the page became a queue", /\d+ of \d+/.test(total) && !/ of 0$/.test(total), total);
    ck("the line being spoken is marked",
       await page.locator(".is-speaking").count() === 1);

    /* Nothing hidden may be queued: a closed depth leaves the block in the
       document, and reading text the reader cannot see is the one way this
       feature can lie about the page. */
    ck("nothing hidden is marked",
       await page.evaluate(() => {
         const el = document.querySelector(".is-speaking");
         return !!el && (el.checkVisibility ? el.checkVisibility() : el.offsetParent !== null);
       }));

    /* The bar names the place in the page's own words, and those words are
       assembled from a heading whose number and title are separate elements
       with no whitespace between them. Read with textContent they fuse into
       "1.3Review and drills". */
    const bar = await page.locator(".spk").innerText();
    ck("nothing in the bar reads as a fused number and word",
       !/\d[A-Za-z]/.test(bar), JSON.stringify(bar.slice(0, 80)));

    /* A caption is the only part of a figure, a table or an image that
       linearises into speech, and the three render it as three different
       elements — `.fcap`, `<caption>`, `<figcaption>`. Knowing only the first
       left tables and images silent. Stepped through rather than waited for,
       because the assertion is about the queue, not about timing. */
    /* Captions are the only part of a figure, a table or an image that
       linearises into speech, and the three render it as three different
       elements — `.fcap`, `<caption>`, `<figcaption>`. Knowing only the first
       left tables and images silent.
     *
     * Asserted by removing them rather than by hunting for one in the queue:
       the queue is built from what is *displayed*, so hiding every caption must
       make it shorter. That tests the rule in both directions at once and does
       not depend on where in a long section a caption happens to fall. */
    const queueSize = async () => {
      await page.evaluate(() => document.querySelector(".axes")?.setAttribute("open", ""));
      await page.locator(".spk-go").click();
      await page.waitForTimeout(600);
      const t = await page.locator(".spk-n").innerText();
      await page.locator(".spk-x").click();
      await page.waitForTimeout(200);
      return Number((t.split(" of ")[1] || "0").trim());
    };
    await page.locator(".spk-x").click();
    await page.waitForTimeout(250);
    const capsOnPage = await page.evaluate(() =>
      document.querySelectorAll(".sub .bmain .fcap, .sub .bmain caption, .sub .bmain figcaption").length);
    if (capsOnPage) {
      const withCaps = await queueSize();
      await page.evaluate(() => {
        const st = document.createElement("style");
        st.id = "no-caps";
        /* `!important`: the figure stylesheet reaches these with a more
           specific selector, and a bare rule here silently loses to it. */
        st.textContent = ".fcap,caption,figcaption{display:none !important}";
        document.head.appendChild(st);
      });
      const without = await queueSize();
      ck("captions are read aloud", without < withCaps, `${withCaps} chunks -> ${without}`);
      await page.evaluate(() => document.getElementById("no-caps")?.remove());
    }
    await page.evaluate(() => document.querySelector(".axes")?.setAttribute("open", ""));
    await page.locator(".spk-go").click();
    await page.waitForTimeout(650);

    ck("the control says how to stop",
       /stop/i.test(await page.locator(".spk-go").innerText()),
       await page.locator(".spk-go").innerText());
    await page.locator(".spk-x").click();
    await page.waitForTimeout(300);

    /* Listening starts where the reader is. Reading from the top is right on a
       page just opened and wrong every other time: someone who scrolled to the
       middle and pressed Listen meant the middle. */
    const first = await page.evaluate(() => {
      const c = document.querySelector(".sub .bmain p");
      return c ? c.textContent.trim().slice(0, 30) : null;
    });
    await page.evaluate(() => {
      const subs = [...document.querySelectorAll(".sub")];
      (subs[subs.length - 1] || subs[0]).scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
    /* Dispatched rather than clicked. Playwright scrolls a target into view
       before clicking it, and the target is in the rail — so a real click here
       would undo the scroll position this assertion is entirely about. The
       gesture path is already covered by the session started above. */
    await page.evaluate(() => {
      document.querySelector(".axes")?.setAttribute("open", "");
      document.querySelector(".spk-go")?.click();
    });
    await page.waitForTimeout(700);
    const started = await page.evaluate(() => {
      const el = document.querySelector(".is-speaking");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const bar = document.querySelector(".topbar");
      return { text: el.textContent.trim().slice(0, 30),
               onScreen: r.bottom > (bar ? bar.getBoundingClientRect().bottom : 0) && r.top < innerHeight };
    });
    ck("scrolled down, it starts at what is on screen",
       !!started && started.onScreen, JSON.stringify(started));
    ck("and not back at the top of the page",
       !!started && started.text !== first, JSON.stringify({ started: started && started.text, first }));
    await page.locator(".spk-x").click();
    await page.waitForTimeout(300);
    ck("stopping takes the bar away", await page.locator(".spk").count() === 0);
    ck("and unmarks the page", await page.locator(".is-speaking").count() === 0);
  }
}

/* Syntax highlighting, on the route a reader actually arrives at.
 *
 * Two defects hid behind each other here. The block config is read while a
 * block renders, and it used to be set in an effect that runs after that
 * render — so a deep link or a reload painted a section with no highlighting
 * and no valueStyles, and only navigating in from another view looked right.
 * Underneath that, the highlighter ran a regex pass per token type over a
 * string the previous pass had already put markup into, so the `strings` pass
 * matched the quoted class name inside an emitted span and shredded it.
 *
 * So this loads the route cold rather than clicking to it, and asserts on the
 * markup rather than on a span count: a corrupt run still produces spans. */
{
  let found = null;
  for (const cid of ids) {
    await go("#/" + cid);
    const secs = await page.evaluate(() =>
      [...document.querySelectorAll(".toc a[href]")].map(a => a.getAttribute("href")));
    for (const h of secs) {
      await go(h);                       /* go() is a full load, not a click */
      if (await page.locator("pre code [class^=tok-]").count()) { found = h; break; }
    }
    if (found) break;
  }
  if (found) {
    /* A hash change is not a load. goto() with only the fragment different
       leaves the app mounted, so the config the previous view's effect set is
       still in place — which is exactly the state that hid this bug. Only a
       reload puts a reader on the route cold. */
    await page.reload();
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const el = document.querySelector("pre code");
      return { html: el.innerHTML, text: el.textContent,
               classes: [...new Set([...el.querySelectorAll("[class]")].map(e => e.className))] };
    });
    ck("a code block reloaded cold is highlighted",
       r.classes.some(c => /^tok-/.test(c)), r.classes.join(",") || "no spans");
    /* The shredded form produced `class="<span`: an emitted class that is
       itself markup. It survives any span count, so the count is not the test. */
    ck("highlighter does not mark up its own output",
       r.classes.every(c => /^[\w- ]+$/.test(c)) && !/&lt;span|class="&lt;/.test(r.html),
       r.classes.join(","));
    /* The listing must read as the author wrote it. A class name showing up as
       visible text is the corruption reaching the reader. */
    ck("no markup leaks into the listing text",
       !/tok-[cksn]|<span|&lt;/.test(r.text), JSON.stringify(r.text.slice(0, 60)));
  }
}

/* Phrase-note pairing, depth disclosures and text-level resize preservation
   have focused browser coverage in test-reading.mjs, including mobile. */

ck("no JavaScript errors", errs.length === 0, errs.join(" | "));
await browser.close();
closeServer();

const bad = R.filter(r => !r.ok);
console.log(`${bad.length ? "FAIL" : "ok  "} dist/       ${R.length - bad.length}/${R.length} checks` +
  (SHOTS ? ` · screenshots in .shots/` : ""));
bad.forEach(r => console.log(`       ✗ ${r.n}${r.x ? "  [" + r.x + "]" : ""}`));
process.exit(bad.length ? 1 : 0);
