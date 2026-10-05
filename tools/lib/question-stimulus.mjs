/* Attachments reuse lesson renderers, but never lesson depth or saved state. */
import { questionStimuli } from "../../src/lib/questions.js";
import { checkFigure } from "./figures.mjs";
import { tex } from "./math.mjs";

const CARDS = new Set(["note", "key", "def", "trap", "ex"]);
export function stimulusHtml(s) {
  if (!s || typeof s !== "object") return [];
  return [s.text, s.source, s.h, s.label, s.term, s.title, s.cap, s.credit, s.note,
    ...(Array.isArray(s.core) ? s.core : [s.core]), s.gist,
    ...(Array.isArray(s.items) ? s.items : []),
    ...(Array.isArray(s.head) ? s.head : []),
    ...(Array.isArray(s.rows) ? s.rows.flat() : [])];
}

export function checkStimulus(item, where, errs, assetExists) {
  if (item.stimulus == null) return;
  const parts = questionStimuli(item.stimulus);
  if (!parts.length) errs.push(`${where}: stimulus list must not be empty`);
  parts.forEach((s, i) => {
    const at = `${where} stimulus ${i + 1}`;
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      errs.push(`${at}: must be an attachment mapping`); return;
    }
    if (s.t === "figure") checkFigure(s, at, errs);
    else if (s.t === "image") {
      if (!String(s.alt || "").trim()) errs.push(`${at}: stimulus image needs alt text`);
      if (typeof s.src !== "string" || !s.src.startsWith("assets/") ||
          s.src.split("/").includes("..") || !assetExists(s.src))
        errs.push(`${at}: missing stimulus image asset "${s.src}"`);
    } else if (s.t === "passage") {
      if (!String(s.text || "").trim() || !String(s.source || "").trim())
        errs.push(`${at}: passage needs text and source`);
    } else if (s.t === "code") {
      if (typeof s.src !== "string" || !s.src.trim()) errs.push(`${at}: code needs src`);
    } else if (s.t === "math") {
      if (typeof s.tex !== "string" || !s.tex.trim()) errs.push(`${at}: math needs tex`);
      else try { tex(s.tex, true); } catch (e) { errs.push(`${at}: invalid math: ${e.message}`); }
    } else if (s.t === "table") {
      if (!Array.isArray(s.head) || !s.head.length || !Array.isArray(s.rows) || !s.rows.length ||
          s.rows.some(r => !Array.isArray(r) || r.length !== s.head.length))
        errs.push(`${at}: table needs head and matching rows`);
    } else if (s.t === "p" || CARDS.has(s.t)) {
      if (![s.h, s.core].some(v => typeof v === "string" && v.trim()) &&
          !(Array.isArray(s.core) && s.core.length) && !(Array.isArray(s.items) && s.items.length))
        errs.push(`${at}: ${s.t} needs prose or items`);
      for (const key of ["items", "core"]) if (Array.isArray(s[key]) && s[key].some(v => typeof v !== "string"))
        errs.push(`${at}: ${key} must contain strings`);
    } else errs.push(`${at}: unsupported stimulus type "${s.t}" — use passage, p, figure, image, code, table, math, note, key, def, trap, or ex`);
  });
}
