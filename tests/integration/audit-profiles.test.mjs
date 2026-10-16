#!/usr/bin/env node
/* The same incomplete course reports in draft and is refused for publish. */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const workspace = mkdtempSync(join(tmpdir(), "audit-profiles-"));
const id = "incomplete";
const course = join(workspace, "courses", id);
const run = (profile, script = "tools/audit-content.mjs") => spawnSync(process.execPath,
  [join(ROOT, script), "--profile", profile, id],
  { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: workspace } });
const check = (name, ok, detail = "") => {
  if (!ok) throw new Error(`${name}: ${detail}`);
};

try {
  cpSync(join(ROOT, "tests/fixtures/audit-incomplete"), course, { recursive: true });
  const draft = run("draft");
  check("draft reports the incomplete course without failing",
    draft.status === 0 && /draft incomplete/.test(draft.stdout) &&
    /100% of 1 unsourced/.test(draft.stdout) && /100% of 1 unverified/.test(draft.stdout) &&
    /draft target of 0%/.test(draft.stdout) && !/\bunprompted\b/.test(draft.stdout),
    draft.stdout + draft.stderr);

  const publish = run("publish");
  check("publish refuses the same unverified answer and unreviewed source",
    publish.status === 1 && /FAIL publish incomplete/.test(publish.stdout) &&
    /answers lack a valid verification marker/.test(publish.stdout) &&
    /sourceReview must be disclosed/.test(publish.stdout), publish.stdout + publish.stderr);
  const packaged = run("publish", "plugin/scripts/audit-content.mjs");
  check("the packaged CLI enforces the same publish profile",
    packaged.status === 1 && /sourceReview must be disclosed/.test(packaged.stdout),
    packaged.stdout + packaged.stderr);

  const file = join(course, "sections/01-one/1-start.yaml");
  writeFileSync(file, readFileSync(file, "utf8")
    .replace("source: generated", "source: Handbook §1\n    sourceReview: sourced")
    .replace("    a: A sample claim.\n", "    response:\n      kind: self\n      model: A sample claim.\n")
    .replace("    why: It is the fixture's claim.", "    why: It is the fixture's claim.\n    verified: true"));
  const cleared = run("publish");
  check("publish accepts reviewed sources and verified answers",
    cleared.status === 0 && /ok   publish incomplete/.test(cleared.stdout),
    cleared.stdout + cleared.stderr);
  writeFileSync(file, readFileSync(file, "utf8").replace("source: Handbook §1", "source: generated").replace("sourceReview: sourced", "sourceReview: disclosed"));
  const advisory = run("publish");
  check("declared pedagogical thresholds warn without rejecting a disclosed choice",
    advisory.status === 0 && /! .*claims name no source/.test(advisory.stdout), advisory.stdout + advisory.stderr);

  const source = readFileSync(file, "utf8");
  writeFileSync(file, source.replace("    core: A sample claim for the audit fixture.\n", ""));
  const noSummary = run("draft");
  check("a claim without a summary is not counted as a quality failure",
    noSummary.status === 0 && !/unclaimed|repeat/.test(noSummary.stdout),
    noSummary.stdout + noSummary.stderr);
  const noSummaryValidation = spawnSync(process.execPath,
    [join(ROOT, "tools/validate.mjs"), "--isolated", id],
    { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: workspace } });
  check("validation accepts a claim without either summary field",
    !/requires? (?:a )?(?:core|gist)|must declare (?:a )?(?:core|gist)/i
      .test(noSummaryValidation.stdout + noSummaryValidation.stderr),
    noSummaryValidation.stdout + noSummaryValidation.stderr);

  writeFileSync(file, readFileSync(file, "utf8").replace(
    "    h: <p>This claim still needs source review.</p>",
    "    gist: A separate note for review.\n    h: <p>This claim still needs source review.</p>"));
  const withGist = run("draft");
  check("an intentional gist is not counted as a repetition defect",
    withGist.status === 0 && !/unclaimed|repeat/.test(withGist.stdout),
    withGist.stdout + withGist.stderr);

  writeFileSync(file, readFileSync(file, "utf8").replace(
    "    gist: A separate note for review.",
    "    core: A separate opening claim.\n    gist: A separate note for review."));
  const invalid = spawnSync(process.execPath,
    [join(ROOT, "tools/validate.mjs"), "--isolated", id],
    { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: workspace } });
  check("validation still rejects a block that declares both summary fields",
    /declares both core: and gist:/.test(invalid.stdout + invalid.stderr),
    invalid.stdout + invalid.stderr);
  console.log("ok   audit profiles  9/9 checks");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
