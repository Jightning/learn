/* Shared file-map contract. Executable packages stay external; these documents
 * contain public definitions only, never evaluator fixtures, keys or solutions. */
import { compileMastery } from "./mastery-schema.js";
import { compileActivities, ACTIVITY_CAPABILITIES } from "./activity-schema.js";
import { masterySignatures } from "./mastery-versions.js";

const DATA = /^mastery\/(manifest|targets|policies|activities)\.(ya?ml|json)$/;

export function readMasteryCollections(files, read, errors = []) {
  const paths = Object.keys(files).filter(p => p.startsWith("mastery/"));
  if (!paths.length) return undefined;
  const source = {};
  for (const path of paths.sort()) {
    const match = DATA.exec(path);
    if (!match) { errors.push(`${path}: unsupported mastery file; use public definition documents and external package references`); continue; }
    if (Object.hasOwn(source, match[1])) { errors.push(`${path}: duplicate mastery ${match[1]} document`); continue; }
    source[match[1]] = read(path);
  }
  for (const key of ["manifest", "targets", "policies"])
    if (!Object.hasOwn(source, key)) errors.push(`mastery/${key}: required document is missing`);
  return source;
}

/** A private flag cannot make a distributed file secret. Reject conventional
 * private/evaluator trees in opted-in courses rather than quietly packing them. */
export function masteryDistributionIssues(paths) {
  if (!paths.some(p => p.startsWith("mastery/"))) return [];
  return paths.filter(p => p.split("/").some(part => /^(private|evaluator|private-assessment)$/i.test(part)))
    .map(p => `${p}: private evaluator packages must be outside the course tree`);
}

export function resolveMastery(C, files, read, errors = []) {
  // Compiled indexes are never accepted from course metadata.
  for (const key of ["mastery", "activityIndex"]) if (Object.hasOwn(C, key)) {
    errors.push(`course: ${key} is derived; use mastery/ documents`);
    delete C[key];
  }
  const start = errors.length;
  const source = readMasteryCollections(files, read, errors);
  if (source === undefined) return;
  errors.push(...masteryDistributionIssues(Object.keys(files)));
  const { activities, ...definitions } = source;
  if (activities && Object.hasOwn(activities, "manifest")) errors.push("mastery/activities: use the shared mastery/manifest document");
  const mastery = compileMastery(C, definitions, errors, ACTIVITY_CAPABILITIES);
  const declared = source.manifest?.required?.["mastery.activities"] ?? source.manifest?.optional?.["mastery.activities"];
  if (activities !== undefined && declared !== 1) errors.push("mastery/manifest: declare mastery.activities@1 for activity definitions");
  if (activities === undefined && declared === 1) errors.push("mastery/activities: declared collection is missing");
  const activityIndex = activities === undefined ? null : compileActivities({ ...C,
    subsections: Object.fromEntries(C.sections.flatMap(s => s.subs.map(u => [u.id, u])))
  }, mastery, { ...activities, manifest: source.manifest }, errors);
  // No usable opt-in index survives a validation error elsewhere in the course.
  if (errors.length !== start || errors.length || !mastery || (activities !== undefined && !activityIndex)) return;
  C.mastery = mastery;
  C.activityIndex = activityIndex;
  masterySignatures(C);
}
