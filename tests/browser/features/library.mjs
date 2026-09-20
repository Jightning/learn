export async function testLibrary(ctx) {
  const { ROOT, URL, browser, page, ck, go, shot, installDemoFixture } = ctx;
await go();

/* Only the courses in PUBLIC reach dist/. A second course derived from demo is
   imported through the reader's real path so multi-course behavior remains
   covered without making tests depend on user courses in courses/ or packed/. */
const installed = await installDemoFixture(page, ROOT);
if (installed) {
  const failed = await page.locator(".cio-msg.bad").count();
  ck("demo fixture installs", failed === 0,
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
    await installDemoFixture(ip, ROOT);
    await ip.goto(URL); await ip.waitForTimeout(1100);
    const warn = await ip.locator(".cio-warn").count();
    ck(`on ${where} the install advice is ${standalone ? "silent" : "shown"}`,
       standalone ? warn === 0 : warn === 1, "warnings: " + warn);
    await ip.close();
  }
}

  ctx.ids = ids;
}
