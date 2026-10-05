/* Import-time attachment structure checks; tool validation also checks rendered
 * figure and TeX payloads before publication. */
import { questionStimuli } from "./questions.js";
export function checkStimulusShape(item, where, errors) {
  if (item.stimulus == null) return;
  const parts = questionStimuli(item.stimulus);
  const fail = message => errors.push(`${where}: ${message}`);
  if (!parts.length) fail("stimulus list must not be empty");
  for (const s of parts) {
    if (!s || typeof s !== "object" || Array.isArray(s)) { fail("stimulus must be an attachment mapping"); continue; }
    if (!["figure", "image", "passage", "code", "math", "table", "p", "note", "key", "def", "trap", "ex"].includes(s.t)) fail(`unsupported stimulus type ${s.t}`);
    if (s.t === "image" && (typeof s.src !== "string" || !s.src.startsWith("assets/") || s.src.split("/").includes("..") || typeof s.alt !== "string" || !s.alt.trim())) fail("stimulus image needs a local asset and alt text");
    if (s.t === "passage" && [s.text, s.source].some(x => typeof x !== "string" || !x.trim())) fail("stimulus passage needs text and source");
    if (s.t === "code" && (typeof s.src !== "string" || !s.src.trim())) fail("stimulus code needs src");
    if (s.t === "math" && (typeof s.tex !== "string" || !s.tex.trim())) fail("stimulus math needs tex");
    if (s.t === "figure" && (!s.spec || typeof s.spec !== "object" || Array.isArray(s.spec) || typeof s.kind !== "string")) fail("stimulus figure needs kind and spec");
    if (s.t === "table" && (!Array.isArray(s.head) || !s.head.length || !Array.isArray(s.rows) || !s.rows.length || s.rows.some(r => !Array.isArray(r) || r.length !== s.head.length))) fail("stimulus table needs head and matching rows");
  }
}
