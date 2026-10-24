/* Bounded response checkers. Points describe task criteria, never mastery. */
const mapping = value => value && typeof value === "object" && !Array.isArray(value);
const nonempty = value => typeof value === "string" && value.trim().length > 0;
export const RESPONSE_KINDS = ["single", "multi", "number", "formula", "self", "text", "blanks"];
export const FIELD_KINDS = ["single", "multi", "number", "text"];
export const MAX_RESPONSE_BYTES = 16384;
export function assertResponseSize(value) {
  if (new TextEncoder().encode(JSON.stringify(value) ?? "").length > MAX_RESPONSE_BYTES) throw new Error("Answer is too large to save; use at most 16 KiB.");
}
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

export function normalizeAcceptedText(value, normalization = {}) {
  if (!mapping(normalization)) normalization = {};
  let text = String(value ?? "");
  if (normalization.trim === true) text = text.trim();
  if (normalization.caseSensitive === false) text = text.toLowerCase();
  return text;
}
export const responseKey = value => JSON.stringify(value, (_, entry) => mapping(entry)
  ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry);
export function hasResponse(response, value) {
  if (response.kind === "blanks") return mapping(value) && response.fields.every(field => hasResponse(field.response, value[field.id]));
  return response.kind === "multi" ? Array.isArray(value) && value.length > 0 : value != null && String(value).trim() !== "";
}
export function initialResponse(response) {
  if (response.kind === "multi") return [];
  if (response.kind === "blanks") return Object.fromEntries(response.fields.map(field => [field.id, initialResponse(field.response)]));
  return "";
}
export function matchesResponse(match, value) {
  if (mapping(match) && match.field) {
    value = mapping(value) ? value[match.field] : undefined;
    match = { ...match, field: undefined };
  }
  if (typeof match === "string") return String(value).trim() === match.trim();
  if (!mapping(match)) return false;
  if (match.kind === "choice") return ["string", "number"].includes(typeof value) && (match.values || [match.value]).includes(Number(value)) && String(value).trim() !== "";
  if (match.kind === "choice-set") {
    if (!Array.isArray(value) || new Set(value).size !== value.length) return false;
    const chosen = new Set(value), expected = new Set(match.values);
    return chosen.size === expected.size && [...chosen].every(n => expected.has(n));
  }
  if (match.kind === "number") {
    const n = Number(value), target = Number(match.value);
    return ["string", "number"].includes(typeof value) && String(value ?? "").trim() !== "" && Number.isFinite(n) && Math.abs(n-target) <= (match.tolerance || 0) + Number.EPSILON*Math.max(1, Math.abs(target))*8;
  }
  if (match.kind === "text") return typeof value === "string" && match.accepted.some(answer => normalizeAcceptedText(value, match.normalization) === normalizeAcceptedText(answer, match.normalization));
  return false;
}
export function checkValue(response, value) {
  if (response.kind === "self") return null;
  if (response.kind === "formula") throw new Error("Use the asynchronous formula checker for formula responses.");
  if (response.kind === "single") return matchesResponse({ kind: "choice", value: response.correct }, value);
  if (response.kind === "multi") return matchesResponse({ kind: "choice-set", values: response.correct }, value);
  if (response.kind === "number") return matchesResponse({ kind: "number", value: response.value, tolerance: response.tolerance }, value);
  if (response.kind === "text") return matchesResponse({ kind: "text", accepted: response.accepted, normalization: response.normalization }, value);
  if (response.kind === "blanks") return mapping(value) && Object.keys(value).every(id => response.fields.some(f => f.id === id)) && response.fields.every(field => checkValue(field.response, value[field.id]) === true);
  throw new Error(`Unknown response kind: ${response.kind}`);
}
export function scoreResponse(response, value, correctness) {
  const correct = correctness === undefined ? checkValue(response, value) : correctness;
  const gradeSource = response.kind === "self" ? "self" : "deterministic-checker";
  const criteria = response.scoring?.criteria?.map(criterion => {
    const observed = criterion.field ? value?.[criterion.field] : value;
    const field = criterion.field && response.fields?.find(f => f.id === criterion.field);
    const answered = observed != null && (Array.isArray(observed) ? observed.length > 0 : String(observed).trim() !== "");
    const result = answered ? matchesResponse(criterion.match, observed) : null;
    return { id: criterion.id, field: field?.id, correct: result, score: result ? criterion.points : 0,
      maxScore: criterion.points, skills: criterion.skills || [] };
  }) || (response.kind === "blanks" ? response.fields.map(field => ({
    id: field.id, field: field.id, correct: hasResponse(field.response, value?.[field.id]) ? checkValue(field.response, value[field.id]) : null,
    score: checkValue(field.response, value?.[field.id]) === true ? 1 : 0, maxScore: 1, skills: []
  })) : []);
  return { correct, gradeSource, score: criteria.length ? criteria.reduce((n, c) => n+c.score, 0) : Number(correct === true),
    maxScore: criteria.length ? criteria.reduce((n, c) => n+c.maxScore, 0) : 1, criteria };
}
export function submissionObservation(index, response, value, { correct, submittedAt = Date.now(), assisted = false } = {}) {
  assertResponseSize(value);
  return { index, value: clone(value), submittedAt, assisted, ...scoreResponse(response, value, correct) };
}

function checkNormalization(value, fail) {
  if (value === undefined) return;
  if (!mapping(value) || Object.keys(value).some(key => !["trim", "caseSensitive"].includes(key)) || Object.values(value).some(v => typeof v !== "boolean")) fail("normalization accepts only boolean trim and caseSensitive");
}
export function checkMatcher(match, where, errors, response) {
  const fail = message => errors.push(`${where}: ${message}`);
  if (typeof match === "string") return;
  if (!mapping(match)) { fail("match must be a literal string or typed matcher"); return; }
  const keys = { choice: ["kind", "value", "values"], "choice-set": ["kind", "values"], number: ["kind", "value", "tolerance"], text: ["kind", "accepted", "normalization"] }[match.kind];
  if (!keys || Object.keys(match).some(key => key !== "field" && !keys.includes(key))) { fail("invalid typed match kind or fields"); return; }
  if (match.field !== undefined && (typeof match.field !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(match.field))) fail("match field needs a stable blank id");
  if (match.kind === "choice" || match.kind === "choice-set") {
    const values = match.values ?? [match.value];
    if (match.value !== undefined && match.values !== undefined || !Array.isArray(values) || !values.length || values.length > 100 || values.some(v => !Number.isSafeInteger(v) || v < 1) || new Set(values).size !== values.length) fail("choice match needs distinct positive choice numbers");
  }
  if (match.kind === "number" && (typeof match.value !== "number" || !Number.isFinite(match.value) || match.tolerance !== undefined && (typeof match.tolerance !== "number" || !Number.isFinite(match.tolerance) || match.tolerance < 0))) fail("number match needs finite value and nonnegative tolerance");
  if (match.kind === "text") checkTextAnswer(match, where, errors);
  if (response) {
    if (match.field) {
      if (response.kind !== "blanks" || !(Array.isArray(response.fields) && response.fields.some(f => f.id === match.field))) fail("match field must name a declared blank");
      response = (Array.isArray(response.fields) && response.fields.find(f => f.id === match.field)?.response) || response;
    }
    const expected = { single: "choice", multi: "choice-set", number: "number", text: "text" }[response.kind];
    if (expected !== match.kind) fail("match kind must agree with the response kind");
    if (["choice", "choice-set"].includes(match.kind) && (match.values || [match.value]).some(n => n > (response.choices?.length || 0))) fail("match names an unavailable choice");
  }
}
export function checkTextAnswer(response, where, errors) {
  const fail = message => errors.push(`${where}: ${message}`);
  if (!Array.isArray(response.accepted) || !response.accepted.length || response.accepted.length > 100 || response.accepted.some(a => !nonempty(a) || a.length > 4000)) fail("accepted must list 1–100 nonempty complete answers of at most 4000 characters");
  checkNormalization(response.normalization, fail);
  if (Array.isArray(response.accepted) && response.accepted.every(a => typeof a === "string") && new Set(response.accepted.map(a => normalizeAcceptedText(a, response.normalization))).size !== response.accepted.length) fail("accepted contains duplicate normalized answers");
}
export function checkScoring(response, where, errors) {
  if (response.scoring === undefined) return;
  const fail = message => errors.push(`${where}: ${message}`), scoring = response.scoring;
  if (response.kind === "self") { fail("self responses cannot declare checked scoring criteria"); return; }
  if (!mapping(scoring) || Object.keys(scoring).some(key => key !== "criteria") || !Array.isArray(scoring.criteria) || !scoring.criteria.length || scoring.criteria.length > 100) { fail("scoring needs 1–100 criteria"); return; }
  const ids = new Set();
  for (const criterion of scoring.criteria) {
    if (!mapping(criterion)) { fail("criterion must be a mapping"); continue; }
    if (Object.keys(criterion).some(key => !["id", "field", "match", "points", "skills"].includes(key))) fail("unknown criterion key");
    if (!nonempty(criterion.id) || ids.has(criterion.id)) fail("criterion needs a distinct stable id");
    ids.add(criterion.id);
    if (typeof criterion.points !== "number" || !Number.isFinite(criterion.points) || criterion.points <= 0 || criterion.points > 1000) fail("criterion points must be >0 and <=1000");
    if (criterion.field !== undefined && (response.kind !== "blanks" || !(Array.isArray(response.fields) && response.fields.some(field => field.id === criterion.field)))) fail("criterion field must name a declared blank");
    if (response.kind === "blanks" && criterion.field === undefined) fail("blank criterion needs a field");
    if (criterion.skills !== undefined && (!Array.isArray(criterion.skills) || criterion.skills.some(id => !nonempty(id)) || new Set(criterion.skills).size !== criterion.skills.length)) fail("criterion skills must list distinct nonempty IDs");
    if (criterion.match?.field !== undefined) fail("criterion uses field on the criterion, not inside match");
    checkMatcher(criterion.match, `${where} criterion ${criterion.id}`, errors, criterion.field ? (Array.isArray(response.fields) && response.fields.find(f => f.id === criterion.field)?.response) : response);
  }
}

export const validateMatcher = checkMatcher;

export function responseAnswerText(response) {
  if (response.kind === "text") return response.accepted.join("; ");
  if (response.kind === "blanks") return response.fields.map(field => `${field.label}: ${responseAnswerText(field.response)}`).join("\n");
  if (response.kind === "number") return `${response.value}${response.unit ? ` ${response.unit}` : ""}`;
  if (response.kind === "single") return response.choices?.[response.correct-1]?.text || "";
  if (response.kind === "multi") return response.correct.map(n => response.choices?.[n-1]?.text || "").join("; ");
  return response.kind === "self" ? response.model : response.answer || "";
}
