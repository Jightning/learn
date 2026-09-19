#!/usr/bin/env node
/* Lists inside callouts, follow-ups, and asides — the engine half and the
 * build half, asserted without a browser.
 *
 * Each of the three was added because a course showed the failure on the page
 * (a procedure run into one paragraph, a "why" five blocks from what it
 * explained, no way to annotate one step), and each of them fails silently if
 * it regresses: the page still renders, just flatter. So the properties are
 * pinned here rather than trusted to a screenshot.
 *
 *   node tools/test-structure.mjs
 */
const fail = [];
const check = (name, cond, extra = "") => {
  if (cond) console.log(`  ok    ${name}`);
  else { console.log(`  FAIL  ${name} ${extra}`); fail.push(name); }
};

const { renderBlock } = await import("../src/blocks/index.js");
const { present, topicsOf } = await import("../src/lib/gist.js");
const { runsOf, attachedLabel } = await import("../src/lib/tiers.js");
const { nameOf } = await import("../src/lib/gist.js");
const { parentIndex } = await import("../src/lib/follows.js");
const { asidesOf, renderAnchors, dropAnchors, anchorKeys } = await import("../src/lib/asides.js");
const { decorate } = await import("../src/lib/refs.js");
const { checkRunInLists, checkFollows, checkAsides } = await import("./lib/structure.mjs");

/* ---- items: on a callout ------------------------------------------------ */

const steps = { t: "key", label: "Steps", ordered: true, items: ["one", "two"], source: "X" };
const html = renderBlock(steps, {});
check("a key renders its items as an ordered list",
      /<ol class="bitems"><li>one<\/li><li>two<\/li><\/ol>/.test(html), html);
check("items render inside the callout, before the source line",
      html.indexOf("bitems") < html.indexOf("bsrc") && html.startsWith('<div class="key">'), html);
check("items are unordered unless ordered: true",
      renderBlock({ ...steps, ordered: false }, {}).includes('<ul class="bitems">'));
for (const t of ["def", "trap", "note"])
  check(`a ${t} renders items`, renderBlock({ t, items: ["x"] }, {}).includes("bitems"));
check("a list block still renders its items after its intro",
      /intro[\s\S]*bitems/.test(renderBlock({ t: "list", h: "intro", items: ["x"] }, {})));
check("a callout with no items renders no empty list",
      !renderBlock({ t: "key", h: "<p>x</p>" }, {}).includes("bitems"));

check("Review depth keeps a callout's steps open",
      present(steps, "notes").mode === "full", present(steps, "notes").mode);
check("…even when it carries a claim",
      present({ ...steps, core: "Do these." }, "notes").mode === "full");
check("an explicit notes: still wins",
      present({ ...steps, notes: "closed" }, "notes").mode === "closed");
check("a note with items stays closed, as notes do",
      present({ t: "note", items: ["x"] }, "notes").mode === "closed");

/* ---- table: the column a `split:` marks ---------------------------------- */
/*
 * The marker class is `tsplit` and may never be `sep`. `.sep` is the hairline
 * divider token in 00-tokens.css — display:inline-block, 1px wide, .82em tall,
 * painted in `--rule` — so a cell wearing it leaves the table layout entirely
 * and renders as a grey box. Every `split:` table in every course shipped that
 * way, because both meanings had claimed the same four letters and the rule
 * scoped to the table only added a border on top of the damage.
 */
const tbl = { t: "table", split: 2, head: ["a", "b", "c"], rows: [["1", "2", "3"]] };
const thtml = renderBlock(tbl, { fignum: "1.1" });
check("split marks the last input column, head and body",
      (thtml.match(/class="tsplit"/g) || []).length === 2, thtml);
check("no table cell wears the hairline divider's class",
      !/<t[hd] class="sep"/.test(thtml), thtml);
check("a table with no split marks nothing",
      !renderBlock({ ...tbl, split: undefined }, {}).includes("tsplit"));

/* ---- follows: ------------------------------------------------------------ */

const S = (extra = {}) => ({ t: "key", h: "<p>x.</p>", ...extra });
const D = (extra = {}) => ({ t: "note", tier: "depth", label: "Why", h: "<p>y.</p>", ...extra });

const flat = [S(), D({ follows: true }), S({ follows: true }), S()];
check("a follow-up attaches to the block above it", parentIndex(flat, 1) === 0);
check("consecutive follow-ups share one parent", parentIndex(flat, 2) === 0);
check("a block without follows attaches to nothing", parentIndex(flat, 3) === -1);
check("a follow-up on the first block attaches to nothing", parentIndex([S({ follows: true })], 0) === -1);

const runs = runsOf([S(), D({ follows: true }), D(), S()], "spine");
check("a hidden follow-up is its own attached run",
      runs.length === 4 && runs[1].attached === true && runs[1].items.length === 1,
      JSON.stringify(runs.map(r => [r.hidden, r.attached, r.items.length])));
check("a hidden block that follows nothing gets its own stub", runs[2].attached === false);
check("a run of hidden follow-ups stays one run",
      runsOf([S(), D({ follows: true }), D({ follows: true })], "spine")[1].items.length === 2);
check("a follow-up of a hidden parent joins the parent's run",
      runsOf([S(), D(), D({ follows: true })], "spine")[1].items.length === 2);
check("the attached stub names what it holds",
      attachedLabel([{ b: D({ label: "The argument" }) }], nameOf) === "In depth: The argument");

const topics = topicsOf([{ b: { t: "def", term: "A" }, i: 0 },
                         { b: { t: "def", term: "B", follows: true }, i: 1 }]);
check("a def marked follows does not open its own topic",
      topics.length === 1 && topics[0].items.length === 1);

/* ---- asides -------------------------------------------------------------- */

const withAside = { t: "key", h: '<p>solve for <n k="g"><m>g(y)</m></n> now</p>',
                    asides: { g: "<p>because.</p>" } };
const a = asidesOf(withAside);
check("an anchored aside is found with its phrase and body",
      a.length === 1 && a[0].id === "g" && a[0].phrase === "<m>g(y)</m>" && a[0].body === "<p>because.</p>",
      JSON.stringify(a));
check("an aside with no anchor is not drawn",
      asidesOf({ t: "key", h: "<p>x</p>", asides: { g: "y" } }).length === 0);
check("anchors inside items are found", asidesOf({ t: "key", items: ['<n k="z">p</n>'], asides: { z: "q" } }).length === 1);
check("the reading row marks the phrase for pairing",
      renderAnchors(withAside.h).includes('<span class="nref" data-xr="n:g">'));
check("everywhere else the phrase is plain text",
      dropAnchors(withAside.h) === "<p>solve for <m>g(y)</m> now</p>");
check("decorate drops anchors it was not given pre-rendered",
      !/<n\b|nref/.test(decorate(withAside.h, "c", {})));
check("decorate keeps anchors the row already rendered",
      decorate(renderAnchors(withAside.h), "c", {}).includes("nref"));
check("anchorKeys lists every key", anchorKeys('<n k="a">x</n> <n k="b">y</n>').join() === "a,b");

/* ---- the build gates ----------------------------------------------------- */

const course = blocks => ({ sections: [{ subs: [{ id: "s1-1", blocks, quiz: [] }] }] });
const gate = (fn, blocks) => { const e = [], w = []; fn(course(blocks), e, w); return { e, w }; };

check("a run-in enumeration in a callout fails",
      gate(checkRunInLists, [S({ h: "<p>(1) Do a. (2) Do b. (3) Do c.</p>" })]).e.length === 1);
check("…and names items: as the fix",
      /items:/.test(gate(checkRunInLists, [S({ h: "<p>(1) A. (2) B. (3) C.</p>" })]).e[0] || ""));
check("equation numbers do not trip it",
      gate(checkRunInLists, [S({ h: "<p>From (1) and (2) we get y.</p>" })]).e.length === 0);
check("O(1) and derivative orders do not trip it",
      gate(checkRunInLists, [S({ h: "<p>O(1) (2) <m>y^{(1)} (2) (3)</m> x</p>" })]).e.length === 0);
check("items: on a block that cannot render them fails",
      gate(checkRunInLists, [{ t: "ex", title: "t", h: "<ol><li>x</li></ol>", items: ["x"] }]).e.length === 1);

check("follows: on the first block fails", gate(checkFollows, [S({ follows: true })]).e.length === 1);
check("follows: must be true", gate(checkFollows, [S(), S({ follows: "yes" })]).e.length === 1);
check("a spine block may not follow a depth block",
      gate(checkFollows, [D(), S({ follows: true })]).e.length === 1);
check("a depth block may follow a spine block",
      gate(checkFollows, [S(), D({ follows: true })]).e.length === 0);

check("an anchor with no aside fails",
      gate(checkAsides, [S({ h: '<p><n k="q">x</n></p>' })]).e.length === 1);
check("an aside with no anchor fails",
      gate(checkAsides, [S({ asides: { q: "y" } })]).e.length === 1);
check("a paired anchor and aside pass", gate(checkAsides, [withAside]).e.length === 0);
check("a long aside warns",
      gate(checkAsides, [{ ...withAside, asides: { g: "w ".repeat(200) } }]).w.length === 1);
check("an anchor in a question fails", (() => {
  const e = []; checkAsides({ sections: [{ subs: [{ id: "s", blocks: [], quiz: [{ q: '<n k="a">x</n>' }] }] }] }, e, []);
  return e.length === 1;
})());

console.log(fail.length ? `\n${fail.length} failed` : "\nall passed");
process.exit(fail.length ? 1 : 0);
