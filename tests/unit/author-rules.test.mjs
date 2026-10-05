import test from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import * as YAML from "js-yaml";
import { loadContext, selectContext, shapeNeeds } from "../../tools/lib/author-context.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const context = loadContext(join(root, "authoring"));

test("every phase resolves whole modules with preserved core requirements", () => {
  for (const role of ["single", "planner", "writer", "reviewer"])
    for (const phase of ["plan", "write", "review"]) {
      const s = selectContext(context, { phase, role });
      assert.equal(new Set(s.modules.map(m => m.path)).size, s.modules.length);
      assert.ok(s.modules.some(m => m.id === "core"));
      assert.ok(s.modules.every(m => s.text.includes(m.text.trim())));
    }
  assert.ok(selectContext(context, { role: "writer" }).estimatedTokens <
    selectContext(context, { role: "writer", full: true }).estimatedTokens / 3);
});

test("new shape modules are selected before content exists, unknown shapes only warn", () => {
  const selected = selectContext(context, { role: "writer", needs: ["figure:plot", "question:multi"] });
  assert.ok(selected.modules.some(m => m.needs?.includes("figure:plot")));
  assert.ok(selected.modules.some(m => m.needs?.includes("question:multi")));
  assert.ok(!selected.modules.some(m => m.id === "formats-figure-circuit"));
  const unknown = selectContext(context, { needs: ["figure:custom"] });
  assert.equal(unknown.warnings.length, 1);
  assert.ok(unknown.text);
});

test("expensive roles do not receive formatting modules even with explicit shape needs", () => {
  for (const role of ["planner", "reviewer"]) {
    const s = selectContext(context, { phase: role === "planner" ? "plan" : "review",
      role, needs: ["figure:plot", "question:multi"], full: true });
    assert.ok(!s.modules.some(m => m.path.includes("/formats/")));
    assert.ok(!s.modules.some(m => m.id === "schema"));
  }
});

test("shape detection includes stimuli and does not depend on writing a draft first", () => {
  const found = shapeNeeds({ blocks: [{ t: "figure", kind: "plot" }, { t: "math" }],
    quiz: [{ response: { kind: "multi" }, stimulus: { t: "passage" } }] });
  assert.deepEqual(found, ["block:figure", "figure:plot", "block:math", "question:multi", "stimulus:passage"]);
});

test("inline math selects the shared math format from table and quiz content", () => {
  for (const unit of [
    { blocks: [{ t: "table", head: ["<m>x^2</m>"], rows: [["value"]] }] },
    { quiz: [{ q: "Evaluate <m>x^2</m>.", response: { kind: "self", model: "<m>x=2</m>" } }] }
  ]) {
    const needs = shapeNeeds(unit);
    assert.ok(needs.includes("block:math"));
    assert.ok(selectContext(context, { role: "writer", needs }).modules.some(m => m.id === "formats-math"));
  }
});

test("broken manifests, cycles, and symlink escapes cannot silently empty context", () => {
  const dir = mkdtempSync(join(tmpdir(), "context-"));
  try {
    writeFileSync(join(dir, "core.md"), "Keep original evidence.");
    const put = data => writeFileSync(join(dir, "manifest.yaml"), YAML.dump(data));
    put({ modules: { core: { file: "core.md", requires: ["missing"] } }, phases: { write: ["core"] } });
    assert.throws(() => loadContext(dir), /missing module/);
    put({ modules: { core: { file: "core.md", requires: ["core"] } }, phases: { write: ["core"] } });
    assert.throws(() => selectContext(loadContext(dir)), /cyclic/);
    symlinkSync(join(root, "README.md"), join(dir, "escape.md"));
    put({ modules: { core: "escape.md" }, phases: { write: ["core"] } });
    assert.throws(() => loadContext(dir), /invalid context module/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test("modular math rules preserve main-checkout raw math and display guidance", () => {
  const output = selectContext(context, { phase: "write", role: "writer", needs: ["block:math"] }).text;
  assert.match(output, /bare TeX prints literally/);
  assert.match(output, /<m>e\^\{2x\}<\/m>/);
  assert.match(output, /math block for a central equation/);
  assert.match(output, /source newlines, and each becomes a visible break/);
  assert.match(output, /wraps naturally on mobile/);
});
