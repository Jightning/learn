import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as YAML from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("validation catches raw TeX in claims and model answers", () => {
  const workspace = mkdtempSync(join(tmpdir(), "raw-math-"));
  const id = "raw-math";
  const course = join(workspace, "courses", id);
  const file = join(course, "sections/01-first-topic/1-getting-started.yaml");
  const run = (script = "tools/validate.mjs") => spawnSync(process.execPath,
    [join(ROOT, script), "--isolated", id],
    { cwd: ROOT, env: { ...process.env, AUTHOR_WORKSPACE: workspace }, encoding: "utf8" });

  try {
    cpSync(join(ROOT, "courses/_template"), course, { recursive: true });
    const original = readFileSync(file, "utf8");
    const data = YAML.load(original);
    data.blocks.find(b => b.core).core = "Growth is e^{2x}.";
    data.quiz.find(q => q.response?.kind === "self").response.model = "\\frac{1}{2}";
    writeFileSync(file, YAML.dump(data));
    const invalid = run();
    assert.equal(invalid.status, 1, invalid.stdout + invalid.stderr);
    assert.match(invalid.stdout, /raw math "e\^\{2x\}" will print literally/);
    assert.match(invalid.stdout, /raw math "\\frac" will print literally/);
    const packaged = run("plugin/scripts/validate.mjs");
    assert.equal(packaged.status, 1, packaged.stdout + packaged.stderr);
    assert.match(packaged.stdout, /raw math "e\^\{2x\}" will print literally/);

    data.blocks.find(b => b.core).core = "Growth is <m>e^{2x}</m>.";
    data.quiz.find(q => q.response?.kind === "self").response.model = "<m>\\frac{1}{2}</m>";
    writeFileSync(file, YAML.dump(data));
    const valid = run();
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);

    data.blocks = data.blocks.filter(b => b.t !== "math");
    data.blocks.find(b => b.t === "p").h = "<p><m>x</m>, <m>y</m>, and <m>z</m> are used here.</p>";
    writeFileSync(file, YAML.dump(data));
    const crowded = run();
    assert.equal(crowded.status, 0, crowded.stdout + crowded.stderr);
    assert.match(crowded.stdout, /\d+ inline formulas and no math block/);

    const prose = data.blocks.find(b => b.t === "p");
    prose.h = "<p>Σᵢ₌₁ⁿ aᵢ uses constructed Unicode notation.</p>";
    writeFileSync(file, YAML.dump(data));
    const unicode = run();
    assert.equal(unicode.status, 0, unicode.stdout + unicode.stderr);
    assert.match(unicode.stdout, /constructed Unicode math "Σᵢ₌₁ⁿ"/);

    prose.h = "<p>Σ is a Greek letter used for a sum.</p>";
    writeFileSync(file, YAML.dump(data));
    const greek = run();
    assert.equal(greek.status, 0, greek.stdout + greek.stderr);
    assert.doesNotMatch(greek.stdout, /constructed Unicode math/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
