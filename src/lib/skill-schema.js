import { validateMatcher } from "./response-scoring.js";
/* Creator metadata is compiled once. Inference never invents curriculum links. */
const map = x => x && typeof x === "object" && !Array.isArray(x);
const asList = x => x == null ? [] : Array.isArray(x) ? x : [x];
const unique = xs => [...new Set(xs)];
export const SKILL_SCHEMA_VERSION = 2;
export function compileSkills(C, source, errors) {
  if (source.skills?.length && source.types?.length) errors.push("questions: use skills or legacy types, not competing catalogs");
  if (!source.skills?.length) return source.types || [];
  return source.skills.map(raw => {
    if (!map(raw)) return raw;
    const fail = message => errors.push(`questions/skills ${raw.id}: ${message}`);
    for (const key of Object.keys(raw)) if (!["id", "authorId", "task", "standard", "family", "families", "concept", "concepts", "objectives", "scoreFor", "teach", "requires", "diagnose", "importance", "membership", "assess", "representations"].includes(key)) fail(`unknown skill key ${key}`);
    if (typeof raw.standard !== "string" || !raw.standard.trim()) fail("standard is required");
    if (raw.family !== undefined && raw.families !== undefined) fail("use family or families, not both");
    const families = asList(raw.families ?? raw.family);
    const familyDefs = families.map(id => C.families?.[id]).filter(Boolean);
    const linkedObjectives = unique(Object.entries(C.objectives || {}).filter(([, o]) => asList(o.families ?? o.family).some(id => families.includes(id))).map(([id]) => id));
    const objectives = raw.objectives ?? linkedObjectives;
    if (!raw.objectives && linkedObjectives.length !== 1) fail("ambiguous objective inheritance; declare objectives and scoring owner");
    const inheritedConcepts = unique(familyDefs.flatMap(f => asList(f.concepts ?? f.concept)));
    if (!raw.concepts && !raw.concept && inheritedConcepts.length > 1) fail("ambiguous concept inheritance; declare concepts");
    const concepts = raw.concepts ?? (raw.concept ? [raw.concept] : inheritedConcepts.length ? inheritedConcepts : C.concepts?.[raw.id] ? [raw.id] : []);
    if (!Array.isArray(concepts) || !concepts.length) fail("no concept link; declare concepts or a family concept");
    for (const id of asList(concepts)) if (typeof id !== "string" || !Object.hasOwn(C.concepts || {}, id)) fail(`unknown concept ${id}`);
    if (raw.concept && Array.isArray(raw.concepts) && !raw.concepts.includes(raw.concept)) fail("concept conflicts with concepts");
    const teach = raw.teach ?? unique(familyDefs.flatMap(f => asList(f.teach)));
    if (raw.importance !== undefined && (typeof raw.importance !== "number" || !Number.isFinite(raw.importance) || raw.importance <= 0)) fail("importance must be positive finite weight");
    for (const key of ["membership", "representations"]) if (raw[key] !== undefined && (!Array.isArray(raw[key]) || raw[key].some(id => typeof id !== "string" || !id.trim()) || new Set(raw[key]).size !== raw[key].length)) fail(`${key} must list distinct nonempty IDs`);
    return { ...raw, schemaVersion: 2, families, objectives, concepts, concept: concepts?.[0], teach,
      scope: raw.membership ?? [], importance: raw.importance ?? 1,
      derived: { objectives: raw.objectives ? "explicit" : "objective family link", concepts: raw.concepts || raw.concept ? "explicit" : "family/shared identity", teach: raw.teach ? "explicit" : "family teaching declaration", membership: "teaching and practice placement" } };
  });
}

export function validateItemEvidence(raw, types, errors, where) {
  const fail = message => errors.push(`${where}: ${message}`);
  const ids = (xs, name) => {
    if (!Array.isArray(xs) || !xs.length || xs.some(id => typeof id !== "string" || !Object.hasOwn(types, id)) || new Set(xs).size !== xs.length) { fail(`${name} must list distinct known skills`); return []; }
    return xs;
  };
  const skills = ids(raw.skills ?? [raw.typeId], "skills");
  if (raw.skills && raw.typeId && raw.typeId !== skills[0]) fail("typeId conflicts with first skill");
  const demand = raw.demand ?? "standard";
  if (!["foundation", "standard", "extension"].includes(demand)) fail("demand must be foundation, standard, or extension");
  const support = value => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some(s => !["supplied-method", "supplied-result", "worked-example"].includes(s)) || new Set(value).size !== value.length) { fail("support must list distinct supplied-method, supplied-result, or worked-example"); return []; }
    return value;
  };
  if (raw.representation !== undefined && (typeof raw.representation !== "string" || !raw.representation.trim())) fail("representation must be a nonempty ID");
  if (raw.routes !== undefined && (!Array.isArray(raw.routes) || raw.routes.length < 2)) fail("routes must contain at least two alternative skill lists");
  const routes = Array.isArray(raw.routes) ? raw.routes.map((r, i) => ids(r, `route ${i + 1}`)) : [];
  if (routes.some(route => route.some(id => !skills.includes(id)))) fail("route skills must be declared in item skills");
  if (routes.length && skills.some(id => !routes.some(route => route.includes(id)))) fail("every declared skill must occur in a route");
  if (new Set(routes.map(r => [...r].sort().join("|"))).size !== routes.length) fail("duplicate alternative route");
  const steps = [];
  if (raw.steps !== undefined && (!Array.isArray(raw.steps) || !raw.steps.length)) fail("steps must be a nonempty list");
  for (const step of Array.isArray(raw.steps) ? raw.steps : []) {
    if (!map(step)) { fail("step must be a mapping"); continue; }
    for (const key of Object.keys(step)) if (!["id", "skills", "q", "response", "support", "why", "tries", "stimulus", "timing"].includes(key)) fail(`unknown step key ${key}`);
    if (typeof step.id !== "string" || !step.id.trim() || steps.some(s => s.id === step.id)) fail("step needs a distinct stable id");
    const stepSkills = ids(step.skills, "step skills");
    if (stepSkills.some(id => !skills.includes(id))) fail("step skills must belong to parent skills");
    if (typeof step.q !== "string" || !step.q.trim() || !map(step.response)) fail("step q and response are required");
    steps.push({ ...step, skills: stepSkills, support: support(step.support) });
  }
  if (raw.errors !== undefined && (!Array.isArray(raw.errors) || raw.errors.some(e => !map(e) || typeof e.id !== "string" || !e.id.trim() || typeof e.description !== "string" || !e.description.trim() || Object.keys(e).some(k => !["id", "description", "match"].includes(k)) || (e.match !== undefined && typeof e.match !== "string" && !map(e.match))))) fail("errors must list reviewed {id, description, match?} hypotheses");
  for (const error of Array.isArray(raw.errors) ? raw.errors : []) if (map(error?.match)) validateMatcher(error.match, `${where} error ${error.id}`, errors, raw.response);
  if (Array.isArray(raw.errors) && new Set(raw.errors.map(e => e?.id)).size !== raw.errors.length) fail("duplicate error ID");
  return { skills, demand, support: support(raw.support), routes, steps, schemaVersion: raw.skills ? 2 : 1 };
}

export function validateEvidenceRequirements(value, types, errors, where) {
  const fail = message => errors.push(`${where}: ${message}`);
  if (value === undefined) return { representations: {}, integrations: [] };
  if (!map(value)) { fail("requirements must be a mapping"); return { representations: {}, integrations: [] }; }
  for (const key of Object.keys(value)) if (!["representations", "integrations"].includes(key)) fail(`unknown requirement ${key}`);
  const representations = value.representations ?? {}, integrations = value.integrations ?? [];
  if (!map(representations)) fail("representations must map skills to required representation IDs");
  else for (const [skill, reps] of Object.entries(representations)) if (!types.includes(skill) || !Array.isArray(reps) || !reps.length || reps.some(r => typeof r !== "string" || !r.trim()) || new Set(reps).size !== reps.length) fail(`invalid representations for ${skill}`);
  if (!Array.isArray(integrations) || integrations.some(ids => !Array.isArray(ids) || ids.length < 2 || ids.some(id => !types.includes(id)) || new Set(ids).size !== ids.length)) fail("integrations must list distinct assessed skill combinations");
  return { representations: map(representations) ? representations : {}, integrations: Array.isArray(integrations) ? integrations : [] };
}
