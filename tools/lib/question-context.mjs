/* A question that points outside its card cannot travel safely into Review or
 * Mixed Practice. This catches explicit deictic references; a question that
 * introduces and describes its own figure, table, or passage stays valid. */
const OBJECT = "(?:figure|chart|graph|plot|scatter\\s*plot|scatterplot|table|passage|excerpt|text)";
const REFERENCE = new RegExp(`\\b(?:the|this|that|above|below|following|preceding|shown|given)\\s+(?:(?:scatter|line|bar|data|quoted|reading)\\s+)?${OBJECT}\\b|\\b(?:figure|chart|graph|plot|scatter\\s*plot|scatterplot|table|passage|excerpt)\\s+\\d+(?:\\.\\d+)?\\b`, "i");
const DESCRIBED = new RegExp(`\\b${OBJECT}\\b[\\s\\S]{0,45}\\b(?:shows?|plots?|lists?|contains?|reports?|states?|describes?|reads?)\\b[\\s\\S]{12,}`, "i");

export function questionContextWarning(item, where) {
  if (item?.stimulus) return null;
  const prompt = String(item?.q || item?.prompt || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  if (!REFERENCE.test(prompt) || DESCRIBED.test(prompt)) return null;
  return `${where}: refers to a figure, table, or passage without stimulus — attach it, or make the prompt self-contained`;
}
