/* One authored question shape for subsection checks and later practice.
 * Legacy text questions are adapted here, so every route uses one renderer. */
import { qid } from "./util.js";

export function normalizeQuestion(raw, { subId = null, concept = null, id = null } = {}) {
  const answer = raw.response || (raw.a != null
    ? { kind: "self", model: raw.a }
    : { kind: "self", model: raw.answer || "" });
  return {
    id: id || (subId ? qid(subId, raw.type) : raw.id),
    subId, concept: raw.concept || concept,
    type: raw.type || raw.format || "Practice",
    prompt: raw.q || raw.stem || "",
    response: answer,
    why: raw.why || (raw.steps || []).map(s => `<p>${s}</p>`).join(""),
    stimulus: raw.stimulus || null,
    difficulty: raw.difficulty || null,
    verified: raw.verified || null
  };
}

export function gradeQuestion(response, value) {
  if (response.kind === "self") return null;
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
