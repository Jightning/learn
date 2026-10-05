import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import * as YAML from "js-yaml";

const root = process.cwd();
test("course validation checks question attachment lists, prose, code, and assets", () => {
  const workspace = mkdtempSync(join(tmpdir(), "question-attachments-"));
  try {
    const course = join(workspace, "courses/attachments");
    cpSync(join(root, "courses/_template"), course, { recursive: true });
    const path = join(course, "sections/01-first-topic/1-getting-started.yaml");
    const unit = YAML.load(readFileSync(path, "utf8"));
    const q = unit.quiz[0];
    q.stimulus = [ { t: "p", h: "<mark>Before</mark> <m>x^2</m>" },
      { t: "code", src: "if (x < 2) return x;" },
      { t: "note", label: "Given", h: "<p>After the listing.</p>" },
      { t: "table", head: ["Input"], rows: [["2"]] },
      { t: "math", tex: "x^2=4" } ];
    const run = () => {
      writeFileSync(path, YAML.dump(unit));
      return spawnSync(process.execPath, [join(root, "tools/validate.mjs"), "--isolated", "attachments"],
        { cwd: root, env: { ...process.env, AUTHOR_WORKSPACE: workspace }, encoding: "utf8" });
    };
    const valid = run();
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    q.stimulus[0].h = "Before \\frac{1}{2}";
    q.stimulus.push({ t: "image", src: "assets/missing.png", alt: "Missing diagram" });
    const invalid = run();
    assert.equal(invalid.status, 1, invalid.stdout + invalid.stderr);
    assert.match(invalid.stdout, /raw math/);
    assert.match(invalid.stdout, /missing stimulus image asset/);
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});
