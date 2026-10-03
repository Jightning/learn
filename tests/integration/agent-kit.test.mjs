#!/usr/bin/env node
/* Exercise stale-file detection in an isolated kit, including Codex files. */
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const tmp = mkdtempSync(join(tmpdir(), "agent-kit-"));
const copy = rel => {
  mkdirSync(dirname(join(tmp, rel)), { recursive: true });
  cpSync(join(ROOT, rel), join(tmp, rel), { recursive: true });
};
const check = () => spawnSync(process.execPath, ["tools/build-agent-kit.mjs", "--check"], {
  cwd: tmp, encoding: "utf8"
});
try {
  for (const rel of ["package.json", "tools/build-agent-kit.mjs", "tools/agent", "docs", "authoring",
    "AGENTS.md", ".agents/skills/create-course", ".codex/agents", ".claude/agents",
    ".claude/skills/create-course", ".claude-plugin", "plugin"]) copy(rel);
  symlinkSync(join(ROOT, "node_modules"), join(tmp, "node_modules"), "dir");
  let result = check();
  assert.equal(result.status, 0, result.stdout + result.stderr);

  const skill = ".agents/skills/create-course/SKILL.md";
  rmSync(join(tmp, skill));
  result = check();
  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes(skill), result.stdout);
  copy(skill);

  const source = "authoring/agents.toml";
  const original = readFileSync(join(tmp, source), "utf8");
  writeFileSync(join(tmp, source), original.replace('model = "gpt-6-luna"', 'model = "gpt-6-sol"'));
  result = check();
  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes(".codex/agents/course-drafter.toml"), result.stdout);
  writeFileSync(join(tmp, source), original);
  result = check();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log("ok   agent-kit  detects missing Codex skills and stale worker configurations");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
