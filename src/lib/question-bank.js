/* Canonical question-bank bookkeeping, shared by disk and browser loaders.
 * Derived membership never changes ordered lesson placement or proves review. */
import { checkStimulusShape } from "./question-stimulus.js";
import { checkResponse } from "./question-schema.js";

const own = (map, id) => map && Object.hasOwn(map, id);
const dict = () => Object.create(null);
const mapping = x => x && typeof x === "object" && !Array.isArray(x);
const stable = x => JSON.stringify(x, (_, v) => mapping(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export const bankSignature = stable;
export function bankVersion(value) {
  let h = 2166136261;
  for (const c of stable(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return `bank-v1-${(h >>> 0).toString(16)}`;
}
export function readQuestionCollections(files, read, errors = []) {
  const result = { types: [], items: [], assessments: [], aliases: {} };
  for (const p of Object.keys(files).sort()) {
    const match = /^questions\/([^_][^.]*)\.(ya?ml|json)$/.exec(p);
    if (!match) continue;
    if (match[1] === "aliases") {
      const aliases = read(p);
      if (!mapping(aliases)) errors.push(`${p}: aliases must be a mapping`);
      else for (const [oldId, id] of Object.entries(aliases)) {
        if (Object.hasOwn(result.aliases, oldId)) errors.push(`${p}: duplicate alias ${oldId}`);
        else Object.defineProperty(result.aliases, oldId, { value: id, enumerable: true });
      }
      continue;
    }
    const key = match[1] === "types" ? "types" : match[1] === "assessment" ? "assessments" : "items";
    const data = read(p);
    if (!Array.isArray(data)) { errors.push(`${p}: must be a list`); continue; }
    result[key].push(...data);
  }
  return result;
}
export function resolveQuestionBank(C, source = {}, errors = []) {
  const types = dict(), bank = dict(), blueprints = dict(), subs = dict(), sections = new Set();
  const warnings = [];
  const fail = (where, message) => errors.push(`questions/${where}: ${message}`);
  const list = (value, where, required = false) => {
    if (value === undefined && !required) return [];
    if (!Array.isArray(value) || (required && !value.length) || value.some(x => typeof x !== "string" || !x.trim()) || new Set(value).size !== value.length) {
      fail(where, "must be a list of distinct nonempty IDs"); return [];
    }
    return value;
  };
  for (const section of C.sections || []) {
    sections.add(section.id);
    for (const sub of section.subs || []) subs[sub.id] = { sub, section };
  }
  const scopes = new Set(["course", ...sections, ...Object.keys(subs), ...Object.keys(C.cats || {})]);
  for (const raw of source.types || []) {
    if (!mapping(raw) || typeof raw.id !== "string" || !raw.id.trim()) { fail("types", "type needs a stable id"); continue; }
    const at = `types ${raw.id}`;
    if (types[raw.id]) { fail(at, "duplicate type ID"); continue; }
    if (typeof raw.task !== "string" || !raw.task.trim()) fail(at, "task is required");
    if (typeof raw.concept !== "string" || !own(C.concepts, raw.concept)) fail(at, `unknown concept ${raw.concept}`);
    const objectives = list(raw.objectives, `${at} objectives`, true);
    const families = list(raw.families, `${at} families`, true);
    for (const [ids, map, kind] of [[objectives, C.objectives, "objective"], [families, C.families, "family"]])
      for (const id of ids) if (!own(map, id)) fail(at, `unknown ${kind} ${id}`);
    const scoreFor = raw.scoreFor || (objectives.length === 1 ? objectives[0] : null);
    if (!scoreFor || !objectives.includes(scoreFor)) fail(at, "scoreFor must name one linked objective (required for multiple objectives)");
    if (raw.assess !== undefined && typeof raw.assess !== "boolean") fail(at, "assess must be boolean");
    const teach = list(raw.teach, `${at} teach`), scope = list(raw.scope, `${at} scope`);
    for (const id of teach) if (!subs[id] && !own(C.cats, id)) fail(at, `unknown teaching anchor ${id}`);
    for (const id of scope) if (!scopes.has(id)) fail(at, `unknown scope ${id}`);
    types[raw.id] = { ...raw, objectives, families, scoreFor, assess: raw.assess !== false,
      requires: list(raw.requires, `${at} requires`), diagnose: list(raw.diagnose, `${at} diagnose`), teach, scopes: [...scope] };
  }
  for (const raw of source.items || []) {
    if (!mapping(raw) || typeof raw.id !== "string" || !raw.id.trim()) { fail("bank", "item needs a stable id"); continue; }
    const at = `bank ${raw.id}`, type = types[raw.typeId];
    if (bank[raw.id]) { fail(at, "duplicate item ID"); continue; }
    if (!type) { fail(at, `unknown typeId ${raw.typeId}`); continue; }
    for (const key of ["concept", "objectives", "families", "scoreFor"])
      if (raw[key] !== undefined) fail(at, `${key} is inherited from the type; omit item metadata`);
    if (typeof raw.q !== "string" || !raw.q.trim() || !mapping(raw.response)) fail(at, "q and response are required");
    if (!["single", "multi", "number", "formula", "self"].includes(raw.response?.kind)) fail(at, "invalid response.kind");
    checkStimulusShape(raw, `questions/${at}`, errors);
    checkResponse(raw, `questions/${at}`, errors);
    const responseKeys = { single: ["choices", "correct"], multi: ["choices", "correct"], number: ["value", "tolerance"], formula: ["answer", "variables", "solveFor", "independentVariable"], self: ["model", "mathSymbols", "formulaParsing"] };
    for (const key of Object.keys(raw.response || {})) if (key !== "kind" && !(responseKeys[raw.response?.kind] || []).includes(key)) fail(at, `unknown response key ${key}`);
    const use = raw.use || "practice";
    if (!["practice", "diagnostic", "check"].includes(use)) fail(at, "use must be practice, diagnostic, or check");
    if (raw.group !== undefined && (typeof raw.group !== "string" || !raw.group.trim())) fail(at, "group must be nonempty text");
    const demonstrates = list(raw.demonstrates, `${at} demonstrates`);
    for (const id of demonstrates) if (!types[id] || id === type.id) fail(at, `invalid demonstrates type ${id}`);
    bank[raw.id] = { ...raw, type: raw.type || type.task, typeId: type.id, concept: type.concept,
      objectives: type.objectives, families: type.families, scoreFor: type.scoreFor,
      use, group: raw.group || `${type.id}:default`, demonstrates, contentVersion: bankVersion(raw) };
  }
  for (const { sub } of Object.values(subs)) sub.quiz = (sub.quiz || []).flatMap(raw => {
    if (typeof raw !== "string") return [raw];
    const item = bank[raw];
    if ((sub.quiz || []).filter(q => q === raw).length > 1) fail(`lesson ${sub.id}`, `duplicate quiz reference ${raw}`);
    if (!item) { fail(`lesson ${sub.id}`, `unknown quiz reference ${raw}`); return []; }
    if (item.use !== "practice") { fail(`lesson ${sub.id}`, `${raw} is reserved ${item.use}; cannot appear in quiz`); return []; }
    const type = types[item.typeId];
    if (!type.scopes.includes(sub.id)) type.scopes.push(sub.id);
    if (!type.teach.length && !type.derivedTeach) type.derivedTeach = [];
    if (type.derivedTeach && !type.derivedTeach.includes(sub.id)) type.derivedTeach.push(sub.id);
    return [item];
  });
  const visiting = new Set(), visited = new Set();
  const visit = id => {
    if (visiting.has(id)) { fail(`types ${id}`, "prerequisite cycle"); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of types[id].requires) {
      if (!types[dep]) fail(`types ${id}`, `unknown prerequisite ${dep}`); else visit(dep);
    }
    visiting.delete(id); visited.add(id);
  };
  for (const type of Object.values(types)) {
    visit(type.id);
    type.teach = type.teach.length ? type.teach : type.derivedTeach || [];
    delete type.derivedTeach;
    for (const anchor of type.teach) if (!type.scopes.includes(anchor)) type.scopes.push(anchor);
    for (const scope of [...type.scopes]) if (subs[scope] && !type.scopes.includes(subs[scope].section.id)) type.scopes.push(subs[scope].section.id);
    if (type.scopes.length && !type.scopes.includes("course")) type.scopes.push("course");
    const exception = own(source.reviewExceptions, type.id) ? source.reviewExceptions[type.id] : null;
    const validException = mapping(exception) && ["external-teaching", "assessment-only"].includes(exception.kind) && typeof exception.reason === "string" && exception.reason.trim();
    type.teachingStatus = type.teach.length ? "linked" : validException ? "reviewed-exception" : "unreviewed-exception";
    if (!type.teach.length && validException) type.teachingException = { kind: exception.kind, reason: exception.reason };
    if (type.teachingStatus === "unreviewed-exception") warnings.push(`questions/types ${type.id}: needs a teaching destination or reviewed external-teaching exception`);
    if (!type.scopes.length) fail(`types ${type.id}`, "unreachable type; declare scope or lesson placement");
    for (const id of type.diagnose) if (!bank[id] || bank[id].use !== "diagnostic") fail(`types ${type.id}`, `invalid diagnostic item ${id}`);
  }
  for (const item of Object.values(bank)) {
    const type = types[item.typeId];
    item.help = type.teach[0] || null; item.scopes = [...type.scopes];
    item.contentVersion = bankVersion({ item: source.items.find(q => q.id === item.id), type });
    if (item.use === "diagnostic" && !Object.values(types).some(t => t.diagnose.includes(item.id))) fail(`bank ${item.id}`, "diagnostic has no diagnostic link");
  }
  for (const raw of source.assessments || []) {
    if (!mapping(raw) || !scopes.has(raw.scope)) { fail("assessment", `unknown scope ${raw?.scope}`); continue; }
    const at = `assessment ${raw.scope}`;
    for (const key of Object.keys(raw)) if (!["scope", "criteria", "outcomes", "typeWeights", "target"].includes(key)) fail(at, `unknown assessment key ${key}`);
    if (blueprints[raw.scope]) { fail(at, "duplicate scope record"); continue; }
    if (typeof raw.criteria !== "string" || !raw.criteria.trim()) fail(at, "criteria is required");
    const candidates = Object.values(types).filter(t => t.assess && t.scopes.includes(raw.scope));
    const outcomeIds = [...new Set(candidates.map(t => t.scoreFor).filter(Boolean))];
    const overrides = mapping(raw.outcomes) ? raw.outcomes : {};
    if (raw.outcomes !== undefined && !mapping(raw.outcomes)) fail(at, "outcomes must be a sparse mapping");
    const weights = mapping(raw.typeWeights) ? raw.typeWeights : {};
    if (raw.typeWeights !== undefined && !mapping(raw.typeWeights)) fail(at, "typeWeights must be a mapping");
    for (const id of Object.keys(overrides)) if (!outcomeIds.includes(id)) fail(at, `unknown or unassessed outcome ${id}`);
    for (const id of Object.keys(weights)) if (!candidates.some(t => t.id === id)) fail(at, `unknown assessed type ${id}`);
    const weight = (value, where) => { if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) { fail(at, `${where} must be positive finite weight`); return 1; } return value; };
    const fraction = (value, where) => { if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) { fail(at, `${where} must be between 0 and 1`); return 0; } return value; };
    const outcomes = Object.fromEntries(outcomeIds.map(id => {
      const supplied = own(overrides, id) ? overrides[id] : {};
      if (!mapping(supplied)) fail(at, `${id} override must be a mapping`);
      const o = mapping(supplied) ? supplied : {};
      for (const key of Object.keys(o)) if (!["weight", "essential", "floor", "criteria"].includes(key)) fail(at, `unknown outcome override ${key}`);
      if (o.criteria !== undefined && (typeof o.criteria !== "string" || !o.criteria.trim())) fail(at, `${id} criteria must be nonempty text`);
      if (o.essential !== undefined && typeof o.essential !== "boolean") fail(at, `${id} essential must be boolean`);
      return [id, { id, weight: weight(o.weight ?? 1, id), essential: o.essential !== false,
        floor: fraction(o.floor ?? 0.80, `${id} floor`), criteria: o.criteria || raw.criteria, types: candidates.filter(t => t.scoreFor === id).map(t => t.id) }];
    }));
    const total = Object.values(outcomes).reduce((n, o) => n + o.weight, 0);
    const typeWeights = dict();
    for (const o of Object.values(outcomes)) {
      const values = o.types.map(id => weight(own(weights, id) ? weights[id] : 1, id));
      const sum = values.reduce((a, b) => a + b, 0);
      o.weight /= total;
      o.types.forEach((id, i) => { typeWeights[id] = o.weight * values[i] / sum; });
    }
    if (!candidates.length) fail(at, "no usable assessed types");
    for (const t of candidates) if (!Object.values(bank).some(q => q.typeId === t.id && q.use !== "diagnostic")) warnings.push(`questions/${at}: assessed type ${t.id} has no usable items`);
    const blueprint = { scope: raw.scope, criteria: raw.criteria, target: fraction(raw.target ?? 0.90, "target"), outcomes, typeWeights, types: candidates.map(t => t.id) };
    blueprint.version = bankVersion({ blueprint, types: candidates, items: Object.values(bank).filter(q => blueprint.types.includes(q.typeId)) });
    blueprints[raw.scope] = blueprint;
  }
  C.legacyQuestionAliases = dict();
  if (source.aliases !== undefined && !mapping(source.aliases)) fail("aliases", "must be a mapping");
  for (const [oldId, id] of Object.entries(mapping(source.aliases) ? source.aliases : {})) {
    if (!oldId.trim() || typeof id !== "string" || !bank[id]) fail("aliases", `unknown bank target ${id}`);
    else if (bank[oldId] && oldId !== id) fail("aliases", `alias ${oldId} conflicts with bank item`);
    else C.legacyQuestionAliases[oldId] = id;
  }
  C.questionAliases = Object.fromEntries(Object.values(bank).filter(q => q.authorId).map(q => [q.authorId, q.id]));
  if (Object.keys(C.questionAliases).length !== Object.values(bank).filter(q => q.authorId).length) fail("bank", "duplicate authorId alias");
  for (const item of Object.values(bank)) if (item.authorId && bank[item.authorId] && item.authorId !== item.id) fail(`bank ${item.id}`, "authorId conflicts with bank ID");
  C.questionBankWarnings = warnings;
  C.questionTypes = types; C.questionBank = bank; C.assessmentBlueprints = blueprints;
  return { types, bank, blueprints, errors, warnings };
}

/** Publication requires reviewable teaching and at least one actual assessment
 * candidate; an imported draft can still offer honest, limited practice. */
export function checkBankPublication(C, errors = []) {
  for (const type of Object.values(C.questionTypes || {})) {
    if (type.teachingStatus === "unreviewed-exception") errors.push(`questions/types ${type.id}: missing teaching destination requires a current reviewed exception`);
    if (type.assess && !Object.values(C.questionBank || {}).some(q => q.typeId === type.id && q.use !== "diagnostic")) errors.push(`questions/types ${type.id}: assessed type has no usable ordinary or check items`);
  }
  return errors;
}
