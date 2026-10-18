/* One authored question shape for subsection checks and later practice.
 * Legacy text questions are adapted here, so every route uses one renderer. */
import { qid } from "./util.js";

export const QUESTION_METADATA = ["typeId", "skills", "routes", "scoreFor", "objectives", "families", "use", "group", "demonstrates", "help", "scopes", "contentVersion", "legacyContentVersion", "evidenceVersion", "organizationVersion", "schemaVersion", "standard", "demand", "support", "representation", "errors", "steps", "parentId", "stepId", "dependent", "quarantined", "authorId"];
export const questionMetadata = raw => Object.fromEntries(QUESTION_METADATA.filter(k => raw[k] !== undefined).map(k => [k, raw[k]]));
export const questionSkills = item => item.skills?.length ? item.skills : item.typeId ? [item.typeId] : [];
export const retentionKeyFor = item => questionSkills(item).length > 1 || item.routes?.length
  ? `joint:${item.id || item.itemId}` : item.typeId ? `type:${item.typeId}` : item.concept;
// Literal reviewed signatures are hints for feedback, never automatic diagnoses.
export const questionErrorHypotheses = (item, value) => (item.errors || []).filter(error =>
  typeof error.match === 'string' && String(value).trim() === error.match.trim());
export const questionSessionCurrent = (item, bank) => !item.typeId || !!bank?.[item.id] &&
  !bank[item.id].quarantined && bank[item.id].contentVersion === item.contentVersion &&
  (!item.evidenceVersion || bank[item.id].evidenceVersion === item.evidenceVersion);

// Selection protects variations needed by any active goal; each goal still
// computes readiness against its own complete assessment standard.
export function practiceRequirements(standards) {
  const representations = {}, integrations = new Map();
  for (const standard of standards.filter(Boolean)) {
    for (const [id, reps] of Object.entries(standard.requirements?.representations || {}))
      representations[id] = [...new Set([...(representations[id] || []), ...reps])];
    for (const skills of standard.requirements?.integrations || []) integrations.set([...skills].sort().join('|'), skills);
  }
  return { requirements: { representations, integrations: [...integrations.values()] } };
}

/* One attachment or an ordered sequence; old courses keep the same shape. */
export const questionStimuli = value => value == null ? [] : Array.isArray(value) ? value : [value];

export function questionHelpHref(cid, item, idx) {
  if (!item.help) return null;
  return `#/${cid}/${Object.hasOwn(idx?.CAT?.cats || {}, item.help) ? "cat/" : ""}${item.help}`;
}

export function questionTries(item) {
  const tries = item.tries === undefined ? 1 : item.tries;
  if (!Number.isSafeInteger(tries) || tries < 1) throw new Error("Question tries must be a positive integer.");
  return tries;
}

export const questionSignature = item => JSON.stringify(item.contentVersion
  ? [item.prompt, item.response, item.tries, item.stimulus, item.contentVersion]
  : questionTries(item) === 1 ? [item.prompt, item.response] : [item.prompt, item.response, item.tries]);

export function normalizeQuestion(raw, { subId = null, concept = null, id = null } = {}) {
  const answer = raw.response || (raw.a != null
    ? { kind: "self", model: raw.a }
    : { kind: "self", model: raw.answer || "" });
  return {
    id: id || raw.id || (subId ? qid(subId, raw.type) : null),
    subId, concept: raw.concept || concept,
    type: raw.type || raw.format || "Practice",
    prompt: raw.q || raw.stem || "",
    response: answer,
    tries: questionTries(raw),
    why: raw.why || (raw.steps || []).filter(s => typeof s === "string").map(s => `<p>${s}</p>`).join(""),
    stimulus: raw.stimulus || null,
    difficulty: raw.difficulty || null,
    verified: raw.verified || null,
    ...questionMetadata(raw)
  };
}

export function gradeQuestion(response, value) {
  if (response.kind === "self") return null;
  if (response.kind === "formula") throw new Error("Use the asynchronous formula checker for formula responses.");
  if (response.kind === "single") return Number(value) === Number(response.correct);
  if (response.kind === "multi") {
    const chosen = new Set(value || []);
    const correct = new Set(response.correct || []);
    return chosen.size === correct.size && [...chosen].every(x => correct.has(x));
  }
  if (response.kind === "number") {
    const n = Number(value);
    const target = Number(response.value);
    const rounding = Number.EPSILON * Math.max(1, Math.abs(target)) * 8;
    return String(value).trim() !== "" && Number.isFinite(n) &&
      Math.abs(n - target) <= Number(response.tolerance || 0) + rounding;
  }
  throw new Error(`Unknown response kind: ${response.kind}`);
}

export function practiceItems(C) {
  const current = Object.entries(C.practice || {}).flatMap(([key, bank]) => (bank.items || []).map((raw, i) =>
    normalizeQuestion(raw, { concept: key, id: `${key}:p${i + 1}` })));
  const legacy = Object.entries(C.drills || {}).flatMap(([key, bank]) => (bank.items || []).map((raw, i) =>
    normalizeQuestion(raw, { concept: key, id: `${key}:d${i + 1}` })));
  return [...current, ...legacy];
}
