#!/usr/bin/env node
/* Stable topic IDs, compact review setup, and publish-only disposition gate. */
import { cpSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as YAML from "js-yaml";
import { reviewProblem } from "../../tools/lib/coverage-report.mjs";

const ROOT = join(fileURLToPath(new URL("../..", import.meta.url)));
const workspace = realpathSync(mkdtempSync(join(tmpdir(), "coverage-review-")));
const course = join(workspace, "courses", "fixture");
const source = join(course, "sources/topics.md");
const reviewPath = join(course, "materials/coverage-review.yaml");
const state = join(workspace, ".author/fixture");
const run = (script, ...args) => spawnSync(process.execPath, [join(ROOT, "tools", script), ...args],
  { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: workspace } });
const packaged = (script, ...args) => spawnSync(process.execPath, [join(ROOT, "plugin/scripts", script), ...args],
  { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: workspace } });
const check = (name, ok, detail = "") => { if (!ok) throw new Error(`${name}: ${detail}`); };

try {
  check("all reviewed dispositions have defined validation rules",
    reviewProblem("taught") === null && reviewProblem("bridged") === null &&
    reviewProblem({ disposition: "moved", to: "s2-1" }) === null &&
    reviewProblem({ disposition: "skipped", reason: "out of scope" }) === null &&
    reviewProblem({ disposition: "false-match", reason: "OCR heading" }) === null &&
    /destination/.test(reviewProblem("moved")) &&
    /reason/.test(reviewProblem("false-match")));
  cpSync(join(ROOT, "tests/fixtures/coverage-review"), course, { recursive: true });
  mkdirSync(state, { recursive: true });
  writeFileSync(join(state, "map.txt"), `sections/01-one/1-start.yaml: ${source}\n`);
  const draft = run("coverage.mjs", "fixture", "--all");
  const resistorId = /\b(t-[a-f0-9]{16}) [^\n]*Resistor Basics/.exec(draft.stdout)?.[1];
  const shieldingId = /\b(t-[a-f0-9]{16}) [^\n]*Magnetic Shielding/.exec(draft.stdout)?.[1];
  check("small source yields stable machine-readable topic IDs",
    draft.status === 0 && resistorId && shieldingId && resistorId !== shieldingId,
    draft.stdout + draft.stderr);
  check("the missing topic is a low-score lead",
    new RegExp(`! ${shieldingId} 0%`).test(draft.stdout), draft.stdout);

  check("coverage prints percentages and locators without source passages or missing terms",
    /Lexical coverage: \d+%/.test(draft.stdout) && !/missing:/.test(draft.stdout) &&
    !draft.stdout.includes("Magnetic fields"), draft.stdout);
  const original = readFileSync(source, "utf8");
  writeFileSync(source, "## New Front Matter\n\nUnrelated introductory words.\n\n" + original);
  const changed = run("coverage.mjs", "fixture", "--all");
  check("adding an unrelated heading does not renumber existing topic IDs",
    changed.status === 0 && changed.stdout.includes(resistorId) && changed.stdout.includes(shieldingId),
    changed.stdout + changed.stderr);
  writeFileSync(source, original);

  const draftAudit = run("audit-content.mjs", "--profile", "draft", "fixture");
  const publish = run("audit-content.mjs", "--profile", "publish", "fixture");
  check("draft audit reports while publish warns about coverage review",
    draftAudit.status === 0 && publish.status === 0 &&
    /low-scoring coverage leads need reviewed dispositions/.test(publish.stdout),
    publish.stdout + publish.stderr);
  const packagedPublish = packaged("audit-content.mjs", "--profile", "publish", "fixture");
  check("the packaged publish command reports coverage dispositions too",
    packagedPublish.status === 0 && /low-scoring coverage leads/.test(packagedPublish.stdout),
    packagedPublish.stdout + packagedPublish.stderr);

  const initialized = run("coverage.mjs", "fixture", "--init-review");
  const review = YAML.load(readFileSync(reviewPath, "utf8"));
  check("one command creates the review checklist without transcribing IDs",
    initialized.status === 0 && review.topics[shieldingId]?.disposition === "pending" &&
    review.topics[shieldingId]?.source === "sources/topics.md",
    initialized.stdout + initialized.stderr);
  for (const entry of Object.values(review.topics)) {
    entry.disposition = "skipped";
    entry.reason = "Outside this course's scope";
  }
  delete review.topics[shieldingId].reason;
  writeFileSync(reviewPath, YAML.dump(review));
  const noReason = run("audit-content.mjs", "--profile", "publish", "fixture");
  check("skipped without a reason warns without blocking publish",
    noReason.status === 0 && /skipped needs a reason/.test(noReason.stdout), noReason.stdout);
  review.topics[shieldingId].reason = "Magnetic shielding is outside the resistor course";
  writeFileSync(reviewPath, YAML.dump(review));
  const cleared = run("audit-content.mjs", "--profile", "publish", "fixture");
  check("review disposition clears a low score without claiming score proves coverage",
    cleared.status === 0 && /ok   publish fixture/.test(cleared.stdout),
    cleared.stdout + cleared.stderr);
  const reviewedText = readFileSync(reviewPath, "utf8");
  const again = run("coverage.mjs", "fixture", "--init-review");
  check("refreshing the checklist preserves reviewed decisions",
    again.status === 0 && /0 new leads/.test(again.stdout) &&
    readFileSync(reviewPath, "utf8") === reviewedText, again.stdout + again.stderr);

  writeFileSync(source, "Entry Alpha\nsmall.\n".repeat(130));
  const noisy = run("coverage.mjs", "fixture");
  check("pathological inferred headings stop before creating hundreds of review tasks",
    noisy.status === 2 && /topic extraction looks wrong/.test(noisy.stderr), noisy.stderr);
  console.log("ok   coverage review  11/11 checks");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
