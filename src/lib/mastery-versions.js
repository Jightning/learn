import { bankSignature } from "./question-bank.js";

const pick = (value, keys) => Object.fromEntries(keys.filter(k => value?.[k] !== undefined).map(k => [k, value[k]]));
const sorted = xs => [...xs].sort((a, b) => {
  const left = bankSignature(a), right = bankSignature(b);
  return left < right ? -1 : left > right ? 1 : 0;
});
const skills = (C, ids) => sorted(ids.map(id => pick(C.questionSkills[id], ["id", "task", "standard", "scoreFor"])));
const questionContent = q => q && { ...pick(q, ["id", "q", "response", "stimulus", "tries"]),
  steps: (q.steps || []).map(step => pick(step, ["id", "q", "response", "stimulus"])) };
const questionEvidence = q => q && { ...pick(q, ["skills", "demand", "support", "group", "demonstrates", "representation", "routes"]),
  steps: (q.steps || []).map(step => pick(step, ["id", "skills", "demand", "support", "route"])) };

/** Canonical signatures are compatibility identities, not artifact hashes or
 * trust proofs. Explicit versions AND semantic payloads participate so forgotten
 * version bumps cannot silently reuse changed task/rubric evidence. */
export function masterySignatures(C) {
  const { roots, policies } = C.mastery;
  for (const root of Object.values(roots)) {
    root.contentSignature = bankSignature({ ...pick(root, ["id", "semanticVersion", "skills", "scoreFor", "anchors", "facets"]),
      skills: skills(C, root.skills) });
    root.rubricSignature = bankSignature(policies[root.policy]);
    root.organizationSignature = bankSignature(pick(root, ["label", "importance", "requiredAnchor", "targetOwnerModule", "claimRequirement"]));
  }
  for (const item of Object.values(C.activityIndex?.activities || {})) {
    const question = C.questionBank[item.question];
    // Include only the tested anchor/facet and criteria: editing another root,
    // facet or unused policy criterion cannot invalidate this observation.
    const tested = sorted(item.tests.map(t => {
      const root = roots[t.root], facet = root.facets[t.facet];
      return { ...t, criteria: sorted(t.criteria), semanticVersion: root.semanticVersion,
        standard: facet.standard, anchorStandard: facet.anchors[t.anchor].standard,
        rootStandard: root.anchors[t.anchor].standard, skill: skills(C, [t.skill]) };
    }));
    item.contentSignature = bankSignature({ ...pick(item, ["id", "kind", "contentVersion", "lab", "artifact", "environment", "adapter"]),
      question: questionContent(question), tested });
    item.evidenceSignature = bankSignature({ content: item.contentSignature, ...pick(item, ["evidenceVersion", "group", "support", "tests", "checkVisibility"]),
      question: questionEvidence(question) });
    item.rubricSignature = bankSignature({ rubricVersion: item.rubricVersion, policies: sorted(item.tests.map(t => {
      const p = policies[roots[t.root].policy];
      return { ...pick(p, ["id", "version", "minGroups", "minSessions", "noncriticalFloor", "delayDays", "unfamiliarConstraint", "entails"]),
        criteria: sorted(t.criteria.map(id => p.criteria[id])) };
    })) });
    item.organizationSignature = bankSignature(pick(item, ["lesson", "required", "wave", "after", "prerequisites", "fallback", "delay", "timing"]));
  }
  C.mastery.organizationSignature = bankSignature({
    roots: Object.fromEntries(Object.values(roots).map(root => [root.id, root.organizationSignature])),
    skills: Object.fromEntries(Object.values(C.questionSkills).map(skill => [skill.id, pick(skill, ["teach", "importance", "scopes"])])),
    objectives: Object.fromEntries(Object.entries(C.objectives).map(([id, objective]) => [id, objective.importance ?? 1])),
    lessons: C.sections.map(s => ({ id: s.id, subs: s.subs.map(u => u.id) })),
    activities: Object.fromEntries(Object.values(C.activityIndex?.activities || {}).map(item => [item.id, item.organizationSignature]))
  });
}
