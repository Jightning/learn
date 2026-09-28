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

test("search keeps visible title words without indexing styling tags", () => {
  const C = { concepts: {}, sections: [{ id: "s1", num: 1,
    title: "<strong>Signals</strong> <mark>and systems</mark>", blurb: "<em>Patterns</em>",
    subs: [{ id: "s1-1", title: "<span class=\"ink-info\">Inputs</span>", blocks: [], quiz: [] }] }] };
  const entries = buildIndex(C).SEARCH;
  assert.equal(entries[0].title, "Signals and systems");
  assert.equal(entries[1].title, "Inputs");
  assert.doesNotMatch(entries[0].text, /strong|mark|em>/);
});
