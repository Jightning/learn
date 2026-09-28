#!/usr/bin/env node
/* Source coverage leads and the review decisions that close them.
 *
 *   node tools/coverage.mjs <course> [--all] [--below 0.25]
 *                            [--init-review] [--profile draft|publish]
 *
 * Stable topic IDs survive score changes and unrelated heading insertions.
 * Scores point to review work; only a reviewed disposition resolves a lead.
 */
import { coverageReport, initCoverageReview, reviewPath } from "./lib/coverage-report.mjs";

const args = process.argv.slice(2);
const at = args.indexOf("--below"), pa = args.indexOf("--profile");
const below = at < 0 ? 0.25 : Number(args[at + 1]);
const profile = pa < 0 ? "draft" : args[pa + 1];
const id = args.find((a, i) => !a.startsWith("--") &&
  (at < 0 || i !== at + 1) && (pa < 0 || i !== pa + 1));
if (!id || !Number.isFinite(below) || below < 0 || below > 1 ||
    !["draft", "publish"].includes(profile)) {
  console.error("usage: coverage.mjs <course> [--all] [--below 0.25] [--init-review] [--profile draft|publish]");
  process.exit(2);
}

let report;
try { report = coverageReport(id, below); }
catch (e) { console.error(e.message); process.exit(2); }
if (!report.files.length) {
  console.error(`courses/${id} has no readable source documents — nothing to score against`);
  process.exit(1);
}
if (args.includes("--init-review")) {
  const added = initCoverageReview(id, report);
  console.log(`review checklist: ${reviewPath(id)} (${added} new leads)`);
  report = coverageReport(id, below);
}
if (!report.mapped) console.log("No finished subsections recorded yet: topics use their best match anywhere (lenient).\n");

let shownCount = 0, omitted = 0;
const limit = args.includes("--all") ? Infinity : 60;
for (const source of [...new Set(report.rows.map(r => r.source))]) {
  const rows = report.rows.filter(r => r.source === source);
  if (rows[0]?.unowned) {
    const target = report.targets.find(t => t.kind === "files" && t.source === source);
    if (shownCount++ < limit)
      console.log(`${source}  [${target?.id || "no low topics"}] — no finished subsection maps this file`);
    else omitted++;
    continue;
  }
  const shown = args.includes("--all") ? rows : rows.filter(r => r.low);
  if (!shown.length) continue;
  if (shownCount < limit) console.log(source);
  for (const row of shown) {
    if (shownCount++ >= limit) { omitted++; continue; }
    console.log(`  ${row.low ? "!" : " "} ${row.id} ${row.score.toFixed(2)}  ${row.heading}   (${row.best})`);
    if (row.low) console.log(`           missing: ${row.missing.join(", ")}`);
  }
}
if (omitted) console.log(`… ${omitted} more leads; use --all to print every score or --init-review for the checklist`);
console.log(`\n${report.rows.filter(r => r.low).length} of ${report.rows.length} source topics below ${below}. ` +
  `${report.unresolved.length} review decisions pending. Scores are leads, not proof; ` +
  `run coverage ${id} --init-review to create the checklist.`);
if (profile === "publish" && report.unresolved.length) {
  for (const t of report.unresolved.slice(0, 30))
    console.log(`       ✗ ${t.id} ${t.heading}: ${t.problem}`);
  if (report.unresolved.length > 30) console.log(`       ✗ ${report.unresolved.length - 30} more unresolved leads`);
  process.exit(1);
}
