/* Shared validation for authored response data and documentation examples. */
import { validateTiming } from "./question-timing.js";
import { checkFormulaResponse } from "./formula.js";
import { questionTries } from "./questions.js";
import { RESPONSE_KINDS, FIELD_KINDS, checkTextAnswer, checkScoring } from "./response-scoring.js";

export function checkResponse(item, where, errs) {
  validateTiming(item.timing, where, errs);
  try { questionTries(item); } catch (error) { errs.push(`${where}: ${error.message}`); }
  const r = item.response;
  if (!r) return; /* legacy free-response item */
  if (!RESPONSE_KINDS.includes(r.kind)) {
    errs.push(`${where}: response.kind must be single, multi, number, formula, self, text, or blanks`); return;
  }
  const responseKeys = { single: ["choices", "correct"], multi: ["choices", "correct"], number: ["value", "tolerance", "unit"],
    formula: ["answer", "variables", "solveFor", "independentVariable"], self: ["model", "mathSymbols", "formulaParsing"],
    text: ["accepted", "normalization"], blanks: ["fields"] };
  for (const key of Object.keys(r)) if (!["kind", "scoring", ...responseKeys[r.kind]].includes(key)) errs.push(`${where}: unknown response key ${key}`);
  if (r.kind === "text") checkTextAnswer(r, where, errs);
  if (r.kind === "blanks") {
    if (!Array.isArray(r.fields) || !r.fields.length || r.fields.length > 40) errs.push(`${where}: blanks needs 1–40 fields`);
    else {
      const ids = new Set();
      for (const field of r.fields) {
        if (!field || typeof field !== "object" || Array.isArray(field)) { errs.push(`${where}: blank field must be a mapping`); continue; }
        if (Object.keys(field).some(key => !["id", "label", "response"].includes(key))) errs.push(`${where}: unknown blank field key`);
        if (typeof field.id !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(field.id) || ids.has(field.id)) errs.push(`${where}: blank needs a distinct stable alphanumeric id`);
        ids.add(field.id);
        if (typeof field.label !== "string" || !field.label.trim()) errs.push(`${where}: blank needs a label`);
        if (!FIELD_KINDS.includes(field.response?.kind)) errs.push(`${where}: blank response must be text, number, single, or multi`);
        else checkResponse({ response: field.response }, `${where} blank ${field.id}`, errs);
      }
    }
  }
  checkScoring(r, where, errs);
  for (const field of ["mathSymbols", "formulaParsing"]) {
    if (r[field] != null && (r.kind !== "self" || typeof r[field] !== "boolean"))
      errs.push(`${where}: ${field} must be a boolean on a self response`);
  }
  if (r.kind === "formula") {
    try { checkFormulaResponse(r); } catch (error) { errs.push(`${where}: ${error.message}`); }
  }
  if (r.kind === "single" || r.kind === "multi") {
    if (!Array.isArray(r.choices)) {
      errs.push(`${where}: response.choices must be a list`); return;
    }
    r.choices.forEach((choice, i) => {
      if (!choice || typeof choice !== "object" || !String(choice.text || "").trim() || !String(choice.why || "").trim())
        errs.push(`${where}: choice ${i + 1} needs text and why`);
    });
    const correct = r.kind === "single" ? [r.correct] : r.correct;
    if (!Array.isArray(correct) || !correct.length ||
        correct.some(n => !Number.isInteger(n) || n < 1 || n > r.choices.length) ||
        new Set(correct).size !== correct.length)
      errs.push(`${where}: correct must name valid 1-based choice numbers`);
  }
  if (r.kind === "number" && (r.value == null || String(r.value).trim() === "" || !Number.isFinite(Number(r.value)) ||
      !Number.isFinite(Number(r.tolerance ?? 0)) || Number(r.tolerance ?? 0) < 0))
    errs.push(`${where}: numeric response needs a finite value and nonnegative tolerance`);
  if (r.kind === "self" && !String(r.model || "").trim())
    errs.push(`${where}: self-check response needs a model answer`);
}
