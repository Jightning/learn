/* Compact handoffs and evidence reports. Content stays in the course files;
   review selects an original item rather than a model-written synopsis. */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import * as YAML from "js-yaml";
import { parseFile } from "./load.mjs";
import { selectContext, shapeNeeds } from "./author-context.mjs";
import { curriculumSignature, mergePlanCurriculum, readCurriculumCollections, validateCurriculumReferences } from "../../src/lib/curriculum.js";

export const fingerprint = value => createHash("sha256").update(value).digest("hex");
export const fileHash = path => fingerprint(readFileSync(path));
export const readPlan = dir => {
  const path = join(dir, "materials", "plan.yaml");
  const legacy = ["plan.md", "source-family-review.md"].map(f => join(dir, "materials", f)).filter(existsSync);
  const rawPlan = existsSync(path) ? parseFile(path) : {};
  if (rawPlan != null && (typeof rawPlan !== "object" || Array.isArray(rawPlan)))
    throw new Error(`${path}: expected a mapping`);
  const data = { ...(rawPlan || {}) };
  const errors = [];
  const canonicalFiles = {};
  let canonical = false;
  for (const name of ["objectives", "families", "concepts"]) {
    for (const file of ["yaml", "yml", "json"].map(ext => join(dir, "categorize", `${name}.${ext}`))
      .filter(candidate => existsSync(candidate))) {
      canonical = true;
      canonicalFiles[`categorize/${name}.${file.slice(file.lastIndexOf(".") + 1)}`] = readFileSync(file, "utf8");
    }
  }
  if (!canonical) {
    return existsSync(path)
      ? { path, hash: fileHash(path), data: rawPlan || {}, canonical: false }
      : { path, data: {}, canonical: false, legacy };
  }
  const canonicalDefinitions = readCurriculumCollections(canonicalFiles, errors);
  const merged = mergePlanCurriculum(rawPlan || {}, canonicalDefinitions, errors, path);
  if (canonical) validateCurriculumReferences(rawPlan || {}, merged, errors);
  if (errors.length) throw new Error(errors.join("\n"));
  for (const name of ["objectives", "families", "concepts"])
    data[name] = merged[name];
  const signature = fingerprint(curriculumSignature({ plan: rawPlan || {}, canonical: canonicalDefinitions }));
  return { path, ...(existsSync(path) ? { hash: signature } : {}), signature, canonical, data,
    ...(!existsSync(path) ? { legacy } : {}) };
};
const asList = value => value == null ? [] : Array.isArray(value) ? value : [value];
const named = value => typeof value === "string" ? value : value?.id;
const tags = item => asList(item?.objectives ?? item?.objective).map(named);
const active = item => !["excluded", "moved", "prerequisite"].includes(item?.disposition);

export function indexPlan(plan) {
  const strict = !!plan.canonical;
  const objectives = asList(plan.data.objectives);
  const byLesson = new Map(), uses = new Map();
  const families = asList(plan.data.families);
  const objectiveIndex = new Map(), familyIndex = new Map();
  for (const o of objectives) {
    if (!o || typeof o.id !== "string" || !o.id.trim()) {
      if (strict) throw new Error("plan objective definition needs a nonempty id");
      continue;
    }
    if (strict && objectiveIndex.has(o.id)) throw new Error(`duplicate objective id "${o.id}"`);
    objectiveIndex.set(o.id, o);
  }
  for (const f of families) {
    if (!f || typeof f.id !== "string" || !f.id.trim()) {
      if (strict) throw new Error("plan family definition needs a nonempty id");
      continue;
    }
    if (strict && familyIndex.has(f.id)) throw new Error(`duplicate family id "${f.id}"`);
    familyIndex.set(f.id, f);
  }
  const lessons = asList(plan.data.lessons ?? plan.data.subsections);
  if (plan.canonical) {
    const errors = validateCurriculumReferences(plan.data, {
      objectives, families, concepts: asList(plan.data.concepts)
    });
    if (errors.length) throw new Error(errors.join("\n"));
  }
  const lessonIds = new Set();
  const requireRefs = (ids, index, kind, at) => {
    if (!strict) return;
    for (const id of asList(ids).map(named))
      if (typeof id !== "string" || !index.has(id)) throw new Error(`${at} references unknown ${kind} "${id}"`);
  };
  const prerequisites = new Map(objectiveIndex);
  for (const item of asList(plan.data.reader?.background)) {
    const id = named(item);
    if (id) prerequisites.set(id, item);
  }
  for (const lesson of lessons) {
    if (!lesson || typeof lesson.id !== "string" || !lesson.id.trim()) {
      if (strict) throw new Error("plan lesson needs a nonempty id");
      continue;
    }
    if (strict && lessonIds.has(lesson.id)) throw new Error(`duplicate lesson id "${lesson.id}"`);
    lessonIds.add(lesson.id);
    requireRefs(lesson.objectives, objectiveIndex, "objective", `lesson "${lesson.id}"`);
    requireRefs(lesson.families, familyIndex, "family", `lesson "${lesson.id}"`);
    for (const id of asList(lesson.objectives).map(named)) uses.set(id, (uses.get(id) || 0) + 1);
  }
  for (const o of objectives) {
    requireRefs(o.prerequisites, prerequisites, "objective prerequisite", `objective "${o.id}"`);
    requireRefs(o.families, familyIndex, "family", `objective "${o.id}"`);
    const id = o.lesson || o.subsection;
    if (id) { if (!byLesson.has(id)) byLesson.set(id, []); byLesson.get(id).push(o); }
  }
  return {
    lessons: new Map(lessons.map(s => [s.id, s])),
    objectives: objectiveIndex,
    families: familyIndex, byLesson, uses
  };
}

export function planSignature(plan, sub, index = indexPlan(plan)) {
  const lesson = index.lessons.get(sub);
  const ids = new Set([...asList(lesson?.objectives).map(named), ...(index.byLesson.get(sub) || []).map(o => o.id)]);
  const local = [...ids].map(id => index.objectives.get(id)).filter(Boolean);
  const prerequisites = new Set(local.flatMap(o => asList(o.prerequisites).map(named)));
  const dependencies = [...prerequisites].map(id => index.objectives.get(id)).filter(Boolean);
  const familyIds = new Set(asList(lesson?.families ?? local.flatMap(o => asList(o.families))).map(named));
  const families = [...familyIds].map(id => index.families.get(id)).filter(Boolean).filter(active);
  return fingerprint(JSON.stringify({ lesson, local, dependencies, families, reader: plan.data.reader }));
}

export function selectItem(unit, selector) {
  const match = /^(block|quiz):(\d+)$/.exec(selector || "");
  if (!match || Number(match[2]) < 1) throw new Error("--item needs block:N or quiz:N (1-based)");
  const list = match[1] === "block" ? unit.blocks : unit.quiz;
  const item = list?.[Number(match[2]) - 1];
  if (!item) throw new Error(`no ${selector}`);
  return item;
}

export function buildPacket({ context, plan, index = indexPlan(plan), subsection, phase, mode = "single", role,
  needs = [], item, issue, sourceRefs = [], sources = [], warnings = [] }) {
  const unit = subsection ? parseFile(subsection.file) || {} : {};
  const lesson = index.lessons.get(subsection?.id);
  const selected = item ? selectItem(unit, item) : null;
  const wanted = new Set(asList(lesson?.objectives).map(named));
  if (selected) { wanted.clear(); for (const id of tags(selected)) wanted.add(id); }
  if (!wanted.size && subsection && !selected)
    for (const o of index.byLesson.get(subsection.id) || []) wanted.add(o.id);
  const local = [...wanted].map(id => index.objectives.get(id)).filter(Boolean);
  const shared = local.some(o => (index.uses.get(o.id) || 0) > 1);
  const prerequisiteIds = new Set(local.flatMap(o => asList(o.prerequisites).map(named)));
  const familyIds = new Set(lesson && Object.hasOwn(lesson, "families")
    ? asList(lesson.families).map(named)
    : shared ? [] : local.flatMap(o => asList(o.families).map(named)));
  const prerequisites = [...prerequisiteIds].map(id => index.objectives.get(id)).filter(Boolean).map(o => ({ id: o.id, outcome: o.outcome }));
  const families = [...familyIds].map(id => index.families.get(id)).filter(Boolean).filter(active);
  const effectiveRole = mode === "single" ? "single" : role ||
    (phase === "plan" ? "planner" : phase === "review" ? "reviewer" : "writer");
  const rules = selectContext(context, { phase, role: effectiveRole,
    needs: [...new Set([...needs, ...asList(selected ? null : lesson?.needs), ...shapeNeeds(selected
      ? item.startsWith("block:") ? { blocks: [selected] } : { quiz: [selected] } : unit)])] });
  const refs = sourceRefs.length ? sourceRefs : selected
    ? asList(selected.sourceRefs)
    : phase === "write" ? (lesson && Object.hasOwn(lesson, "sourceRefs") ? asList(lesson.sourceRefs)
      : lesson && Object.hasOwn(lesson, "sources") ? asList(lesson.sources) : shared ? [] : local.flatMap(o => asList(o.sources))) : [];
  const reader = plan.data.reader || {};
  const readerContext = phase === "write"
    ? { ...(reader.goal ? { goal: reader.goal } : {}), ...(reader.background ? { background: reader.background } : {}) }
    : selected && reader.background ? { background: reader.background } : null;
  const packet = {
    phase, mode, role: effectiveRole,
    rules: rules.modules.map(m => m.path),
    ...(plan.hash && !(phase === "review" && selected) ? { plan: { path: plan.path } } : {}),
    ...(subsection ? { target: subsection.file } : {}),
    ...(readerContext && Object.keys(readerContext).length ? { reader: readerContext } : {}),
    ...(phase === "write" && plan.data.scope ? { scope: plan.data.scope } : {}),
    ...(phase === "plan" ? { inventory: plan.path } : {}),
    ...(local.length ? { objectives: local.map(o => ({ id: o.id, outcome: o.outcome, ...(o.risk ? { risk: o.risk } : {}) })) } : {}),
    ...(phase === "write" && prerequisites.length ? { prerequisites } : {}),
    ...(phase === "write" && families.length ? { families } : {}),
    ...(phase !== "review" && lesson?.directives ? { directives: lesson.directives } : {}),
    ...(refs.length ? { sourceRefs: [...new Map(refs.map(r => [JSON.stringify(r), r])).values()] } : {}),
    ...(sources.length ? { sources } : {}),
    ...(selected ? { item: { ...(selected.authorId ? { id: selected.authorId } : { selector: item }), content: Object.fromEntries(Object.entries(selected).filter(([key]) => key !== "authorId")) } } : {}),
    ...(issue ? { issue } : {}),
    warnings: [...warnings, ...rules.warnings]
  };
  if (phase === "write" && shared && !Object.hasOwn(lesson || {}, "families") && local.some(o => asList(o.families).length))
    packet.warnings.push("shared objective needs lesson-local families; broad family definitions were not included");
  if (phase === "write" && shared && !Object.hasOwn(lesson || {}, "sources") && !Object.hasOwn(lesson || {}, "sourceRefs") && local.some(o => asList(o.sources).length))
    packet.warnings.push("shared objective needs lesson-local sources; broad source text was not included");
  if (phase === "review" && !selected) packet.warnings.push("no item selected; coverage metadata only, not a content review");
  if (phase === "review" && selected && !refs.length)
    packet.warnings.push("no source span selected; expand evidence before a source-grounded judgment");
  if (phase === "review" && selected && refs.some(ref => !ref.lines))
    packet.warnings.push("source reference has no exact line span; source text was not included");
  if (!plan.hash) packet.warnings.push("no materials/plan.yaml; scope coverage is unavailable");
  return packet;
}

/* A percentage of explicit evidence links, not a semantic mastery score. */
export function planCoverage(plan, subsections) {
  const objectives = asList(plan.data.objectives).filter(active);
  const familyIndex = new Map(asList(plan.data.families).map(f => [f.id, f]));
  const found = new Map(subsections.map(s => [s.id, parseFile(s.file) || {}]));
  const evidence = new Map(), assessedFamilies = new Map();
  for (const [sub, unit] of found) for (const kind of ["teaching", "questions"]) {
    const items = kind === "teaching" ? unit.blocks : unit.quiz;
    for (const [i, item] of (items || []).entries()) for (const id of tags(item)) {
      if (!evidence.has(id)) evidence.set(id, { teaching: [], questions: [] });
      evidence.get(id)[kind].push(`${sub}/${kind === "teaching" ? "block" : "quiz"}:${i + 1}`);
      if (kind === "questions") {
        if (!assessedFamilies.has(id)) assessedFamilies.set(id, new Set());
        for (const family of [...asList(item.families).map(named), item.family, item.type])
          if (family) assessedFamilies.get(id).add(family);
      }
    }
  }
  const locations = (objective, kind) => {
    const out = [...(evidence.get(objective.id)?.[kind] || [])];
    for (const ref of asList(objective.evidence?.[kind])) {
      try {
        selectItem(found.get(ref.sub) || {}, ref.item);
        if (ref.item.startsWith(kind === "teaching" ? "block:" : "quiz:")) out.push(`${ref.sub}/${ref.item}`);
      } catch { /* A bad evidence link is a warning, not a curriculum decision. */ }
    }
    return out;
  };
  const rows = objectives.map(o => {
    const teaching = locations(o, "teaching"), questions = locations(o, "questions");
    const families = asList(o.families).map(named).filter(id => active(familyIndex.get(id)));
    const assessed = families.filter(f => assessedFamilies.get(o.id)?.has(f));
    return { id: o.id, teaching, questions, families: families.length,
      assessed: assessed.length, complete: !!teaching.length && !!questions.length && assessed.length === families.length };
  });
  return { available: !!plan.hash, total: rows.length,
    percent: rows.length ? Math.round(100 * rows.filter(r => r.complete).length / rows.length) : null,
    rows, message: "Explicit teaching/question links; author judgments, not proof of mastery." };
}

export function packetText(packet) {
  return YAML.dump(packet, { lineWidth: -1, noRefs: true }).trim() + "\n";
}
