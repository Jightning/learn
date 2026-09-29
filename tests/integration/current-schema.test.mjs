import assert from "node:assert/strict";
import test from "node:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as YAML from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("compatibility validation reports an old course; strict current rejects an incomplete new one", () => {
  const workspace = mkdtempSync(join(tmpdir(), "current-schema-"));
  const courses = join(workspace, "courses");
  const env = { ...process.env, AUTHOR_WORKSPACE: workspace };
  const run = (script, args) => spawnSync(process.execPath,
    [join(ROOT, "tools", script), ...args], { cwd: ROOT, env, encoding: "utf8" });

  try {
    const oldId = "legacy";
    cpSync(join(ROOT, "tests/fixtures/audit-incomplete"), join(courses, oldId), { recursive: true });
    const old = run("validate.mjs", ["--isolated", "--migration-report", oldId]);
    assert.equal(old.status, 0, old.stdout + old.stderr);
    assert.match(old.stdout, /migration legacy\s+quiz 1 · practice 0 · drill items 0/);

    const publishedOld = run("audit-content.mjs", ["--profile", "publish", oldId]);
    assert.equal(publishedOld.status, 1);
    assert.match(publishedOld.stdout, /strict current schema requires response:/);
    assert.match(publishedOld.stdout, /migration legacy\s+quiz 1 · practice 0 · drill items 0/);

    const newId = "new-incomplete";
    const newDir = join(courses, newId);
    cpSync(join(ROOT, "courses/_template"), newDir, { recursive: true });
    const subsection = join(newDir, "sections/01-first-topic/1-getting-started.yaml");
    const data = YAML.load(readFileSync(subsection, "utf8"));
    delete data.quiz[0].response;
    writeFileSync(subsection, YAML.dump(data));

    const incomplete = run("validate.mjs", ["--isolated", "--strict-current", newId]);
    assert.equal(incomplete.status, 1);
    assert.match(incomplete.stdout, /strict current schema requires response:/);
    assert.match(incomplete.stdout, /migration new-incomplete\s+quiz 1 · practice 0 · drill items 0/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
