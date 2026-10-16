import assert from "node:assert/strict";
import { test } from "node:test";
import { runsOf, isOptional } from "../../src/lib/tiers.js";
import { modeOf } from "../../src/lib/mode.js";
import { checkFollows } from "../../tools/lib/structure.mjs";
import { renderBlock } from "../../src/blocks/index.js";

test("ordinary prose preserves authored paragraph boundaries", () => {
  assert.equal(renderBlock({ t: "p", h: "One thought." }, {}), "<p>One thought.</p>");
  const h = "<p>First thought.</p><p>The consequence.</p>";
  assert.equal(renderBlock({ t: "p", h }, {}), h);
});

test("every reading mode keeps applications in the complete main path", () => {
  const blocks = [{ t: "def" }, { t: "ex", tier: "apply" },
    { t: "note", optional: true, follows: true }, { t: "key" }];
  for (const lane of ["spine", "apply", undefined]) {
    const runs = runsOf(blocks, lane);
    assert.deepEqual(runs.filter(r => !r.hidden).flatMap(r => r.items.map(i => i.i)), [0, 1, 3]);
    assert.equal(runs.find(r => r.hidden).attached, true);
  }
  assert.ok(runsOf(blocks, "all").every(r => !r.hidden));
  assert.equal(modeOf("spine", "full"), "study");
  assert.equal(modeOf("all", "notes"), "review");
});

test("explicit optional flags govern expansion while older depth content remains readable", () => {
  assert.equal(isOptional({ tier: "depth" }), true);
  assert.equal(isOptional({ tier: "depth", optional: false }), false);
  assert.equal(isOptional({ tier: "apply" }), false);
  const course = blocks => ({ sections: [{ subs: [{ id: "s1-1", blocks }] }] });
  const errors = [];
  checkFollows(course([{ t: "note", optional: true }, { t: "key", follows: true }]), errors);
  assert.equal(errors.length, 1, "required teaching cannot depend on a collapsed parent");
  const valid = [];
  checkFollows(course([{ t: "ex", tier: "apply" }, { t: "key", follows: true }]), valid);
  assert.deepEqual(valid, []);
});
