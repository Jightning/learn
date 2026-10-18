/* Read-only migration report. Never rewrites existing courses or history. */
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadCourse } from "./lib/load.mjs";
import { suggestQuestionMetadata } from "./lib/question-suggestions.mjs";
export function questionBankPreview(dir) {
  const { course, errors } = loadCourse(dir);
  if (errors.length) throw new Error(errors.join("\n"));
  return {
    schemaVersion: 2,
    skills: Object.values(course.questionTypes || {}).map(s => ({ id: s.id, standard: s.standard || null, objectives: s.objectives,
      families: s.families, concepts: s.concepts || [s.concept], teach: s.teach, membership: s.scopes,
      importance: s.importance ?? 1, derived: s.derived || {},
      unresolved: s.schemaVersion === 2 ? [] : ["Review independent performance standard", "Review canonical curriculum inheritance"],
      contributions: Object.fromEntries(Object.entries(course.assessmentBlueprints || {}).filter(([, b]) => Object.hasOwn(b.typeWeights, s.id)).map(([scope, b]) => [scope, b.typeWeights[s.id]])) })),
    items: Object.values(course.questionBank || {}).map(q => ({ id: q.id, skills: q.skills, contentVersion: q.contentVersion,
      evidenceVersion: q.evidenceVersion, organizationVersion: q.organizationVersion,
      unresolved: q.schemaVersion === 2 ? [] : ["Review demand and authored support", "Review template independence; legacy groups do not certify transfer", ...(q.demonstrates.length ? ["Legacy demonstrates links remain provisional"] : [])] })),
    warnings: course.questionBankWarnings || [],
    suggestions: suggestQuestionMetadata(course),
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) throw new Error("Usage: node tools/question-bank-preview.mjs <course ID or directory>");
  const dir = existsSync(target) ? resolve(target) : resolve(join("courses", target));
  process.stdout.write(`${JSON.stringify(questionBankPreview(dir), null, 2)}\n`);
}
