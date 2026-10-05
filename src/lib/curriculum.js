/* Shared curriculum collection handling for the authoring tools and reader. */
export const CURRICULUM_COLLECTIONS = Object.freeze(["objectives", "families", "concepts"]);

const mapping = value => value !== null && typeof value === "object" && !Array.isArray(value);
const singular = collection => collection === "families" ? "family" : collection.slice(0, -1);
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (!mapping(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
};

/* `id` is canonical for all collections. In the older concept-file format,
   the file stem or `key` supplied that same identity. */
function sameDefinition(a, b, id, collection) {
  const normalize = value => {
    const out = { ...value };
    delete out.id;
    if (collection === "concepts") delete out.key;
    return stable(out);
  };
  return normalize(a) === normalize(b) &&
    (collection !== "concepts" || (a.key || a.id || id) === (b.key || b.id || id));
}

/** Read and validate fixed canonical YAML collection files from a text map. */
export function readCurriculumCollections(files, errors = []) {
  const collections = {};
  for (const name of CURRICULUM_COLLECTIONS) {
    const candidates = [`categorize/${name}.yaml`, `categorize/${name}.yml`, `categorize/${name}.json`]
      .filter(path => Object.hasOwn(files, path));
    if (candidates.length > 1) errors.push(`categorize/${name}: use only one collection file (${candidates.join(", ")})`);
    const path = candidates[0];
    if (!path) { collections[name] = []; continue; }
    let value;
    try {
      value = path.endsWith(".json") ? JSON.parse(files[path]) : (awaitYaml(files[path]));
    } catch (error) {
      errors.push(`${path}: ${String(error.message).split("\n")[0]}`);
      collections[name] = [];
      continue;
    }
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected a list of definitions`);
      collections[name] = [];
      continue;
    }
    const ids = new Set();
    collections[name] = value.filter((item, i) => {
      if (!mapping(item)) { errors.push(`${path}[${i + 1}]: definition must be a mapping`); return false; }
      if (typeof item.id !== "string" || !item.id.trim()) {
        errors.push(`${path}[${i + 1}]: definition needs a nonempty id`); return false;
      }
      if (ids.has(item.id)) { errors.push(`${path}: duplicate ${name.slice(0, -1)} id "${item.id}"`); return false; }
      ids.add(item.id);
      return true;
    });
  }
  return collections;
}

// Lazy import-free YAML dependency keeps this module browser-bundle compatible.
import * as YAML from "js-yaml";
const awaitYaml = text => YAML.load(text);

/** Merge canonical definitions with legacy definitions, reporting conflicts. */
export function mergeCurriculumDefinitions(canonical, legacy, errors = [], where = "legacy curriculum", strictLegacyDuplicates = false) {
  const merged = {};
  for (const name of CURRICULUM_COLLECTIONS) {
    const byId = new Map();
    const old = legacy?.[name] || [];
    for (const [index, value] of old.entries()) {
      if (!mapping(value)) { errors.push(`${where} ${name}[${index + 1}]: definition must be a mapping`); continue; }
      const id = value.id || (name === "concepts" ? value.key : null);
      if (typeof id !== "string" || !id.trim()) { errors.push(`${where} ${name}[${index + 1}]: definition needs an id`); continue; }
      if (byId.has(id) && strictLegacyDuplicates)
        errors.push(`${where}: duplicate ${name.slice(0, -1)} id "${id}"`);
      else byId.set(id, value);
    }
    for (const value of canonical?.[name] || []) {
      const id = value.id;
      if (byId.has(id) && !sameDefinition(byId.get(id), value, id, name))
        errors.push(`categorize/${name}.yaml conflicts with legacy ${name} definition "${id}"`);
      else byId.set(id, value);
    }
    merged[name] = [...byId.values()];
  }
  return merged;
}

/** Resolve plan reference lists, retaining legacy definition copies for conflict checks. */
export function mergePlanCurriculum(plan, canonical, errors = [], where = "plan") {
  const legacy = {};
  for (const name of CURRICULUM_COLLECTIONS) {
    const value = plan?.[name];
    if (value == null) { legacy[name] = []; continue; }
    if (!Array.isArray(value)) {
      errors.push(`${where}: ${name} must be a list`);
      legacy[name] = [];
      continue;
    }
    legacy[name] = value.flatMap((item, i) => {
      if (typeof item === "string") {
        const definition = (canonical[name] || []).find(entry => entry.id === item);
        if (!definition) errors.push(`${where}: ${name}[${i + 1}] references unknown ${singular(name)} "${item}"`);
        return definition ? [definition] : [];
      }
      if (!mapping(item)) {
        errors.push(`${where}: ${name}[${i + 1}] must be a definition mapping or id reference`);
        return [];
      }
      return [item];
    });
  }
  return mergeCurriculumDefinitions(canonical, legacy, errors, where, true);
}

/** Check references once canonical curriculum files make IDs authoritative. */
export function validateCurriculumReferences(plan, definitions, errors = []) {
  const ids = Object.fromEntries(CURRICULUM_COLLECTIONS.map(name =>
    [name, new Set((definitions?.[name] || []).map(item => item.id || item.key).filter(Boolean))]));
  const background = new Set((Array.isArray(plan?.reader?.background) ? plan.reader.background : []).map(item => typeof item === "string" ? item : item?.id).filter(Boolean));
  const refs = (value, collection, where, label = singular(collection)) => {
    if (value == null) return;
    for (const item of Array.isArray(value) ? value : [value]) {
      const id = typeof item === "string" ? item : item?.id;
      if (typeof id !== "string" || (!ids[collection].has(id) && !(label.includes("prerequisite") && background.has(id))))
        errors.push(`${where}: unknown ${label} reference "${id ?? item}"`);
    }
  };
  for (const collection of CURRICULUM_COLLECTIONS)
    if (Array.isArray(plan?.[collection]) && plan[collection].every(item => typeof item === "string"))
      refs(plan[collection], collection, `plan.${collection}`);

  for (const [i, lesson] of (Array.isArray(plan?.lessons) ? plan.lessons : Array.isArray(plan?.subsections) ? plan.subsections : []).entries()) {
    const where = `plan lesson ${lesson?.id || i + 1}`;
    refs(lesson?.objectives ?? lesson?.objective, "objectives", where);
    refs(lesson?.families ?? lesson?.family, "families", where);
    refs(lesson?.concepts ?? lesson?.concept, "concepts", where);
  }
  for (const item of definitions?.objectives || []) {
    const where = `objective "${item.id}"`;
    refs(item.prerequisites ?? item.prerequisite, "objectives", where, "objective prerequisite");
    refs(item.families ?? item.family, "families", where);
    refs(item.concepts ?? item.concept, "concepts", where);
  }
  for (const item of definitions?.families || [])
    refs(item.concepts ?? item.concept, "concepts", `family "${item.id}"`);
  for (const item of definitions?.concepts || []) {
    const where = `concept "${item.id}"`;
    refs(item.prerequisites ?? item.prerequisite, "concepts", where, "concept prerequisite");
    refs(item.related, "concepts", where);
    refs(item.confusable_with, "concepts", where);
  }
  return errors;
}

/** Validate curriculum tags and concept links in reader content. */
export function validateCourseCurriculumReferences(course, errors = []) {
  const ids = {
    objectives: new Set(Object.keys(course.objectives || {})),
    families: new Set(Object.keys(course.families || {})),
    concepts: new Set(Object.keys(course.concepts || {}))
  };
  const check = (value, collection, where) => {
    if (value == null) return;
    for (const item of Array.isArray(value) ? value : [value]) {
      const id = typeof item === "string" ? item : item?.id;
      if (typeof id !== "string" || !ids[collection].has(id))
        errors.push(`${where}: unknown ${singular(collection)} reference "${id ?? item}"`);
    }
  };
  const visitInlineConcepts = (value, where) => {
    if (typeof value === "string") {
      for (const match of value.matchAll(/<c\s+k=["']([^"']+)["']/g))
        check(match[1], "concepts", where);
    } else if (Array.isArray(value)) value.forEach(item => visitInlineConcepts(item, where));
    else if (mapping(value)) for (const item of Object.values(value)) visitInlineConcepts(item, where);
  };
  for (const section of course.sections || []) for (const unit of section.subs || []) {
    for (const [kind, items] of [["block", unit.blocks], ["quiz", unit.quiz]])
      for (const [i, item] of (Array.isArray(items) ? items : []).entries()) {
        const where = `${unit.id} ${kind} ${i + 1}`;
        check(item?.objectives ?? item?.objective, "objectives", where);
        check(item?.families ?? item?.family, "families", where);
        if (item?.concept != null) check(item.concept, "concepts", where);
        visitInlineConcepts(item, where);
      }
  }
  for (const kind of ["practice", "drills"]) for (const key of Object.keys(course[kind] || {}))
    if (!ids.concepts.has(key)) errors.push(`${kind}/${key}: unknown concept reference "${key}"`);
  return errors;
}

/** Return a map keyed by canonical id, preserving each definition's fields. */
export function curriculumMap(definitions) {
  return Object.fromEntries((definitions || []).map(value => [value.id || value.key, value]));
}

export const curriculumSignature = value => stable(value);
