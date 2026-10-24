/* One authored question shape for subsection checks and later practice.
 * Legacy text questions are adapted here, so every route uses one renderer. */
import { qid } from "./util.js";
import { checkValue, matchesResponse } from "./response-scoring.js";

export const QUESTION_METADATA = ["typeId", "skills", "routes", "scoreFor", "objectives", "families", "use", "group", "demonstrates", "help", "scopes", "contentVersion", "legacyContentVersion", "evidenceVersion", "organizationVersion", "schemaVersion", "standard", "demand", "support", "representation", "errors", "steps", "parentId", "stepId", "dependent", "quarantined", "authorId", "timing", "diagnosticsFor", "probes"];
export const questionMetadata = raw => Object.fromEntries(QUESTION_METADATA.filter(k => raw[k] !== undefined).map(k => [k, raw[k]]));
export const questionSkills = item => item.skills?.length ? item.skills : item.typeId ? [item.typeId] : [];
export const retentionKeyFor = item => questionSkills(item).length > 1 || item.routes?.length
  ? `joint:${item.id || item.itemId}` : item.typeId ? `type:${item.typeId}` : item.concept;
// Reviewed signatures suggest possible causes; they never prove a diagnosis.
export const questionErrorHypotheses = (item, value) => (item.errors || []).filter(error =>
  matchesResponse(error.match, value));
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

export const questionSignature = item => {
  const signature = item.contentVersion ? [item.prompt, item.response, item.tries, item.stimulus, item.contentVersion]
    : questionTries(item) === 1 ? [item.prompt, item.response] : [item.prompt, item.response, item.tries];
  return JSON.stringify(item.timing ? [...signature, item.timing] : signature);
};
export function shouldRestoreAttempt(prior, { context = "lesson", sessionId = null, restore = false, delayed = false, timed = false } = {}) {
  if (!prior) return false;
  const unfinishedTimed = timed && prior.timing && !prior.feedback?.recorded;
  const sameSession = context === "lesson" || !sessionId || prior.sessionId === sessionId;
  return !!unfinishedTimed || sameSession && (restore || delayed || !prior.feedback?.recorded);
}

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
  return checkValue(response, value);
}

export function practiceItems(C) {
  const current = Object.entries(C.practice || {}).flatMap(([key, bank]) => (bank.items || []).map((raw, i) =>
    normalizeQuestion(raw, { concept: key, id: `${key}:p${i + 1}` })));
  const legacy = Object.entries(C.drills || {}).flatMap(([key, bank]) => (bank.items || []).map((raw, i) =>
    normalizeQuestion(raw, { concept: key, id: `${key}:d${i + 1}` })));
  return [...current, ...legacy];
}
