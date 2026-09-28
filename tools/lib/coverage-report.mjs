/* Source-topic evidence and human dispositions shared by coverage and publish.
 * Scores find review candidates; they never decide whether a topic was taught. */
import { existsSync, readFileSync, realpathSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, relative, basename, sep } from "node:path";
import { createHash } from "node:crypto";
import * as YAML from "js-yaml";
import { digest } from "./digest.mjs";
import { parseFile } from "./load.mjs";
import { roots, list, topics, loadMap, names } from "./sources.mjs";
import { terms, bag, idf, score, textOf } from "./coverage.mjs";
import { WORKSPACE, COURSES, STATE } from "./paths.mjs";

export const reviewPath = id => join(COURSES, id, "materials", "coverage-review.yaml");
const hash = s => createHash("sha256").update(s).digest("hex").slice(0, 16);
const sourceKey = (own, path) => path.startsWith(own + sep) ? relative(own, path) : path;
const disposition = (value) => typeof value === "string" ? { disposition: value } : value || {};

export function reviewProblem(value) {
  const row = disposition(value);
  if (!["taught", "bridged", "moved", "skipped", "false-match"].includes(row.disposition))
    return "choose taught, bridged, moved, skipped, or false-match";
  if (row.disposition === "skipped" && !String(row.reason || "").trim())
    return "skipped needs a reason";
  if (row.disposition === "false-match" && !String(row.reason || "").trim())
    return "false-match needs a reason";
  if (row.disposition === "moved" && !String(row.to || "").trim())
    return "moved needs a destination in to:";
  return null;
}

function readReview(id) {
  const path = reviewPath(id);
  if (!existsSync(path)) return { topics: {}, files: {} };
  const data = parseFile(path);
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      (data.topics && (typeof data.topics !== "object" || Array.isArray(data.topics))) ||
      (data.files && (typeof data.files !== "object" || Array.isArray(data.files))))
    throw new Error(`${path}: expected topics: and files: mappings`);
  return { ...data, topics: data.topics || {}, files: data.files || {} };
}

/* An OCR/exported book can present hundreds of short Title Case lines that
 * look like headings. Stop before those become hundreds of review decisions. */
const suspect = rows => {
  const inferred = rows.filter(t => t.kind === "inferred");
  return inferred.length >= 120 &&
    inferred.filter(t => t.body.length < 120).length / inferred.length >= 0.75;
};

export function coverageReport(id, below = 0.25) {
  const dir = join(COURSES, id);
  const own = realpathSync(dir);
  const saved = join(STATE, id, "roots.txt");
  const extra = existsSync(saved) ? readFileSync(saved, "utf8").split("\n").filter(Boolean) : [];
  const files = list(roots(dir, extra.filter(existsSync))).filter(f => f.doc);
  const map = loadMap(WORKSPACE, id);
  const mapped = Object.keys(map).length > 0;
  const subs = digest(dir).subs.map(u => ({
    id: u.id,
    sources: map[relative(dir, u.file)] || [],
    have: terms(textOf(parseFile(u.file)?.blocks))
  }));
  const found = files.map(f => {
    const extracted = topics(readFileSync(f.path, "utf8"));
    if (suspect(extracted)) throw new Error(`${f.path}: ${extracted.length} topics, mostly short inferred headings; ` +
      "topic extraction looks wrong. Mark real headings in the source or split it before reviewing coverage");
    const key = sourceKey(own, f.path);
    const repeats = new Map();
    return {
      path: f.path, key, label: f.path.startsWith(own + sep)
        ? relative(own, f.path) : f.rel || basename(f.path), id: `f-${hash(key)}`,
      topics: extracted.map(t => {
        const heading = t.heading.replace(/\s+/g, " ").trim();
        const occurrence = (repeats.get(heading) || 0) + 1;
        repeats.set(heading, occurrence);
        return { id: `t-${hash(`${key}\0${heading}\0${occurrence}`)}`,
          heading: t.heading, tf: bag(t.heading, t.body) };
      })
    };
  });
  const weights = idf(found.flatMap(f => f.topics.map(t => t.tf)));
  const entries = subs.flatMap(s => s.sources);
  const review = readReview(id);
  const rows = [], targets = [];
  for (const file of found) {
    const unowned = mapped && !entries.some(n => n.split("#")[0] === file.path);
    const fileRows = file.topics.map(t => {
      const owners = unowned ? [] : mapped
        ? subs.filter(s => s.sources.some(n => names(n, file.path, t.heading))) : subs;
      const best = owners.map(s => ({ id: s.id, ...score(t.tf, s.have, weights) }))
        .sort((a, b) => b.score - a.score)[0] ||
        { id: "no subsection is mapped to it", score: 0,
          missing: score(t.tf, new Set(), weights).missing };
      return { ...t, source: file.path, sourceLabel: file.label, fileId: file.id, unowned,
        best: best.id, score: best.score, missing: best.missing, low: best.score < below };
    });
    rows.push(...fileRows);
    if (unowned && fileRows.some(r => r.low))
      targets.push({ id: file.id, kind: "files", source: file.path, sourceLabel: file.label,
        heading: "(unmapped file)" });
    else targets.push(...fileRows.filter(r => r.low).map(r => ({ ...r, kind: "topics" })));
  }
  const unresolved = targets.map(t => ({ ...t,
    problem: reviewProblem(review[t.kind][t.id]) })).filter(t => t.problem);
  return { files, mapped, rows, targets, unresolved, review, below };
}

/* One command creates a compact checklist. Existing dispositions are kept;
 * new low topics are added, so an author never has to transcribe hash IDs. */
export function initCoverageReview(id, report) {
  const review = report.review;
  let added = 0;
  for (const target of report.targets) {
    if (target.id in review[target.kind]) continue;
    review[target.kind][target.id] = { disposition: "pending",
      source: target.sourceLabel, heading: target.heading };
    added++;
  }
  if (added) {
    const path = reviewPath(id);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "# Review low coverage leads; scores are not proof.\n" +
      YAML.dump(review, { lineWidth: 100, sortKeys: true }));
  }
  return added;
}
