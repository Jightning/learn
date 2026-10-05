import assert from "node:assert/strict";
import { test } from "node:test";
import { renderBlock, setBlockConfig } from "../../src/blocks/index.js";
import { buildIndex } from "../../src/lib/index.js";

test("authored visual cues survive prose, terms, and mapped table cells", () => {
  const prose = renderBlock({ t: "def", term: "<em>Boundary</em>",
    h: "<p><strong>Compare</strong> <mark>the sign</mark> <span class=\"ink-caution\">carefully</span>. <u>Now</u> <s>not then</s>.</p>" }, {});
  assert.match(prose, /<dt><em>Boundary<\/em><\/dt>/);
  assert.match(prose, /<strong>Compare<\/strong> <mark>the sign<\/mark>/);
  assert.match(prose, /class="ink-caution"/);
  assert.match(prose, /<u>Now<\/u> <s>not then<\/s>/);

  setBlockConfig({ valueStyles: { 1: "one" } });
  const table = renderBlock({ t: "table", mono: true, head: ["<i>Input</i>"],
    rows: [["<mark>1</mark>"]] }, {});
  assert.match(table, /<th><i>Input<\/i><\/th>/);
  assert.match(table, /<td><mark>1<\/mark><\/td>/);
});

test("mono and mapped table cells retain authored markup for the shared sanitizer", () => {
  const table = renderBlock({ t: "table", mono: true, map: { "1": "one" },
    head: ["<strong>Input</strong>"], rows: [["<m>x^2</m>"], ["1"]] }, {});
  assert.match(table, /<th><strong>Input<\/strong><\/th>/);
  assert.match(table, /<td><m>x\^2<\/m><\/td>/);
  assert.match(table, /<td><span class="one">1<\/span><\/td>/);
});

test("source attributions and image credits allow the same inline formatting as prose", () => {
  const source = renderBlock({ t: "def", term: "Total", core: "Combine terms.", source: "<strong>Reference</strong> <m>\\sum_i x_i</m>" }, {});
  assert.match(source, /class="bsrc"><strong>Reference<\/strong> <m>/);
  const image = renderBlock({ t: "image", src: "assets/chart.png", alt: "A chart", credit: "<em>Author</em> <m>x_i</m>" }, {});
  assert.match(image, /class="credit"><em>Author<\/em> <m>x_i<\/m>/);
});

test("one prose block keeps authored paragraphs and explicit line breaks", () => {
  const html = renderBlock({ t: "key", h: "<p>First thought.</p><p>Boundary:<br>At zero, stop.</p>" }, {});
  assert.match(html, /<p>First thought\.<\/p><p>Boundary:<br>At zero, stop\.<\/p>/);
});

test("an important formula renders as its own display block", () => {
  const html = renderBlock({ t: "math", label: "The rule", tex: "a^2+b^2=c^2",
    note: "Use this for a right triangle." }, {});
  assert.match(html, /class="mathblk"/);
  assert.match(html, /class="katex-display"/);
  assert.match(html, /class="mathnote">Use this for a right triangle/);
});

test("search keeps visible title words without indexing styling tags", () => {
  const C = { concepts: {}, sections: [{ id: "s1", num: 1,
    title: "<strong>Signals</strong> <mark>and systems</mark>", blurb: "<em>Patterns</em>",
    subs: [{ id: "s1-1", title: "<span class=\"ink-info\">Inputs</span>", blocks: [], quiz: [] }] }] };
  const entries = buildIndex(C).SEARCH;
  assert.equal(entries[0].title, "Signals and systems");
  assert.equal(entries[1].title, "Inputs");
  assert.doesNotMatch(entries[0].text, /strong|mark|em>/);
});
