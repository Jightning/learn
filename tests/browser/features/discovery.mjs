export async function testDiscovery(ctx, state) {
  const { page, ck, go, shot } = ctx;
  const { cid, P, nSections, secIds, last } = state;
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
    ck(P("saved blocks are a view within Explore"),
       await page.locator('.xviews a[href$="/explore/saved"]').count() === 1 &&
       await page.locator('.sidebar .navtop a', { hasText: "Saved" }).count() === 0);
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

}
