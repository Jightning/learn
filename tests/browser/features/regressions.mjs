export async function testRegressions(ctx) {
  const { ROOT, URL, browser, page, ck, go, shot, ids } = ctx;
  const { sawQueueRow } = ctx;
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
 * The engine's state machine is driven against a fake in tests/unit/speech.test.mjs,
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
   have focused browser coverage in reading.test.mjs, including mobile. */

}
