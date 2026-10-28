/* A derived scope snapshot prevents a writer from quietly dropping obligations.
   Curriculum definitions stay canonical; this state stores required IDs and qualified practical obligations. */
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

const savedPractical = stateDir => {
  const path = join(stateDir, "required-assessment.yaml");
  return existsSync(path) ? parseFile(path)?.practical || {} : {};
};
const facetKey = facet => {
  if (!facet || typeof facet.root !== "string" || typeof facet.facet !== "string" || !Number.isInteger(facet.anchor) || typeof facet.kind !== "string")
    throw new Error("required practical facet needs root/facet/integer anchor/kind");
  return JSON.stringify([facet.root, facet.facet, facet.anchor, facet.kind]);
};

export function captureAssessmentRequirements(plan, stateDir) {
  const ids = [...new Set([...savedRequirements(stateDir), ...(plan.data.families || [])
    .filter(f => f.assessmentRequired === true).map(f => f.id)])];
  const practical = savedPractical(stateDir);
  for (const family of plan.data.families || []) if (family.assessmentRequired && Array.isArray(family.requiredFacets))
    practical[family.id] = [...new Map([...(practical[family.id] || []), ...family.requiredFacets].map(f => [facetKey(f), f])).values()];
  if (ids.length) {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "required-assessment.yaml"), packetText({ families: ids, ...(Object.keys(practical).length ? { practical } : {}) }));
  }
}

export function preserveAssessmentRequirements(report, stateDir) {
  for (const id of savedRequirements(stateDir)) if (!report.requiredFamilies.some(row => row.id === id)) {
    report.requiredFamilies.push({ id, complete: false,
      missing: ["required family was removed or its assessmentRequired flag was cleared after writing began"] });
    report.assessmentReady = false;
  }
  for (const [id, facets] of Object.entries(savedPractical(stateDir))) {
    const row = report.requiredFamilies.find(r => r.id === id);
    if (row && facets.some(f => !(row.requiredFacets || []).some(current => facetKey(f) === facetKey(current)))) {
      row.missing.push("required practical facet was removed or changed after writing began");
      row.complete = false; report.assessmentReady = false;
    }
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
