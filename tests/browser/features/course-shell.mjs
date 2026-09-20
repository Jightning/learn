export async function testCourseShell(ctx, cid) {
  const { page, ck, go, shot } = ctx;
  const P = n => `${cid}: ${n}`;
  const swipe = points => page.evaluate(path => {
    const target = document.querySelector("main");
    const fire = (type, point) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 41, pointerType: "touch", isPrimary: true,
      clientX: point[0], clientY: point[1]
    }));
    fire("pointerdown", path[0]);
    path.slice(1, -1).forEach(point => fire("pointermove", point));
    fire("pointerup", path[path.length - 1]);
  }, points);
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
  if (narrow.queue.length) ctx.sawQueueRow = true;

  /* The drawer opens from an intentional touch swipe, not from a vertical
     scroll whose finger happens to drift right or from a short adjustment. */
  await swipe([[30, 180], [42, 210], [95, 300]]);
  await page.waitForTimeout(50);
  ck(P("angled scrolling does not open the mobile sidebar"),
     await page.locator(".sidebar.open").count() === 0);
  await swipe([[30, 300], [42, 270], [95, 180]]);
  await page.waitForTimeout(50);
  ck(P("angled upward scrolling does not open the mobile sidebar"),
     await page.locator(".sidebar.open").count() === 0);
  await swipe([[30, 180], [50, 184], [70, 186]]);
  await page.waitForTimeout(50);
  ck(P("a short right drag does not open the mobile sidebar"),
     await page.locator(".sidebar.open").count() === 0);
  await swipe([[30, 180], [50, 186], [90, 205]]);
  await page.waitForTimeout(250);
  ck(P("a diagonal right swipe opens the mobile sidebar"),
     await page.locator(".sidebar.open").count() === 1
     && await page.locator(".scrim.on").count() === 1);
  /* The scrim spans the viewport behind the drawer. Its centre is inside the
     290px drawer on a 390px phone, so click the exposed strip rather than ask
     Playwright to click a point another element is meant to cover. */
  await page.locator(".scrim.on").click({ position: { x: 350, y: 400 } });
  await page.waitForTimeout(220);

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
  await swipe([[30, 180], [55, 184], [125, 190]]);
  await page.waitForTimeout(50);
  ck(P("a touch swipe does not open the desktop sidebar"),
     await page.locator(".sidebar.open").count() === 0
     && await page.locator(".scrim.on").count() === 0);
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

  return { cid, P, nSections, secIds, last };
}
