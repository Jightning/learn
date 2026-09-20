export async function testLearning(ctx, state) {
  const { page, ck, go, shot } = ctx;
  const { cid, P, nSections, secIds, last } = state;
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

}
