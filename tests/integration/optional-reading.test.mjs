import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { dump } from "js-yaml";

test("publication validates optional flags and keeps main-path dependencies available", () => {
  const root = process.cwd();
  const workspace = mkdtempSync(join(tmpdir(), "optional-reading-"));
  const dir = join(workspace, "courses", "probe");
  const lesson = join(dir, "sections", "01-topic", "1-reading.yaml");
  mkdirSync(join(dir, "sections", "01-topic"), { recursive: true });
  writeFileSync(join(dir, "course.yaml"), dump({ code: "PROBE", title: "Optional content" }));
  writeFileSync(join(dir, "sections", "01-topic", "_section.yaml"), dump({ title: "Topic", blurb: "Inspect a process and its optional context." }));
  const write = blocks => writeFileSync(lesson, dump({ title: "Reading", blocks }));
  const validate = () => spawnSync(process.execPath, [resolve("tools/validate.mjs"), "--isolated", "probe"],
    { cwd: root, env: { ...process.env, AUTHOR_WORKSPACE: workspace }, encoding: "utf8" });
  const rule = { t: "key", source: "Fixture", core: 'Use the process in <f k="process"/>.' };
  const figure = { t: "figure", id: "process", kind: "flow", cap: "A two-step process", spec: { steps: [{ label: "Start" }, { label: "Finish" }] } };
  try {
    write([rule, { ...figure, optional: "true" }]);
    const invalid = validate();
    assert.equal(invalid.status, 1);
    assert.match(invalid.stdout, /optional must be true or false/);
    write([rule, { ...figure, optional: true }]);
    const hidden = validate();
    assert.equal(hidden.status, 1);
    assert.match(hidden.stdout, /required content cites figure/);
    for (const flags of [{ tier: "apply" }, { tier: "depth", optional: false }, { optional: false }]) {
      write([rule, { ...figure, ...flags }]);
      const visible = validate();
      assert.equal(visible.status, 0, visible.stdout + visible.stderr);
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
