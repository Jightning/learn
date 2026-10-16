/* A derived scope snapshot prevents a writer from quietly dropping obligations.
   Curriculum definitions stay canonical; this state stores only required IDs. */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFile } from "./load.mjs";
import { digest } from "./digest.mjs";
import { readPlan, planCoverage, packetText } from "./author-packets.mjs";
import { readUnit } from "./source-catalog.mjs";

function savedRequirements(stateDir) {
  const path = join(stateDir, "required-assessment.yaml");
  if (!existsSync(path)) return [];
  const ids = parseFile(path)?.families;
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string" || !id.trim()))
    throw new Error(`${path}: expected a list of required family IDs`);
  return ids;
}

export function captureAssessmentRequirements(plan, stateDir) {
  const ids = [...new Set([...savedRequirements(stateDir), ...(plan.data.families || [])
    .filter(f => f.assessmentRequired === true).map(f => f.id)])];
  if (ids.length) {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "required-assessment.yaml"), packetText({ families: ids }));
  }
}

export function preserveAssessmentRequirements(report, stateDir) {
  for (const id of savedRequirements(stateDir)) if (!report.requiredFamilies.some(row => row.id === id)) {
    report.requiredFamilies.push({ id, complete: false,
      missing: ["required family was removed or its assessmentRequired flag was cleared after writing began"] });
    report.assessmentReady = false;
  }
  return report;
}

/** Used by standalone publication/packing too, so bypassing finish cannot hide a gap. */
export function assessmentRequirementIssues(courseDir, stateDir) {
  const plan = readPlan(courseDir);
  if (!savedRequirements(stateDir).length && !(plan.data.families || []).some(f => f.assessmentRequired === true)) return [];
  const report = preserveAssessmentRequirements(planCoverage(plan, digest(courseDir).subs, {
    verifySource: ref => readUnit(join(stateDir, "sources/catalog.yaml"), ref)
  }), stateDir);
  return report.requiredFamilies.filter(row => !row.complete).map(row => `${row.id}: ${row.missing.join("; ")}`);
}
