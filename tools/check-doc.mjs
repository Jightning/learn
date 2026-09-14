#!/usr/bin/env node
/* The authoring guide's examples, checked against the engine they describe.
 *
 * `docs/create_course.md` is the one document a course is written from, and
 * every YAML example in it is a promise about a schema that lives somewhere
 * else. Nothing re-read those promises, so they could only be kept by memory —
 * and a field that quietly stopped existing would go on being copied into new
 * courses until a build failed somewhere far from the cause.
 *
 * So: pull every YAML fence out of the guide, parse it, and hold each block in
 * it to the registry. Three faults, each of which has actually happened in this
 * repository:
 *
 *   a type the engine does not register
 *   a field no renderer reads, which is a field that does nothing
 *   a list item YAML read as a mapping because of an unquoted ": ", which
 *     reaches the reader as [object Object]
 *
 * Fences are fragments — some are one block, some a bare `items:` — so the
 * parsed value is walked for anything with a `t:` rather than assumed to have
 * a shape. A fence that does not parse at all is a failure too: an example
 * nobody can paste is worse than no example.
 *
 * Cheap on purpose. It reads three files, parses about thirty short documents
 * and exits; it adds nothing to what an author has to read, which is the only
 * budget that matters here.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as YAML from "js-yaml";
import { INTERACTIVE } from "../src/blocks/interactive.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/* Both authoring documents: `writing.md` carries the YAML mapping trap and
   shows it in fences, so it needs the same gate. */
const DOCS = ["docs/create_course.md", "docs/writing.md"];

/* Block types, read from the registry rather than listed here, for the reason
   validate.mjs reads them the same way: a list kept by hand is a list that
   drifts from the thing it lists. */
const registry = readFileSync(join(ROOT, "src/blocks/index.js"), "utf8");
const TYPES = new Set([
  ...[...registry.matchAll(/\bR\("([a-z]+)"/g)].map(m => m[1]),
  ...INTERACTIVE
]);

/* Fields, the same way. Every renderer reaches for `b.<name>`, so the set the
   engine actually reads is recoverable from the source. The literals beside it
   are the ones consumed outside the renderers — by the indexer, the scheduler
   or the build — and each is named with what reads it, so an entry cannot
   outlive its reader unnoticed. */
const FIELDS = new Set([
  ...[...registry.matchAll(/\bb\.([a-zA-Z_]\w*)/g)].map(m => m[1]),
  ...[...readFileSync(join(ROOT, "src/lib/gist.js"), "utf8")
        .matchAll(/\bb\.([a-zA-Z_]\w*)/g)].map(m => m[1]),
  "id",        /* lib/figures.js — numbering and citation */
  "tier",      /* lib/tiers.js   — the lane */
  "notes",     /* lib/gist.js    — the per-block depth override */
  "cat",       /* lib/cats.js    — principal category */
  "tags",      /* lib/cats.js    — secondary memberships */
  "verified",  /* validate.mjs   — the re-derivation date */
  "alt"        /* blocks/index.js image alt text */
]);

let fail = 0;
const bad = (f, msg) => { fail++; console.log(`       ✗ ${f.doc}:${f.line}  ${msg}`); };

/* ------------------------------------------------------------------ fences */
const fences = [];
for (const rel of DOCS) {
  const lines = readFileSync(join(ROOT, rel), "utf8").split("\n");
  let open = null;
  lines.forEach((l, i) => {
    if (open === null && /^\s*```ya?ml\s*$/.test(l)) open = i + 1;
    else if (open !== null && /^\s*```\s*$/.test(l)) {
      fences.push({ doc: rel, line: open, body: lines.slice(open, i).join("\n") });
      open = null;
    }
  });
}

/* --------------------------------------------------------------- the walk */
function blocks(v, out = []) {
  if (Array.isArray(v)) v.forEach(x => blocks(x, out));
  else if (v && typeof v === "object") {
    if (typeof v.t === "string") out.push(v);
    Object.values(v).forEach(x => blocks(x, out));
  }
  return out;
}

/* The mapping trap: `- a: b` in a list of prose is a mapping, not a string,
   and renders as [object Object]. validate.mjs gates courses for this; the
   guide has to be gated too, because the guide is where the habit comes from.
 *
 * Only the trap's own signature counts: one key, and a key with a space in it,
 * which is prose rather than a field name. Without that narrowing this fires on
 * every `items:` in the guide that is legitimately a list of objects — a drill
 * bank's items are `{format, stem, answer}` and always will be. */
const trapped = x =>
  x && typeof x === "object" && !Array.isArray(x)
  && Object.keys(x).length === 1 && /\s/.test(Object.keys(x)[0]);

function strings(v, where, out = []) {
  if (Array.isArray(v)) v.forEach((x, i) => {
    if (trapped(x))
      out.push(`${where}[${i}] is a mapping, not a string — an unquoted ": " does this, ` +
               `and it reaches the reader as [object Object]`);
  });
  return out;
}

let examples = 0;
for (const f of fences) {
  /* An example the prose is holding up as wrong. §13.4a shows the mapping trap
     by writing it out, and a checker that fails the demonstration of a fault is
     a checker that forbids explaining it. */
  if (/#\s*WRONG/i.test(f.body)) continue;

  let doc;
  try {
    /* `loadAll`, because front matter is legitimately more than one document —
     * `expectations.md` opens with `---` and `load` refuses the stream. */
    const docs = [];
    YAML.loadAll(f.body, d => docs.push(d));
    doc = docs.length > 1 ? docs.filter(Boolean) : docs[0];
  }
  catch (e) { bad(f, `does not parse: ${String(e.message).split("\n")[0]}`); continue; }
  if (doc == null) continue;
  examples++;

  for (const b of blocks(doc)) {
    if (!TYPES.has(b.t))
      bad(f, `block type "${b.t}" is not registered — the engine has ${[...TYPES].sort().join(", ")}`);
    for (const k of Object.keys(b))
      if (!FIELDS.has(k))
        bad(f, `block "${b.t}" names field "${k}", which no renderer reads`);
    if (b.t === "list") strings(b.items, "items").forEach(m => bad(f, m));
  }
  /* A bare `items:` fence, shown without the block around it. */
  if (doc && !Array.isArray(doc) && doc.items && !doc.t)
    strings(doc.items, "items").forEach(m => bad(f, m));
}

console.log(fail
  ? `\n${fail} problem(s) in the authoring docs`
  : `ok   docs       ${examples} examples in ${DOCS.length} files parse, every block type and field is real`);
process.exit(fail ? 1 : 0);
