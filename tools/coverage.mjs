#!/usr/bin/env node
/* ============================================================================
 * tools/coverage.mjs — which parts of the sources a course never says
 *
 *   node tools/coverage.mjs <course> [--all] [--below 0.25]
 *
 * Splits every readable file in sources/ into the topics its headings name,
 * whatever the folder looks like, scores each topic against every subsection
 * (lib/coverage.mjs), and keeps the best. A topic whose best match is below
 * the line is printed with the words it is missing and where it came closest.
 *
 * No naming convention is needed. Once `author run` has finished subsections
 * (.author/<id>/map.txt names each one's sources), a topic is scored against
 * the subsections written from its file; before that, against its best match
 * anywhere, which is more lenient.
 *
 * A report, not a gate: a paraphrase scores low and a deliberate skip is
 * legal. Each flagged topic is taught in words this cannot see, listed under
 * Skip in materials/expectations.md, not course material, or a gap.
 * ==========================================================================*/
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { digest } from "./lib/digest.mjs";
import { parseFile } from "./lib/load.mjs";
import { roots, list, topics, loadMap, names } from "./lib/sources.mjs";
import { terms, bag, idf, score, textOf } from "./lib/coverage.mjs";

import { WORKSPACE, COURSES, STATE } from "./lib/paths.mjs";
const args = process.argv.slice(2);
const at = args.indexOf("--below");
const below = at >= 0 ? Number(args[at + 1]) : 0.25;
const all = args.includes("--all");
const id = args.find((a, i) => !a.startsWith("--") && (at < 0 || i !== at + 1));
if (!id || Number.isNaN(below)) {
  console.error("usage: coverage.mjs <course> [--all] [--below 0.25]");
  process.exit(1);
}

const dir = join(COURSES, id);
/* The same roots the last `author run` read (its --source paths included),
   checked again rather than trusted. Documents only: code has no topics. */
const saved = join(STATE, id, "roots.txt");
const extra = existsSync(saved) ? readFileSync(saved, "utf8").split("\n").filter(Boolean) : [];
const files = list(roots(dir, extra.filter(existsSync))).filter(f => f.doc);
if (!files.length) {
  console.error(`courses/${id} has no readable source documents — nothing to score against`);
  process.exit(1);
}

/* With a source map, a topic is scored only against the subsections it was
   assigned to: scoring against the best match anywhere lets an unrelated
   subsection that shares the vocabulary (elimination "reduces" systems to
   second-order equations) hide a topic nobody taught. */
const map = loadMap(WORKSPACE, id);
const mapped = Object.keys(map).length > 0;
const subs = digest(dir).subs.map(u => ({
  id: u.id,
  sources: map[relative(dir, u.file)] || [],
  have: terms(textOf(parseFile(u.file)?.blocks))
}));
if (!mapped) console.log("No finished subsections recorded by `author run` yet: " +
  "each topic is scored against its best match anywhere, which is lenient.\n");
const found = files.map(f => ({
  rel: f.path,
  topics: topics(readFileSync(f.path, "utf8")).map(t => ({ heading: t.heading, tf: bag(t.heading, t.body) }))
}));
const w = idf(found.flatMap(f => f.topics.map(t => t.tf)));

/* With a map, a file no subsection names is one decision (not material, or
   a gap), not a gap per heading, so it is listed once. */
const entries = subs.flatMap(s => s.sources);
const unowned = mapped ? found.filter(f => !entries.some(n => n.split("#")[0] === f.rel)) : [];

let gaps = 0, total = 0;
for (const f of found) {
  if (unowned.includes(f)) continue;
  const rows = f.topics.map(t => {
    const owners = mapped ? subs.filter(s => s.sources.some(n => names(n, f.rel, t.heading))) : subs;
    const best = owners.map(s => ({ id: s.id, ...score(t.tf, s.have, w) }))
      .sort((a, b) => b.score - a.score)[0] ||
      { id: "no subsection is mapped to it", score: 0, missing: score(t.tf, new Set(), w).missing };
    return { t, best };
  });
  total += rows.length;
  const low = rows.filter(r => r.best.score < below);
  gaps += low.length;
  if (!low.length && !all) continue;
  console.log(f.rel);
  for (const { t, best } of all ? rows : low) {
    const flag = best.score < below ? "!" : " ";
    console.log(`  ${flag} ${best.score.toFixed(2)}  ${t.heading}   (${mapped ? "" : "closest: "}${best.id})`);
    if (flag === "!") console.log(`           missing: ${best.missing.join(", ")}`);
  }
}
if (unowned.length) {
  console.log(`\nNamed by no finished subsection (not course material, or a gap):`);
  for (const f of unowned) console.log(`  ${f.rel}`);
}
console.log(`\n${gaps} of ${total} source topics below ${below}. Each is taught in words this ` +
  `cannot see, skipped on purpose (materials/expectations.md), not course material, or a gap.`);
