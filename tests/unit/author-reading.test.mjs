import test from "node:test";
import assert from "node:assert/strict";
import { readingPreview } from "../../tools/lib/author-reading.mjs";
import { renderBlock } from "../../src/blocks/index.js";

const blocks = [
  { t: "p", h: "Connect the established premise to this claim." },
  { t: "def", term: "Relation", core: "Opening claim.", h: "<p>Reasoning that develops it.</p>" },
  { t: "note", tier: "depth", follows: true, h: "An optional alternative." },
  { t: "key", gist: "Notes-only summary.", h: "<p>A complete passage with its own reasoning.</p>" }
];
test("preview preserves reader order, actual full HTML and attached hidden depth", () => {
  const view = readingPreview({ title: "Lesson", blocks });
  const items = view.runs.flatMap(run => run.items);
  assert.deepEqual(items.map(item => item.index), [0, 1, 2, 3]);
  assert.equal(items[1].html, renderBlock(blocks[1], {}));
  assert.ok(items[1].html.indexOf("Opening claim.") < items[1].html.indexOf("Reasoning"));
  assert.ok(!items[3].html.includes("Notes-only summary"));
  assert.equal(view.runs.find(run => run.hidden).attached, true);
  assert.equal(items[2].parent, 1);
});
test("Notes shows gist and opens optional summaries through existing reader semantics", () => {
  const view = readingPreview({ blocks }, { depth: "notes", lane: "all" });
  const items = view.runs.flatMap(run => run.items);
  assert.equal(items[0].mode, "hidden");
  assert.equal(items[3].lead, "Notes-only summary.");
  assert.equal(items[3].html, undefined);
  const component = { t: "slides", frames: [{ title: "State", text: "<p>Inspect this state.</p>" }] };
  assert.deepEqual(readingPreview({ blocks: [component] }).runs[0].items[0].component, component);
  assert.throws(() => readingPreview({ blocks }, { depth: "guess" }), /preview depth/);
});
