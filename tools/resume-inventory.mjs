#!/usr/bin/env node
/* Planning data only: no generated IDs are claimed to be native skill IDs. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function extractResumeInventory(source) {
  const lines = source.split(/\r?\n/), modules = [], rows = [];
  let inMatrix = false;
  for (const [index, line] of lines.entries()) {
    const module = /^\*\*(M\d{2})\. (.+)\*\*$/.exec(line);
    if (module) modules.push({ id: module[1], title: module[2], line: index + 1 });
    if (line === "**10. Complete skill coverage matrix**") { inMatrix = true; continue; }
    if (inMatrix && /^\*\*11\./.test(line)) inMatrix = false;
    if (!inMatrix || !/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
    if (cells.length !== 7) throw new Error(`source line ${index + 1}: expected seven matrix cells`);
    const [id, label, R, I, firstTaught, targetOwnerModule, policy] = cells;
    const sourceId = Number(id), requiredAnchor = Number(R), importance = Number(I);
    if (!Number.isInteger(sourceId) || sourceId !== rows.length + 1 || !label || !Number.isInteger(requiredAnchor) || requiredAnchor < 1 || requiredAnchor > 7 || !Number.isInteger(importance) || importance < 1 || importance > 10)
      throw new Error(`source line ${index + 1}: invalid or nonsequential target/R/I`);
    if (policy !== (requiredAnchor <= 3 ? "P3" : requiredAnchor <= 5 ? "P45" : "P67")) throw new Error(`source row ${sourceId}: inconsistent policy`);
    rows.push({ sourceId, rootId: `resume-${String(sourceId).padStart(3, "0")}`, label, requiredAnchor, importance,
      firstTaught, targetOwnerModule, policy, source: { path: "sources/plan.md", line: index + 1, raw: line } });
  }
  if (rows.length !== 297 || modules.length !== 33 || new Set(modules.map(m => m.id)).size !== 33)
    throw new Error(`expected 297 roots and 33 unique modules; found ${rows.length}/${modules.length}`);
  const moduleIds = new Set(modules.map(m => m.id));
  for (const row of rows) for (const id of [row.firstTaught, row.targetOwnerModule])
    if (!moduleIds.has(id)) throw new Error(`source row ${row.sourceId}: unknown module ${id}`);
  return {
    schemaVersion: 1, status: "planning-only",
    source: { path: "sources/plan.md", sha256: createHash("sha256").update(source).digest("hex"), section: "10. Complete skill coverage matrix" },
    mapping: "sourceId -> rootId is stable; native skill and canonical objective mappings remain unassigned",
    unresolved: [
      "curriculum.json and COURSE_PLAN.md referenced by the source are absent from this course",
      "No native skills or canonical objectives exist yet; do not infer scoring owner from target-owner module",
      "Historical records and claim requirements need source-backed authoring decisions; technical achievement cannot verify history",
      "Resources, external environments and qualified evaluators remain unverified; no downloads or access checks performed"
    ],
    outcomeBudgets: { "coding-fundamentals": 28, "ownership-evidence": 15, "gateway-evaluation-retrieval": 17,
      "backend-cloud-data": 12, "cpu-inference": 10, frontend: 7, "scraping-mcp": 4,
      "applied-ml-unreal-geometry": 4, "remaining-breadth": 2, "interpersonal-language": 1 },
    modules, rows
  };
}

export function serializeResumeInventory(inventory) { return `${JSON.stringify(inventory, null, 2)}\n`; }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && args[0] !== "--check")) throw new Error("usage: node tools/resume-inventory.mjs [--check]");
  const course = fileURLToPath(new URL("../courses/resume/", import.meta.url));
  for (const name of ["curriculum.json", "COURSE_PLAN.md", "sources/curriculum.json", "sources/COURSE_PLAN.md"])
    if (existsSync(resolve(course, name))) throw new Error(`${name} now exists: reconcile the missing-source note before regeneration`);
  const result = serializeResumeInventory(extractResumeInventory(readFileSync(resolve(course, "sources/plan.md"), "utf8")));
  const output = resolve(course, "materials/target-inventory.json");
  if (args[0] === "--check") {
    if (readFileSync(output, "utf8") !== result) throw new Error("target inventory drift: inspect source changes, then regenerate explicitly");
  } else {
    mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, result);
  }
  console.log(`Resume inventory ${args[0] === "--check" ? "checked" : "written"}: 297 rows, 33 modules`);
}
