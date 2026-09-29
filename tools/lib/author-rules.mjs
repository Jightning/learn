/* Compact authoring rules. The checklist is read from the authoritative spec so
 * a new mandatory check cannot silently disappear from the digest. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadSpec } from "./spec.mjs";

export const RULE_VERSION = 1;

export function checklist(spec) {
  const lines = spec.pick(["12a", "12b"]).split("\n");
  const items = [];
  for (const line of lines) {
    if (/^- \[ \] /.test(line)) items.push(line);
    else if (items.length && /^ {6}\S/.test(line)) items[items.length - 1] += "\n" + line;
  }
  if (!items.length) throw new Error("authoring spec has no mandatory checklist");
  return items;
}

export function version(specs) {
  const hash = createHash("sha256");
  for (const spec of specs) hash.update(readFileSync(spec.path));
  return `v${RULE_VERSION} (spec ${hash.digest("hex").slice(0, 12)})`;
}

const CORE = [
  "Write course data only. Calibrate to the reader before drafting; state every source topic as taught, bridged, or skipped with a reason.",
  "Keep explanation in one place, define each new term before use, and derive each rule. The reader knows only prerequisites and preceding subsections.",
  "Do not guess unknown facts or answers: mark generated or unverified, then review sources and re-derive before marking verified.",
  "Build the subsection in order: definition, rule and its why, worked example, then exception or trap. Put examinable material in the spine.",
  "Ask one question per distinct skill; check each answer and explain tempting errors. Add a synthesis item to a composing section.",
  "Choose tiers and prose for this reader. Use figures next to explanations that depend on structure, motion, connections, or signal paths.",
  "Run validation and the draft audit, review coverage leads and source dispositions, then pass the publish audit before calling a course publish-ready."
];

export function digestRules(which, cc, specs, { lean = false } = {}) {
  const checks = checklist(cc);
  const intro = which === "course"
    ? "Steps 0-4: reader, source scope, section sequence, taxonomy, and recurring concepts."
    : "Steps 5-7: one subsection at a time; spine, distinct quiz skills, depth, and answer verification.";
  return [
    `## Authoring-rule digest ${version(specs)}`,
    intro,
    ...CORE.map((s, i) => `${i + 1}. ${s}`),
    lean ? "" : "Read an on-demand section with `author rules <id> --need block:<type>|figure:<kind>|question:<kind>` before using an unfamiliar shape.",
    "### Mandatory checklist (create_course.md §12a–b)",
    ...checks
  ].filter(Boolean).join("\n");
}

const NEEDS = {
  "block:all": ["6.1", "6.2", "6.3*", "6.6"],
  "block:p": ["6.1", "6.2"],
  "block:def": ["6.1", "6.2", "6.6"],
  "block:key": ["6.1", "6.2", "6.6"],
  "block:trap": ["6.1", "6.4", "6.6"],
  "block:ex": ["6.1", "6.2"],
  "block:note": ["6.1", "6.3*"],
  "block:list": ["6.1"],
  "block:table": ["6.1", "10.1"],
  "block:code": ["6.1"],
  "block:math": ["6.1", "10.2"],
  "block:figure": ["6.1", "10.1"],
  "block:image": ["6.1", "10.3"],
  "block:attempt": ["6.1", "6.2"],
  "figure:all": ["10.1", "10.3"],
  "figure:bar": ["10.1"],
  "figure:circuit": ["10.1"],
  "figure:drawing": ["10.1"],
  "figure:flow": ["10.1"],
  "figure:grid": ["10.1"],
  "figure:matrix": ["10.1"],
  "figure:plot": ["10.1"],
  "figure:graph": ["10.1"],
  "figure:scatter": ["10.1"],
  "figure:svg": ["10.1"],
  "figure:timing": ["10.1"],
  "figure:image": ["10.3"],
  "question:all": ["7*"],
  "question:single": ["7"],
  "question:multi": ["7"],
  "question:number": ["7"],
  "question:self": ["7"],
  "question:synthesis": ["7.1"]
};

export const availableNeeds = Object.keys(NEEDS);

export function needsIn(subsection) {
  const found = new Set();
  for (const block of subsection?.blocks || []) {
    if (NEEDS[`block:${block?.t}`]) found.add(`block:${block.t}`);
    if (block?.t === "figure" && NEEDS[`figure:${block.kind}`]) found.add(`figure:${block.kind}`);
  }
  for (const question of subsection?.quiz || []) {
    const kind = question?.type === "Synthesis" ? "synthesis" : question?.response?.kind;
    if (NEEDS[`question:${kind}`]) found.add(`question:${kind}`);
    if (question?.stimulus?.t === "figure") found.add("figure:all");
    if (question?.stimulus?.t === "image") found.add("figure:image");
  }
  return [...found];
}

export function needSections(spec, needs) {
  const unknown = needs.filter(n => !NEEDS[n]);
  if (unknown.length) throw new Error(`unknown rule need: ${unknown.join(", ")}. Choose: ${availableNeeds.join(", ")}`);
  return spec.pick([...new Set(needs.flatMap(n => NEEDS[n]))]);
}
