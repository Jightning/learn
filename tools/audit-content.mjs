#!/usr/bin/env node
/* What the structural gates cannot see: whether the content is true.
 *
 *   node tools/audit-content.mjs [--profile draft|publish] [--sub sN-M] [course …]
 *
 * validate.mjs checks that references resolve, figures carry ids and equations
 * compile. It checks structure, never truth. A confident, well-formatted, wrong
 * account of amortised analysis fails no gate at all, and the reader cannot
 * tell, because everything else about the page has been verified to a high
 * standard.
 *
 * So every explanatory claim names where it came from, every worked answer
 * records its verification, and every question names the concept its
 * outcome updates. Draft reports missing work without failing. Publish enforces
 * zero unverified answers and reviewed claim sources; declared content ratios warn.
 *
 * The optional ceiling is per course, in `course.yaml`, and defaults to 1:
 *
 *   audit:
 *     unsourced: 0.1     # review target for claims with no grounded source
 *
 * A course that has finished a pass declares the number it reached, and can
 * then never regress. A global ceiling could only ever be the worst course's.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { loadCourse } from "./lib/load.mjs";
import { COURSES } from "./lib/paths.mjs";
import { conceptOf } from "../src/lib/index.js";
import { present } from "../src/lib/gist.js";
import { pointsAtNothing } from "./lib/sequence.mjs";
import { coverageReport } from "./lib/coverage-report.mjs";
import { migrationReportLine, strictCurrentIssues } from "./lib/current-schema.mjs";

const args = process.argv.slice(2);
const at = args.indexOf("--profile");
const profile = at < 0 ? "draft" : args[at + 1];
const subAt = args.indexOf("--sub"), subsection = subAt < 0 ? null : args[subAt + 1];
const wanted = args.filter((a, i) => !["--profile", "--sub"].includes(a) && (at < 0 || i !== at + 1) && (subAt < 0 || i !== subAt + 1));

if (!["draft", "publish"].includes(profile) || wanted.some(a => a.startsWith("--")) || (subAt >= 0 && (!subsection || subsection.startsWith("--")))) {
  console.error("usage: audit-content.mjs [--profile draft|publish] [course …]");
  process.exit(2);
}

/* Claims that assert something the reader will rely on. Prose carries the
   argument; these carry the conclusions, and a wrong conclusion is the one a
   reader cannot catch by reading around it. */
const CLAIM = new Set(["def", "key", "trap"]);

/* `source:` values that are a confession rather than an origin. `generated`
   counts against the fraction exactly as `unverified` does: a def block a model
   drafted is an unverified claim wearing an authored block's styling, which is
   the one thing the source field exists to prevent (M30, T34). */
const UNSOURCED = new Set(["unverified", "generated"]);

/* What is measured, in the order it is printed. Each is a fraction of a
   population, so a course with none of that population scores 0. */
const METRICS = [
  ["unsourced",  "claims name no source"],
  ["unverified", "answers lack a valid verification marker"],
  ["unrouted",   "questions resolve to no concept"],
  ["unclaimed",  "claims declare neither core: nor gist:"],
  ["repeat",     "claims restate themselves in a gist: rather than splitting a core:"],
  ["nameonly",   "blocks say nothing at notes depth until they are opened"]
];

const pct = x => `${Math.round(x * 100)}%`;
const verifiedAnswer = value => {
  if (value === true) return true;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const sourceKind = source => !String(source || "").trim() ? "missing" :
  UNSOURCED.has(String(source).trim().toLowerCase()) ? "disclosed" : "sourced";

/* M33, heuristically. A stated constant, threshold or boundary that is never
   retrieved is a sentence, not a memory, and cued recall is the format that
   retrieves one. Detecting "a specific value" cannot be exact — a sign
   convention carries no digit — so this warns and never fails. */
function detailsWithoutRecall(C) {
  const out = [];
  for (const [key, file] of Object.entries(C.drills)) {
    if ((file.items || []).some(it => it.format === "cued-recall")) continue;
    const cited = C.sections.some(s => s.subs.some(u => (u.blocks || []).some(b =>
      b && b.t === "key" && String(b.h || "").includes(`k="${key}"`) && /\d/.test(String(b.h)))));
    if (cited) out.push(key);
  }
  return out;
}

function audit(id) {
  const { course: C } = loadCourse(join(COURSES, id));
  if (subsection) {
    C.sections = C.sections.map(s => ({ ...s, subs: s.subs.filter(u => u.id === subsection) })).filter(s => s.subs.length);
    if (!C.sections.length) throw new Error(`no subsection ${subsection}`);
    // Variant banks and global coverage belong to final audit, not the format pilot.
    C.drills = {}; C.practice = {};
  }
  const n = { claims: 0, answers: 0, quiz: 0 };
  const miss = { unsourced: 0, unverified: 0, unrouted: 0,
                 unclaimed: 0, repeat: 0, nameonly: 0 };
  let blocks = 0;
  const sourceIssues = [];

  for (const s of C.sections)
    for (const u of s.subs) {
      for (const [i, b] of (u.blocks || []).entries()) {
        /* A row that shows only its own label is a row the reader has to open
           before it tells them anything, which is the one thing notes depth is
           not for. Counted over every block the depth can show — a `p` is
           excluded because it is hidden there by rule (M36).

           A caption row is not counted, and that is a judgement the script
           cannot make for itself: "mono table — centred cells, course
           valueStyles applied" says what the table holds, and "What each
           surface is for" names a topic and answers nothing. Both are captions.
           Whether one earns its row is the author's call, which is why §6.7
           asks for it rather than the gate. */
        if (b.t !== "p") {
          blocks++;
          if (present(b, "notes").mode === "closed") miss.nameonly++;
        }
        if (!CLAIM.has(b.t)) continue;
        n.claims++;
        const kind = sourceKind(b.source);
        if (kind !== "sourced") miss.unsourced++;
        if (profile === "publish" && (kind === "missing" || b.sourceReview !== kind))
          sourceIssues.push(`${u.id} block ${i + 1}: sourceReview must be ${kind === "missing"
            ? "sourced or disclosed, with a source: value" : kind} after reviewing source: ${b.source || "(missing)"}`);
        /* A claim with neither field states nothing at `notes` depth and
           closes to its own label, so the reader gets a name where a claim
           was promised. Counted rather than failed, because a course written
           before depth existed has every block in this state and must keep
           rendering. */
        if (!String(b.core || "").trim() && !String(b.gist || "").trim()) miss.unclaimed++;
        /* `gist:` is a second copy, permitted where claim-first would spoil the
           first read and nowhere else. Left ungated it becomes the default,
           because it is the easier of the two to write: no prose discipline,
           just a summary. So it is a declared fraction with a ceiling, like
           every other piece of content debt here. */
        else if (String(b.gist || "").trim()) miss.repeat++;
      }
      for (const q of u.quiz || []) {
        n.quiz++; n.answers++;
        if (!verifiedAnswer(q.verified)) miss.unverified++;
        if (!conceptOf(C, q, u)) miss.unrouted++;
      }
    }

  if (!subsection) {
    const placed = new Set(C.sections.flatMap(s => s.subs.flatMap(u => (u.quiz || []).map(q => q.id))));
    for (const item of Object.values(C.questionBank || {})) if (!placed.has(item.id)) {
      n.answers++;
      if (!verifiedAnswer(item.verified)) miss.unverified++;
    }
  }
  for (const file of Object.values(C.drills))
    for (const it of file.items || []) { n.answers++; if (!verifiedAnswer(it.verified)) miss.unverified++; }
  for (const file of Object.values(C.practice || {}))
    for (const it of file.items || []) { n.answers++; if (!verifiedAnswer(it.verified)) miss.unverified++; }

  const of = { unsourced: n.claims, unverified: n.answers, unrouted: n.quiz,
               unclaimed: n.claims, repeat: n.claims, nameonly: blocks };
  const ceiling = C.audit || {};
  const rows = METRICS.map(([k, label]) => ({
    k, label, of: of[k],
    frac: of[k] ? miss[k] / of[k] : 0,
    max: profile === "publish" && k === "unverified" ? 0 :
      ceiling[k] != null ? Number(ceiling[k]) : 1
  }));

  return { C, rows, over: rows.filter(r => r.frac > r.max), sourceIssues,
           schemaIssues: profile === "publish" ? strictCurrentIssues(C) : [],
           details: detailsWithoutRecall(C), points: pointsAtNothing(C) };
}

const ids = readdirSync(COURSES, { withFileTypes: true })
  .filter(d => d.isDirectory() && (!d.name.startsWith("_") || wanted.includes(d.name))).map(d => d.name)
  .filter(n => !wanted.length || wanted.includes(n));
if (wanted.some(id => !ids.includes(id))) {
  console.error(`course not found: ${wanted.filter(id => !ids.includes(id)).join(", ")}`);
  process.exit(2);
}

let failed = 0;
for (const id of ids) {
  const { C, rows, over, sourceIssues, schemaIssues, details, points } = audit(id);
  let coverage = null, coverageError = null;
  if (profile === "publish" && !subsection) {
    try { coverage = coverageReport(id); }
    catch (e) { coverageError = e.message; }
  }
  const blocked = profile === "publish" &&
    (over.some(r => r.k === "unverified") || sourceIssues.length || schemaIssues.length);
  if (blocked) failed++;

  console.log(`${blocked ? "FAIL publish" : profile === "draft" ? "draft" : "ok   publish"} ${id.padEnd(10)} ` +
    rows.map(r => `${pct(r.frac)} of ${r.of} ${r.k}`).join(", "));
  if (profile === "publish") console.log(migrationReportLine(id, C));
  for (const r of over)
    console.log(`       ${profile === "publish" && r.k === "unverified" ? "✗" : "!"} ${pct(r.frac)} ${r.label}, against ${
      profile === "draft" ? "a draft target" : "a declared review target"} of ${pct(r.max)}`);
  for (const issue of sourceIssues) console.log(`       ✗ ${issue}`);
  for (const issue of schemaIssues) console.log(`       ✗ ${issue}`);
  if (coverageError) console.log(`       ! coverage unavailable: ${coverageError}`);
  if (coverage && !coverage.files.length)
    console.log("       ! coverage: no readable source documents; topic comparison unavailable");
  else if (coverage && !coverage.unresolved.length)
    console.log(`       coverage: ${coverage.rows.filter(r => r.low).length} low-score topic leads reviewed; scores are not proof`);
  if (coverage?.unresolved.length) {
    console.log(`       ! ${coverage.unresolved.length} low-scoring coverage leads need reviewed dispositions ` +
      `(run: node tools/coverage.mjs ${id} --init-review)`);
    for (const t of coverage.unresolved.slice(0, 15))
      console.log(`         ${t.id} ${t.heading}: ${t.problem}`);
    if (coverage.unresolved.length > 15)
      console.log(`         ${coverage.unresolved.length - 15} more in the coverage report`);
  }
  for (const key of details)
    console.log(`       ! drills/${key}: a key block states a value and no item cues it back (M33)`);
  /* Listed, never counted: the phrase is right whenever the subsection it
     points at really does come earlier, and only the author knows which one it
     meant. Reading the list is the check (§12b). */
  for (const at of points)
    console.log(`       ! ${at} — name the subsection this points at; it must come earlier (M14)`);
}

process.exit(failed ? 1 : 0);
