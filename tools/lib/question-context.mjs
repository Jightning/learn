/* A question that points outside its card cannot travel safely into Review or
 * Mixed Practice. This catches explicit deictic references; a question that
 * introduces and describes its own figure, table, or passage stays valid. */
const OBJECT = "(?:figure|chart|graph|plot|scatter\\s*plot|scatterplot|table|passage|excerpt|text)";
const REFERENCE = new RegExp(`\\b(?:the|this|that|above|below|following|preceding|shown|given)\\s+(?:(?:scatter|line|bar|data|quoted|reading)\\s+)?${OBJECT}\\b|\\b(?:figure|chart|graph|plot|scatter\\s*plot|scatterplot|table|passage|excerpt)\\s+\\d+(?:\\.\\d+)?\\b`, "i");
const DESCRIBED = new RegExp(`\\b${OBJECT}\\b[\\s\\S]{0,45}\\b(?:shows?|plots?|lists?|contains?|reports?|states?|describes?|reads?)\\b[\\s\\S]{12,}`, "i");

/* A bounded lexical warning for repeated authored setup, not a semantic proof.
 * Ignore quoted passages, diagrams and short shared labels; never hide text. */
function repeatsSetup(item) {
  const words = text => (String(text || "").replace(/<[^>]*>/g, " ")
    .replace(/\\(?:mathrm|text)\{([^}]+)\}/g, "$1").replace(/\\[a-z]+/gi, " ")
    .toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).slice(0, 512);
  const prompt = words(item?.q || item?.prompt);
  if (prompt.length < 20) return false;
  const stimuli = Array.isArray(item.stimulus) ? item.stimulus : [item.stimulus];
  return stimuli.filter(part => part?.t === "p").some(part => {
    const setup = words(part.h);
    if (setup.length < 20) return false;
    const counts = new Map();
    for (const word of setup) counts.set(word, (counts.get(word) || 0) + 1);
    let shared = 0;
    for (const word of prompt) if (counts.get(word)) {
      shared++; counts.set(word, counts.get(word) - 1);
    }
    if (shared / Math.min(setup.length, prompt.length) < .75) return false;
    const phrases = new Set(setup.slice(4).map((_, i) => setup.slice(i, i + 5).join(" ")));
    return prompt.slice(4).some((_, i) => phrases.has(prompt.slice(i, i + 5).join(" ")));
  });
}

export function questionContextWarning(item, where) {
  if (repeatsSetup(item)) return `${where}: prose stimulus may repeat substantial setup from the prompt — review the combined question and state each given once`;
  const stimuli = Array.isArray(item?.stimulus) ? item.stimulus : [item?.stimulus];
  const prose = [item?.q || item?.prompt, item?.why, ...stimuli.filter(part => part?.t === "p").map(part => part.h)];
  if (prose.some(text => /\p{L}<m>\p{L}[^<]*=/u.test(String(text || "")
    .replace(/<(?:code|pre)\b[^>]*>[\s\S]*?<\/(?:code|pre)>/gi, " ").replace(/`[^`\n]+`/g, " "))))
    return `${where}: math markup splits a name across text and math — put the complete symbol and expression inside one math span`;
  if (item?.stimulus) return null;
  const prompt = String(item?.q || item?.prompt || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  if (!REFERENCE.test(prompt) || DESCRIBED.test(prompt)) return null;
  return `${where}: refers to a figure, table, or passage without stimulus — attach it, or make the prompt self-contained`;
}

/** A compact author view of judgments that cannot be safely inferred from text. */
export function skillAuthorContext(skill, items = []) {
  const siblings = items.filter(q => (q.skills || [q.typeId]).includes(skill.id));
  return {
    standard: skill.standard || null,
    teaching: skill.teach || [],
    derived: skill.derived || {},
    siblings: siblings.map(q => ({ id: q.id, skills: q.skills || [q.typeId], demand: q.demand || "standard",
      support: q.support || [], group: q.group || null, representation: q.representation || null,
      routes: q.routes || [], steps: (q.steps || []).map(s => ({ id: s.id, skills: s.skills })) })),
    reviewQuestions: [
      "Which capabilities must the learner exercise independently?",
      "Does the wording or placement supply a method or intermediate result?",
      "Can a different valid solution route avoid any declared skill?",
      "Do siblings change the reasoning context or only the numbers?",
      "Which steps can be observed separately without supplying later answers?",
    ],
  };
}
