export async function testPracticeAndNotes(ctx, state) {
  const { page, ck, go, shot } = ctx;
  const { cid, P, nSections, secIds, last } = state;
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

    /* A blank note is the no-writing path into the same collection, which
       belongs to Explore rather than adding another sidebar destination. */
    const markerGrip = page.locator(".note-pull").nth(1);
    await markerGrip.click(); await page.waitForTimeout(200);
    await page.locator(".note-area").first().blur(); await page.waitForTimeout(350);
    ck(P("a blank note collapses into a saved marker"),
       await page.locator(".mnote.is-n.is-blank").count() > 0);
    await go(`#/${cid}/explore/saved`);
    ck(P("Saved groups annotations as ordinary subsections"),
       await page.locator(".saved-section .sub h3").count() > 0);
    ck(P("Saved uses the ordinary reading rows and note cards"),
       await page.locator(".saved-section .brow .bmain").count() > 0 &&
       await page.locator(".saved-section .note-body").count() > 0 &&
       await page.locator(".saved-section .mnote.is-blank").count() > 0);
    ck(P("a blank marker needs no redundant caption"),
       await page.getByText("Marked for later", { exact: true }).count() === 0);
    ck(P("Saved uses the shared topbar reading modes"),
       await page.locator(".saved-view .saved-modes").count() === 0 &&
       await page.locator(".topbar .modesw").count() === 1);
    await page.locator(".topbar .modesw-b", { hasText: "Names" }).click();
    await page.waitForTimeout(250);
    ck(P("Saved changes depth like a section"),
       await page.locator(".saved-section.depth-index").count() === 1);
    ck(P("Saved compact rows do not draw a stray kind marker"),
       await page.locator(".saved-section .nrow").first().evaluate(el =>
         getComputedStyle(el, "::before").display === "none"));
    await page.locator(".topbar .modesw-b", { hasText: "Study" }).click();
    await page.waitForTimeout(200);
    await go(`#/${cid}/index`);
    await go(`#/${cid}/explore/saved`);
    ck(P("saved markers persist"), await page.locator(".saved-section .mnote.is-blank").count() > 0);
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
