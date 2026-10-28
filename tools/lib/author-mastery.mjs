/* Authoring views reuse the shared compiler. No second activity schema or
   evaluator inventory lives in the authoring state. */
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { loadCourse, parseFile } from "./load.mjs";

export function readAuthorMastery(dir) {
  if (!existsSync(join(dir, "mastery"))) return null;
  const { course, errors } = loadCourse(dir);
  if (errors.length) throw new Error(errors.join("\n"));
  const entries = [];
  for (const name of readdirSync(join(dir, "mastery")).sort()) {
    const file = join(dir, "mastery", name), data = parseFile(file);
    const collection = /^(targets|policies|activities)\./.exec(name)?.[1];
    const key = { targets: "roots", policies: "policies", activities: "activities" }[collection];
    const kind = { targets: "target", policies: "policy", activities: "activity" }[collection] || "manifest";
    for (const item of key ? data[key] : [data]) {
      const compiled = kind === "activity" ? course.activityIndex.activities[item.id] : kind === "target" ? course.mastery.roots[item.id] : null;
      entries.push({ id: `mastery-${kind}${key ? `-${item.id}` : ""}`, kind: `mastery-${kind}`,
        file: relative(dir, file), ...(kind === "activity" ? { sub: item.lesson, section: item.lesson.split("-")[0] } : {}),
        content: item, ...(compiled ? { compatibility: Object.fromEntries(
          ["contentSignature", "evidenceSignature", "rubricSignature", "organizationSignature"].filter(k => compiled[k]).map(k => [k, compiled[k]])) } : {}) });
    }
  }
  return { course, entries };
}

export function masteryAuthorContext(mastery, lesson) {
  if (!mastery) return null;
  const activities = Object.values(mastery.course.activityIndex?.activities || {}).filter(a => !lesson || a.lesson === lesson);
  if (!activities.length) return null;
  const roots = [...new Set(activities.flatMap(a => a.tests.map(t => t.root)))];
  const content = (kind, id) => mastery.entries.find(e => e.kind === `mastery-${kind}` && e.content.id === id).content;
  return { targets: roots.map(id => content("target", id)),
    activities: activities.map(a => ({ ...content("activity", a.id), availability: a.availability })),
    policies: [...new Set(roots.map(id => mastery.course.mastery.roots[id].policy))].map(id => content("policy", id)),
    distribution: "Only public package references are distributed. Private evaluator packages stay outside the course; checkVisibility is a requirement, not private bytes or verified evidence." };
}

/** Explicit qualified facets keep a self/explanation task from substituting for
    an implementation requirement. These are coverage routes, never achievement. */
export function practicalFamilyEvidence(mastery, family, objectives) {
  if (family.activities === undefined && family.requiredFacets === undefined) return null;
  const missing = [], tasks = [], mapped = [];
  const ids = family.activities;
  const facets = family.requiredFacets;
  if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length)
    missing.push("activities must list distinct activity IDs");
  if (!Array.isArray(facets) || !facets.length) missing.push("requiredFacets must list qualified root/facet/anchor/kind requirements");
  const C = mastery?.course;
  const owns = test => {
    const root = C?.mastery.roots[test.root], skill = C?.questionSkills[test.skill];
    return root && objectives.has(root.scoreFor) && (skill?.families || [skill?.family]).includes(family.id);
  };
  for (const id of Array.isArray(ids) ? ids : []) {
    const activity = C?.activityIndex?.activities[id];
    if (!activity || activity.availability !== "available" || activity.kind === "question" || !activity.tests.some(owns)) {
      missing.push(`activity ${id} is missing, unavailable, or not mapped practical evidence`); continue;
    }
    mapped.push(activity);
  }
  const seen = new Set();
  for (const facet of Array.isArray(facets) ? facets : []) {
    const key = JSON.stringify([facet?.root, facet?.facet, facet?.anchor, facet?.kind]);
    const root = C?.mastery.roots[facet?.root], anchor = root?.facets[facet?.facet]?.anchors[facet?.anchor];
    if (!facet || typeof facet !== "object" || Array.isArray(facet) || typeof facet.root !== "string" || typeof facet.facet !== "string" || !Number.isInteger(facet.anchor) || Object.keys(facet).some(k => !["root", "facet", "anchor", "kind"].includes(k)) || !anchor ||
        !["external-lab", "written-defense", "audio", "trusted-evaluation"].includes(facet.kind) || seen.has(key)) {
      missing.push("invalid or duplicate required practical facet"); continue;
    }
    seen.add(key);
    const matches = mapped.filter(a => a.kind === facet.kind && a.tests.some(t => owns(t) && t.root === facet.root &&
      t.facet === facet.facet && t.anchor === facet.anchor && anchor.criteria.every(c => t.criteria.includes(c))) &&
      (a.kind !== "external-lab" || a.artifact));
    if (!matches.length) missing.push(`no practical evidence for ${facet.root}/${facet.facet}@${facet.anchor} (${facet.kind})`);
    tasks.push(...matches.map(a => `mastery-activity-${a.id}`));
  }
  return { mapped, tasks: [...new Set(tasks)], missing };
}
