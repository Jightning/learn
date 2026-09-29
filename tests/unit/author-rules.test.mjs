import test from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSpec } from "../../tools/lib/spec.mjs";
import { checklist, digestRules, needSections, needsIn, version } from "../../tools/lib/author-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const cc = loadSpec(join(root, "docs/create_course.md"));
const mt = loadSpec(join(root, "docs/material_truth.md"));
const wr = loadSpec(join(root, "docs/writing.md"));

test("compact briefs preserve every source checklist item, including continued lines", () => {
  const source = cc.pick(["12a", "12b"]);
  const sourceItems = source.split("\n").filter(line => /^- \[ \] /.test(line));
  const items = checklist(cc);
  assert.equal(items.length, sourceItems.length);
  for (const which of ["course", "writing"]) {
    for (const lean of [false, true]) {
      const output = digestRules(which, cc, [cc, mt, wr], { lean });
      for (const item of items) assert.ok(output.includes(item), `${which} omitted ${item}`);
      assert.ok(output.includes(version([cc, mt, wr])));
    }
  }
});

test("on-demand sections cover the detected block, figure and question shapes", () => {
  const found = needsIn({
    blocks: [{ t: "figure", kind: "plot" }, { t: "math" }],
    quiz: [{ response: { kind: "multi" } }, { type: "Synthesis", response: { kind: "self" } }]
  });
  assert.deepEqual(found, ["block:figure", "figure:plot", "block:math", "question:multi", "question:synthesis"]);
  const selected = needSections(cc, found);
  for (const heading of ["### 6.1 Block types", "### 7.1 The synthesis item", "### 10.1 Figures", "### 10.2 Maths"])
    assert.ok(selected.includes(heading), `missing ${heading}`);
  assert.throws(() => needSections(cc, ["block:unknown"]), /unknown rule need/);
});
