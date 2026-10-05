/* One authored question shape for subsection checks and later practice.
 * Legacy text questions are adapted here, so every route uses one renderer. */
import { qid } from "./util.js";

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
    why: raw.why || (raw.steps || []).map(s => `<p>${s}</p>`).join(""),
    stimulus: raw.stimulus || null,
    difficulty: raw.difficulty || null,
    verified: raw.verified || null,
    ...Object.fromEntries(["typeId", "scoreFor", "objectives", "families", "use", "group", "demonstrates", "help", "scopes", "contentVersion", "authorId"].filter(k => raw[k] !== undefined).map(k => [k, raw[k]]))
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
