import { allocateOutcomeWeights } from "./outcome-weights.js";

export const MASTERY_SCHEMA_VERSION = 1;
export const MASTERY_CAPABILITIES = Object.freeze({ "mastery.targets": 1, "mastery.policies": 1 });
const map = x => x !== null && typeof x === "object" && !Array.isArray(x);
const text = x => typeof x === "string" && !!x.trim();
const level = x => Number.isInteger(x) && x >= 1 && x <= 7;
const positive = x => typeof x === "number" && Number.isFinite(x) && x > 0;
const own = (x, id) => x != null && Object.hasOwn(x, id);
const policyRange = { P3: [1, 3, 2, 1], P45: [4, 5, 3, 2], P67: [6, 7, 4, 2] };

function validator(errors) {
  const fail = (at, message) => errors.push(`mastery/${at}: ${message}`);
  const shape = (value, keys, at) => {
    if (!map(value)) { fail(at, "must be a mapping"); return false; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) fail(at, `unknown key ${key}`);
    return true;
  };
  const ids = (value, at) => {
    if (!Array.isArray(value) || !value.length || value.some(x => !text(x)) || new Set(value).size !== value.length) {
      fail(at, "must list distinct nonempty IDs"); return [];
    }
    return value;
  };
  const catalog = (value, at) => {
    if (!Array.isArray(value) || !value.length) { fail(at, "must be a nonempty list"); return []; }
    const seen = new Set();
    return value.filter(item => {
      if (!map(item) || !text(item.id)) { fail(at, "entry needs a stable id"); return false; }
      if (seen.has(item.id)) { fail(at, `duplicate id ${item.id}`); return false; }
      seen.add(item.id); return true;
    });
  };
  return { fail, shape, ids, catalog };
}

/** Unsupported required capabilities fail closed; optional gaps stay explicit.
    This validates declarations only and never establishes evaluator trust. */
export function validateMasteryManifest(value, errors = [], supported = MASTERY_CAPABILITIES) {
  const start = errors.length, { fail, shape } = validator(errors);
  if (!shape(value, ["schemaVersion", "required", "optional"], "capabilities")) return null;
  if (value.schemaVersion !== MASTERY_SCHEMA_VERSION) fail("capabilities", "unsupported schemaVersion; update the reader or course");
  const unavailable = [];
  for (const key of ["required", "optional"]) {
    const entries = value[key] ?? {};
    if (!map(entries)) { fail("capabilities", `${key} must map capability IDs to versions`); continue; }
    for (const [id, version] of Object.entries(entries)) {
      if (!text(id) || !Number.isInteger(version) || version < 1) fail("capabilities", `invalid version for ${id}`);
      if (key === "optional" && own(value.required, id)) fail("capabilities", `${id} cannot be both required and optional`);
      if (!own(supported, id) || supported[id] !== version) {
        if (key === "required") fail("capabilities", `unsupported required capability ${id}@${version}; update the reader or course`);
        else unavailable.push({ id, version });
      }
    }
  }
  return errors.length === start ? { ...value, unavailable } : null;
}

/** Pure opt-in compiler. C supplies canonical objectives and resolved native
    questionSkills (questionTypes for legacy callers); no loader or state writes.
    Invalid definitions produce no usable index, even if the caller keeps errors. */
export function compileMastery(C, source, errors = [], supported = MASTERY_CAPABILITIES) {
  if (source === undefined) return null;
  const start = errors.length, { fail, shape, ids, catalog } = validator(errors);
  if (!shape(source, ["manifest", "targets", "policies"], "source")) return null;
  const manifest = validateMasteryManifest(source.manifest, errors, supported);
  for (const id of Object.keys(MASTERY_CAPABILITIES))
    if (source.manifest?.required?.[id] !== 1) fail("capabilities", `declare ${id}@1 as required`);
  for (const [name, key] of [["targets", "roots"], ["policies", "policies"]]) {
    if (!shape(source[name], ["schemaVersion", key], name)) continue;
    if (source[name].schemaVersion !== MASTERY_SCHEMA_VERSION) fail(name, "unsupported schemaVersion; update the reader or course");
  }
  const policies = Object.create(null), roots = Object.create(null), skills = C.questionSkills ?? C.questionTypes ?? {};
  for (const raw of catalog(source.policies?.policies, "policies")) {
    const at = `policy ${raw.id}`;
    shape(raw, ["id", "version", "minGroups", "minSessions", "noncriticalFloor", "delayDays", "unfamiliarConstraint", "criteria", "entails"], at);
    const range = own(policyRange, raw.id) ? policyRange[raw.id] : null;
    if (!range) fail(at, "unknown policy; use P3, P45 or P67");
    if (!Number.isInteger(raw.version) || raw.version < 1) fail(at, "version must be a positive integer");
    for (const [key, floor] of [["minGroups", range?.[2]], ["minSessions", range?.[3]]])
      if (!Number.isInteger(raw[key]) || raw[key] < (floor ?? 1)) fail(at, `${key} is below the policy minimum`);
    if (raw.noncriticalFloor !== .8) fail(at, "noncriticalFloor must be 0.8; critical criteria always all pass");
    if (!Array.isArray(raw.delayDays) || !raw.delayDays.length || raw.delayDays.some((day, i, xs) => !positive(day) || (i > 0 && day <= xs[i - 1]))) fail(at, "delayDays must be increasing positive elapsed-day intervals after qualifying evidence/repair");
    if (typeof raw.unfamiliarConstraint !== "boolean" || (raw.id === "P67" && !raw.unfamiliarConstraint)) fail(at, "unfamiliarConstraint must be boolean and required for P67");
    const criteria = Object.create(null);
    for (const criterion of catalog(raw.criteria, `${at} criteria`)) {
      shape(criterion, ["id", "standard", "critical"], `${at} criterion ${criterion.id}`);
      if (!text(criterion.standard) || typeof criterion.critical !== "boolean") fail(at, "criteria need a standard and explicit critical boolean");
      criteria[criterion.id] = { ...criterion };
    }
    const entails = raw.entails ?? [], pairs = new Set();
    if (!Array.isArray(entails)) fail(at, "entails must list explicit {from, to} anchor rules");
    else for (const rule of entails) {
      if (!shape(rule, ["from", "to"], `${at} entails`)) continue;
      if (!level(rule.from) || !level(rule.to) || rule.from <= rule.to) fail(at, "entailment must descend between valid anchors");
      const key = `${rule.from}:${rule.to}`;
      if (pairs.has(key)) fail(at, "duplicate entailment");
      pairs.add(key);
    }
    policies[raw.id] = { ...raw, criteria, entails: Array.isArray(entails) ? entails.map(x => ({ ...x })) : [] };
  }
  const skillRoots = Object.create(null), outcomeRoots = Object.create(null);
  for (const raw of catalog(source.targets?.roots, "targets")) {
    const at = `root ${raw.id}`;
    shape(raw, ["id", "label", "semanticVersion", "requiredAnchor", "importance", "skills", "scoreFor", "targetOwnerModule", "claimRequirement", "policy", "anchors", "facets"], at);
    for (const key of ["label", "targetOwnerModule"]) if (!text(raw[key])) fail(at, `${key} is required`);
    if (!Number.isInteger(raw.semanticVersion) || raw.semanticVersion < 1) fail(at, "semanticVersion must be a positive integer");
    if (!level(raw.requiredAnchor)) fail(at, "requiredAnchor must be an integer 1–7");
    if (!Number.isInteger(raw.importance) || raw.importance < 1 || raw.importance > 10) fail(at, "importance must be an integer 1–10");
    if (!["none", "historical-evidence"].includes(raw.claimRequirement)) fail(at, "claimRequirement must explicitly be none or historical-evidence; authored achievement is forbidden");
    if (!text(raw.scoreFor) || !own(C.objectives, raw.scoreFor)) fail(at, `unknown scoring objective ${raw.scoreFor}`);
    const linked = ids(raw.skills, `${at} skills`);
    for (const id of linked) {
      if (!own(skills, id)) { fail(at, `unknown native skill ${id}`); continue; }
      if (skills[id].scoreFor !== raw.scoreFor) fail(at, `contradictory scoring ownership for skill ${id}; split separately observed attribution instead`);
      (skillRoots[id] ??= []).push(raw.id);
    }
    const policy = policies[raw.policy], range = own(policyRange, raw.policy) ? policyRange[raw.policy] : null;
    if (!policy) fail(at, `unknown policy ${raw.policy}`);
    if (range && (raw.requiredAnchor < range[0] || raw.requiredAnchor > range[1])) fail(at, "policy does not match required anchor");
    const facets = Object.create(null);
    for (const facet of catalog(raw.facets, `${at} facets`)) {
      const where = `${at} facet ${facet.id}`;
      shape(facet, ["id", "standard", "skills", "anchors"], where);
      if (!text(facet.standard)) fail(where, "standard is required");
      const facetSkills = ids(facet.skills, `${where} skills`);
      for (const id of facetSkills) if (!linked.includes(id)) fail(where, `dangling native skill ${id}`);
      const anchors = Object.create(null);
      if (!Array.isArray(facet.anchors) || !facet.anchors.length) fail(where, "anchors must be a nonempty list");
      else for (const anchor of facet.anchors) {
        if (!shape(anchor, ["level", "standard", "criteria"], `${where} anchor`)) continue;
        if (!level(anchor.level) || own(anchors, anchor.level)) fail(where, "invalid or duplicate anchor");
        if (!text(anchor.standard)) fail(where, "anchor standard is required");
        for (const id of ids(anchor.criteria, `${where} criteria`)) if (!own(policy?.criteria, id)) fail(where, `unknown policy criterion ${id}`);
        anchors[anchor.level] = { ...anchor, criteria: Array.isArray(anchor.criteria) ? [...anchor.criteria] : [] };
      }
      facets[facet.id] = { ...facet, skills: facetSkills, anchors };
    }
    const anchors = Object.create(null);
    if (!Array.isArray(raw.anchors) || !raw.anchors.length) fail(at, "anchors must be a nonempty list");
    else for (const anchor of raw.anchors) {
      if (!shape(anchor, ["level", "standard", "facets"], `${at} anchor`)) continue;
      if (!level(anchor.level) || own(anchors, anchor.level)) fail(at, "invalid or duplicate anchor");
      if (!text(anchor.standard)) fail(at, "anchor standard is required");
      for (const id of ids(anchor.facets, `${at} anchor facets`))
        if (!own(facets, id) || !own(facets[id].anchors, anchor.level)) fail(at, `dangling facet/anchor ${id}@${anchor.level}`);
      anchors[anchor.level] = { ...anchor, facets: Array.isArray(anchor.facets) ? [...anchor.facets] : [] };
    }
    if (!own(anchors, raw.requiredAnchor)) fail(at, "required anchor is not defined");
    for (const facet of Object.values(facets)) for (const n of Object.keys(facet.anchors))
      if (!anchors[n]?.facets.includes(facet.id)) fail(at, `unused facet anchor ${facet.id}@${n}`);
    (outcomeRoots[raw.scoreFor] ??= []).push(raw.id);
    roots[raw.id] = { ...raw, skills: linked, facets, anchors };
  }
  const budgets = Object.fromEntries(Object.keys(outcomeRoots).map(id => [id, C.objectives?.[id]?.importance ?? 1]));
  for (const [id, weight] of Object.entries(budgets)) if (!positive(weight)) fail("targets", `objective ${id} importance must be positive finite weight`);
  if (errors.length !== start) return null;
  const allocation = allocateOutcomeWeights(Object.values(roots).map(root => ({ id: root.id, scoreFor: root.scoreFor, importance: root.importance ** 2 })), budgets);
  return { schemaVersion: 1, manifest, roots, policies, skillRoots, outcomeRoots,
    outcomeWeights: allocation.outcomes, rootWeights: allocation.weights };
}
