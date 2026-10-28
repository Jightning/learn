import { MASTERY_CAPABILITIES, validateMasteryManifest } from "./mastery-schema.js";

export const ACTIVITY_SCHEMA_VERSION = 1;
// Availability describes contracts a caller implements, never evaluator authority.
export const ACTIVITY_ADAPTERS = Object.freeze({ question: 1, "external-submission": 1, "written-defense": 1 });
export const ACTIVITY_CAPABILITIES = Object.freeze({ ...MASTERY_CAPABILITIES, "mastery.activities": 1,
  ...Object.fromEntries(Object.entries(ACTIVITY_ADAPTERS).map(([id, version]) => [`adapter.${id}`, version])) });
export const ADAPTER_LIMITS = Object.freeze({ text: 32768, artifacts: 8, artifactBytes: 100000000, criteria: 64 });
const mapping = x => x !== null && typeof x === "object" && !Array.isArray(x);
const text = x => typeof x === "string" && !!x.trim() && x.length <= 512;
const version = x => Number.isInteger(x) && x > 0;
const anchor = x => version(x) && x <= 7;
const own = (x, key) => x != null && Object.hasOwn(x, key);
const hash = x => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const https = x => { try { const u = new URL(x); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } };
const kinds = { question: "question", "external-lab": "external-submission", "written-defense": "written-defense", audio: "audio", "trusted-evaluation": "trusted-evaluation" };

function validator(errors) {
  const fail = (at, message) => errors.push(`activities/${at}: ${message}`);
  const shape = (x, keys, at) => {
    if (!mapping(x)) { fail(at, "must be a mapping"); return false; }
    for (const key of Object.keys(x)) if (!keys.includes(key)) fail(at, `unknown key ${key}`);
    return true;
  };
  const list = (x, at, empty = false) => {
    if (!Array.isArray(x) || (!empty && !x.length) || x.some(id => !text(id)) || new Set(x).size !== x.length) {
      fail(at, "must list distinct nonempty IDs"); return [];
    }
    return x;
  };
  return { fail, shape, list };
}

/** Compile already-loaded definitions against canonical native and mastery indexes.
 * Lesson/question IDs come from the caller's resolved indexes, not file paths.
 * Missing optional adapters remain visible gaps; there is no runtime execution. */
export function compileActivities(C, mastery, source, errors = [], adapters = ACTIVITY_ADAPTERS) {
  if (source === undefined) return null;
  const start = errors.length, { fail, shape, list } = validator(errors);
  if (!shape(source, ["manifest", "schemaVersion", "activities"], "source")) return null;
  const supported = { ...MASTERY_CAPABILITIES, "mastery.activities": 1,
    ...Object.fromEntries(Object.entries(adapters).map(([id, n]) => [`adapter.${id}`, n])) };
  const manifest = validateMasteryManifest(source.manifest, errors, supported);
  if (source.manifest?.required?.["mastery.activities"] !== 1) fail("manifest", "declare mastery.activities@1 as required");
  if (source.schemaVersion !== 1) fail("source", "unsupported schemaVersion; update the reader or course");
  if (!mastery?.roots || !mastery?.policies) fail("source", "validated mastery index is required");
  if (!Array.isArray(source.activities)) { fail("source", "activities must be a list"); return null; }
  const activities = Object.create(null), skillActivities = Object.create(null), rootActivities = Object.create(null);
  for (const raw of source.activities) {
    if (!mapping(raw) || !text(raw.id)) { fail("entry", "stable id is required"); continue; }
    const at = raw.id;
    if (own(activities, at)) { fail(at, "duplicate activity id"); continue; }
    shape(raw, ["id", "contentVersion", "evidenceVersion", "kind", "lesson", "required", "wave", "prerequisites", "after", "tests", "group", "support", "rubricVersion", "adapter", "question", "lab", "timing", "environment", "fallback", "delay", "artifact", "checkVisibility"], at);
    for (const key of ["contentVersion", "evidenceVersion", "rubricVersion", "wave"]) if (!version(raw[key])) fail(at, `${key} must be a positive integer`);
    if (!own(kinds, raw.kind)) fail(at, "unsupported activity kind");
    if (!text(raw.lesson) || !own(C.subsections, raw.lesson)) fail(at, "unknown lesson");
    if (typeof raw.required !== "boolean") fail(at, "required must be boolean");
    if (!text(raw.group)) fail(at, "honest task group is required");
    if (!["none", "guided", "reference", "collaborative"].includes(raw.support)) fail(at, "invalid allowed support");
    if (!["public", "private", "review"].includes(raw.checkVisibility)) fail(at, "invalid checkVisibility");
    let available = false;
    if (shape(raw.adapter, ["id", "version"], `${at} adapter`)) {
      const { id, version: n } = raw.adapter;
      if (!text(id) || !version(n) || id !== kinds[raw.kind]) fail(at, "adapter ID/version must match activity kind");
      const declaration = `adapter.${id}`;
      if (source.manifest?.required?.[declaration] !== n && source.manifest?.optional?.[declaration] !== n) fail(at, "adapter must be declared with its version in manifest");
      available = own(adapters, id) && adapters[id] === n;
      if (raw.required && !available) fail(at, `unsupported required adapter ${id}@${n}; update the reader or course`);
    }
    const prerequisites = raw.prerequisites ?? [];
    if (!Array.isArray(prerequisites)) fail(at, "prerequisites must be a list");
    else {
      const seen = new Set();
      for (const pre of prerequisites) {
        if (!shape(pre, ["skill", "root", "minAnchor"], `${at} prerequisite`)) continue;
        const root = mastery?.roots?.[pre.root];
        if (!own(C.questionSkills ?? C.questionTypes, pre.skill) || !root?.skills.includes(pre.skill) || !own(root?.anchors, pre.minAnchor) || !anchor(pre.minAnchor)) fail(at, "unknown prerequisite skill/root/anchor");
        const key = `${pre.root}:${pre.skill}`;
        if (seen.has(key)) fail(at, "duplicate prerequisite");
        seen.add(key);
      }
    }
    const tested = new Set();
    if (!Array.isArray(raw.tests) || !raw.tests.length || raw.tests.length > ADAPTER_LIMITS.criteria) fail(at, "tests needs 1–64 qualified attributions");
    else for (const target of raw.tests) {
      if (!shape(target, ["root", "facet", "skill", "anchor", "criteria", "unfamiliarConstraint"], `${at} tests`)) continue;
      if (target.unfamiliarConstraint !== undefined && typeof target.unfamiliarConstraint !== "boolean") fail(at, "unfamiliarConstraint must be boolean");
      const root = mastery?.roots?.[target.root], facet = root?.facets?.[target.facet], demand = facet?.anchors?.[target.anchor];
      if (!anchor(target.anchor) || !demand || !facet.skills.includes(target.skill)) fail(at, "unknown tested root/facet/skill/anchor");
      for (const id of list(target.criteria, `${at} criteria`)) if (!demand?.criteria.includes(id)) fail(at, `unknown qualified criterion ${id}`);
      const key = `${target.root}:${target.facet}:${target.skill}:${target.anchor}`;
      if (tested.has(key)) fail(at, "duplicate tested attribution");
      tested.add(key);
      (rootActivities[target.root] ??= []).push(at);
      (skillActivities[target.skill] ??= []).push(at);
    }
    const after = list(raw.after ?? [], `${at} after`, true);
    if (raw.question !== undefined || raw.kind === "question") {
      if (raw.kind !== "question" || !text(raw.question) || !own(C.questionBank, raw.question)) fail(at, "unknown or misplaced question reference");
    }
    if (raw.lab !== undefined || raw.kind === "external-lab") {
      if (shape(raw.lab, ["id", "version", "url", "sha256", "instructions", "command", "cleanup"], `${at} lab`)) {
        if (raw.kind !== "external-lab" || !text(raw.lab.id) || !text(raw.lab.version) || !https(raw.lab.url) || !hash(raw.lab.sha256) || !text(raw.lab.instructions) || !text(raw.lab.command)) fail(at, "lab needs public package identity/version/HTTPS URL/SHA-256/instructions/command");
        if (raw.lab.cleanup !== undefined && !text(raw.lab.cleanup)) fail(at, "cleanup must be instructions");
      }
    }
    if (raw.timing !== undefined && shape(raw.timing, ["active", "setup", "feedback"], `${at} timing`)) {
      for (const [key, range] of Object.entries(raw.timing)) if (!Array.isArray(range) || range.length !== 2 || range.some(n => !Number.isFinite(n) || n < 0 || n > 604800) || range[1] < range[0]) fail(at, `invalid ${key} seconds range`);
    }
    if (raw.environment !== undefined && shape(raw.environment, ["capabilities", "instructions", "cleanup"], `${at} environment`)) {
      list(raw.environment.capabilities, `${at} environment capabilities`);
      for (const key of ["instructions", "cleanup"]) if (raw.environment[key] !== undefined && !text(raw.environment[key])) fail(at, `invalid environment ${key}`);
    }
    if (raw.fallback !== undefined && !text(raw.fallback)) fail(at, "fallback must reference an activity");
    if (raw.delay !== undefined && shape(raw.delay, ["activity", "root", "days", "after"], `${at} delay`)) {
      const root = mastery?.roots?.[raw.delay.root], policy = mastery?.policies?.[root?.policy];
      if (!text(raw.delay.activity) || !policy?.delayDays.includes(raw.delay.days) || raw.delay.after !== "qualifying-evidence-or-repair") fail(at, "delay must reference qualifying evidence/repair and a root policy interval");
    }
    if (raw.artifact !== undefined && shape(raw.artifact, ["mediaTypes", "maxBytes"], `${at} artifact`)) {
      list(raw.artifact.mediaTypes, `${at} mediaTypes`);
      if (!version(raw.artifact.maxBytes) || raw.artifact.maxBytes > ADAPTER_LIMITS.artifactBytes) fail(at, "artifact size exceeds bounded reference contract");
    }
    activities[at] = { ...structuredClone(raw), prerequisites: structuredClone(prerequisites), after: [...after], availability: available ? "available" : "unavailable" };
  }
  // Dependency edges include delays and fallback chains so no waiting loop compiles.
  const visiting = new Set(), visited = new Set();
  const visit = id => {
    if (visiting.has(id)) { fail(id, "activity dependency cycle"); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    const item = activities[id];
    for (const dep of [...item.after, item.fallback, item.delay?.activity].filter(Boolean)) {
      if (!own(activities, dep)) fail(id, `unknown activity reference ${dep}`); else visit(dep);
    }
    if (item.delay && !(Array.isArray(activities[item.delay.activity]?.tests) && activities[item.delay.activity].tests.some(t => t?.root === item.delay.root))) fail(id, "delay source must test the referenced root");
    visiting.delete(id); visited.add(id);
  };
  for (const id of Object.keys(activities)) visit(id);
  if (errors.length !== start) return null;
  for (const index of [rootActivities, skillActivities]) for (const id of Object.keys(index)) index[id] = [...new Set(index[id])];
  return { schemaVersion: 1, manifest, activities, rootActivities, skillActivities };
}
