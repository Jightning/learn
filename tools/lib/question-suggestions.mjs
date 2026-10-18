/* Small local NLP hints for author review. Similarity is never an authored
 * skill mapping, independent group, difficulty estimate, or learner diagnosis. */
const text = value => String(value || '').replace(/<[^>]*>/g, ' ').toLowerCase();
const tokens = value => new Set(text(value).match(/[\p{L}]{3,}/gu) || []);
const overlap = (a, b) => {
  const union = new Set([...a, ...b]);
  return union.size ? [...a].filter(t => b.has(t)).length / union.size : 0;
};
const template = value => text(value).replace(/\d+(?:\.\d+)?/g, '#').replace(/\s+/g, ' ').trim();
export function suggestQuestionMetadata(course) {
  const skills = Object.values(course.questionSkills || course.questionTypes || {});
  const items = Object.values(course.questionBank || {}), seen = new Map();
  return items.map(item => {
    const prompt = item.q || item.prompt, words = tokens(prompt), shape = template(prompt);
    const duplicates = shape.length > 20 ? [...(seen.get(shape) || [])] : [];
    if (!seen.has(shape)) seen.set(shape, []);
    seen.get(shape).push(item.id);
    return { itemId: item.id, reviewRequired: true, method: 'local-token-overlap-v1',
      skillCandidates: skills.map(s => ({ id: s.id, similarity: overlap(words, tokens(`${s.task} ${s.standard || ''}`)) }))
        .filter(s => s.similarity > 0).sort((a, b) => b.similarity-a.similarity || a.id.localeCompare(b.id)).slice(0, 3),
      possibleTemplateSiblings: duplicates,
      supportCue: /\b(using|use the|given the method|step.by.step|following formula)\b/i.test(text(prompt))
        ? 'Review whether the prompt supplies a method or intermediate result.' : null };
  });
}
