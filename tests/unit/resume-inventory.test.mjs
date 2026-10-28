import test from "node:test";
import assert from "node:assert/strict";
import { extractResumeInventory, serializeResumeInventory } from "../../tools/resume-inventory.mjs";

/* Generated stand-in: engine tests never need private course sources. */
function source() {
  const modules = Array.from({ length: 33 }, (_, i) => `**M${String(i).padStart(2, "0")}. Synthetic module ${i}**`);
  const rows = Array.from({ length: 297 }, (_, i) => {
    const R = i % 7 + 1, I = i % 10 + 1, policy = R <= 3 ? "P3" : R <= 5 ? "P45" : "P67";
    return `| ${i + 1} | Synthetic capability ${i + 1} | ${R} | ${I} | M00 | M01 | ${policy} |`;
  });
  return [...modules, "**10. Complete skill coverage matrix**", "| ID | Skill | R | I | First taught | Target owner | Policy |", ...rows,
    "**11. Resource assignments and provenance**", "| 298 | Not a target | 3 | 1 | M00 | M01 | P3 |"].join("\n");
}

test("all 297 row identities, R/I, owners and exact source locators round-trip", () => {
  const input = source(), inventory = JSON.parse(serializeResumeInventory(extractResumeInventory(input)));
  assert.equal(inventory.rows.length, 297); assert.equal(inventory.modules.length, 33);
  assert.equal(new Set(inventory.rows.map(r => r.rootId)).size, 297);
  assert.equal(inventory.status, "planning-only");
  for (const [i, row] of inventory.rows.entries()) {
    assert.equal(row.sourceId, i + 1);
    assert.equal(row.rootId, `resume-${String(i + 1).padStart(3, "0")}`);
    assert.equal(row.requiredAnchor, i % 7 + 1); assert.equal(row.importance, i % 10 + 1);
    assert.equal(row.source.raw, input.split("\n")[row.source.line - 1]);
    assert.equal(row.source.raw, `| ${row.sourceId} | ${row.label} | ${row.requiredAnchor} | ${row.importance} | ${row.firstTaught} | ${row.targetOwnerModule} | ${row.policy} |`);
    assert.equal(row.scoreFor, undefined, "do not invent canonical scoring ownership");
  }
  assert.equal(Object.values(inventory.outcomeBudgets).reduce((a, b) => a + b), 100);
  assert.equal(extractResumeInventory(input.replace("\n", "\n\n")).rows[0].rootId, inventory.rows[0].rootId);
});

test("missing, duplicate, malformed, dangling or inconsistent source rows fail before writing", () => {
  for (const [input, message] of [
    [source().replace(/^\| 297 .*\n/m, ""), /expected 297/],
    [source().replace("| 2 | Synthetic", "| 1 | Synthetic"), /nonsequential/],
    [source().replace("| 1 | Synthetic capability 1 | 1 | 1 |", "| 1 | Synthetic capability 1 | 8 | 1 |"), /invalid/],
    [source().replace("| M00 | M01 |", "| M99 | M01 |"), /unknown module/],
    [source().replace("| M00 | M01 | P3 |", "| M00 | M01 | P67 |"), /inconsistent policy/],
    [source().replace("| Synthetic capability 1 |", "| Broken | cell |"), /seven matrix cells/],
    [source().replace("**M01. Synthetic module 1**", "**M00. Duplicate module**"), /33 unique modules/]
  ]) assert.throws(() => extractResumeInventory(input), message);
});

test("source checksum detects edits while stable root IDs survive relocation", () => {
  const a = extractResumeInventory(source()), b = extractResumeInventory(`\n${source()}`);
  assert.notEqual(a.source.sha256, b.source.sha256);
  assert.deepEqual(a.rows.map(r => [r.sourceId, r.rootId, r.requiredAnchor, r.importance]), b.rows.map(r => [r.sourceId, r.rootId, r.requiredAnchor, r.importance]));
  assert.equal(b.rows[0].source.line, a.rows[0].source.line + 1);
});
