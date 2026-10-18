import test from "node:test";
import assert from "node:assert/strict";
import { buildIndex } from "../../src/lib/index.js";
import { courseReferences, filterReferences } from "../../src/lib/references.js";

const drawing = { t: "figure", id: "layout", kind: "svg", cap: "Gray-code layout", spec: {} };
const table = { t: "table", cap: "Observed measurements", head: ["Reading"], rows: [["27"]] };
const C = { concepts: { target: { term: "Target", body: "Desired measurement" } }, sections: [
  { id: "s1", num: 1, subs: [
    { id: "s1-1", title: "Layout", blocks: [drawing, table], quiz: [] },
    { id: "s1-2", title: "Use the layout", blocks: [{ t: "p", h: 'See <f k="layout"/> and <c k="target">target</c>.' }],
      quiz: [{ id: "task", type: "Apply", q: "Question-only secret", stimulus: { t: "table", cap: "Answer diagram", rows: [] },
        response: { kind: "self", model: "Solution-only secret" } }] }
  ] }
] };
const idx = buildIndex(C);

test("references preserve authored blocks, numbering and original destinations without requiring figure IDs", () => {
  const entries = courseReferences(C, idx, "probe", "s1-1");
  assert.equal(entries[0].block, drawing);
  assert.equal(entries[0].num, "1.1");
  assert.equal(entries[1].block, table);
  assert.equal(entries[1].kind, "Table");
  assert.equal(entries[1].href, "#/probe/s1-1~1");
});

test("cited diagrams and concepts appear first, without indexing questions or revealing solutions", () => {
  const entries = courseReferences(C, idx, "probe", "s1-2");
  assert.deepEqual(entries.filter(x => x.local).map(x => x.title), ["Gray-code layout", "Target"]);
  assert.equal(filterReferences(entries, "secret").length, 0);
  assert.equal(filterReferences(entries, "Answer diagram").length, 0);
  assert.equal(entries.length, 3);
  assert.deepEqual(filterReferences(entries, "table observed").map(x => x.block), [table]);
  assert.equal(courseReferences(C, idx, "probe", null).some(x => x.local), false);
});
