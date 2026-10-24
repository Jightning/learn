/* Compact handoffs and evidence reports. Content stays in the course files;
   review selects an original item rather than a model-written synopsis. */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import * as YAML from "js-yaml";
import { readAuthorBank, resolveAuthorQuiz, bankMatrix } from "./author-bank.mjs";
import { loadCourse, parseFile } from "./load.mjs";
import { selectContext, shapeNeeds } from "./author-context.mjs";
import { indexTeaching, teachingPacket, prerequisiteEvidenceSignature } from "./author-teaching.mjs";
import { isOptional } from "../../src/lib/tiers.js";
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
// Older plans use titles and plural risks; retain their meaning without
// turning a topic title into an asserted performance standard.
const objectiveContext = o => ({ id: o.id,
  ...(o.outcome ? { outcome: o.outcome } : {}),
  ...(o.title && o.title !== o.outcome ? { title: o.title } : {}),
  ...(o.risks ?? o.risk ? { risks: asList(o.risks ?? o.risk) } : {}),
  ...(o.requiredEvidence ? { requiredEvidence: o.requiredEvidence } : {})
});

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
    if (Object.hasOwn(f, "assessmentRequired") && typeof f.assessmentRequired !== "boolean")
      throw new Error(`family "${f.id}": assessmentRequired must be boolean`);
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
  const teaching = indexTeaching(plan);
  return {
    lessons: new Map(lessons.map(s => [s.id, s])),
    objectives: objectiveIndex,
    families: familyIndex, byLesson, uses, teaching
  };
}

export function planSignature(plan, sub, index = indexPlan(plan), subsections = []) {
  const lesson = index.lessons.get(sub);
  const ids = new Set([...asList(lesson?.objectives).map(named), ...(index.byLesson.get(sub) || []).map(o => o.id)]);
  const local = [...ids].map(id => index.objectives.get(id)).filter(Boolean);
  const prerequisites = new Set(local.flatMap(o => asList(o.prerequisites).map(named)));
  const dependencies = [...prerequisites].map(id => index.objectives.get(id)).filter(Boolean);
  const familyIds = new Set(asList(lesson?.families ?? local.flatMap(o => asList(o.families))).map(named));
  const families = [...familyIds].map(id => index.families.get(id)).filter(Boolean).filter(active);
  const owners = [...new Set(asList(lesson?.teaching?.requires).map(named)
    .map(id => index.teaching.owners.get(id)).filter(Boolean))]
    .map(id => index.lessons.get(id)?.teaching ? { id, teaching: index.lessons.get(id).teaching } : { id });
  const evidence = prerequisiteEvidenceSignature(plan, sub, subsections, index.teaching);
  const signature = { lesson, local, dependencies, families, reader: plan.data.reader };
  if (!lesson?.teaching) return fingerprint(JSON.stringify(signature));
  return fingerprint(JSON.stringify({ ...signature, owners, evidence }));
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
  needs = [], item, issue, sourceRefs = [], sources = [], warnings = [], subsections = [], assigned = [] }) {
  const bank = readAuthorBank(join(plan.path, "../.."));
  const unit = subsection ? parseFile(subsection.file) || {} : {};
  const lesson = index.lessons.get(subsection?.id);
  const resolved = resolveAuthorQuiz(".", unit, bank);
  const selected = item ? selectItem(resolved, item) : null;
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
  const prerequisites = [...prerequisiteIds].map(id => index.objectives.get(id)).filter(Boolean).map(objectiveContext);
  const families = [...familyIds].map(id => index.families.get(id)).filter(Boolean).filter(active);
  const effectiveRole = mode === "single" ? "single" : role ||
    (phase === "plan" ? "planner" : phase === "review" ? "reviewer" : "writer");
  const teachingContext = phase === "write" && lesson?.teaching
    ? teachingPacket({ plan, subsection, subsections, assigned, index: index.teaching }) : {};
  const rules = selectContext(context, { phase, role: effectiveRole,
    needs: [...new Set([...needs, ...asList(selected ? null : lesson?.needs), ...asList(teachingContext.needs), ...shapeNeeds(selected
      ? item.startsWith("block:") ? { blocks: [selected] } : { quiz: [selected] } : resolved)])] });
  const refs = sourceRefs.length ? sourceRefs : selected
    ? asList(selected.sourceRefs)
    : phase === "write" ? (lesson && Object.hasOwn(lesson, "sourceRefs") ? asList(lesson.sourceRefs)
      : lesson && Object.hasOwn(lesson, "sources") ? asList(lesson.sources) : shared ? [] : local.flatMap(o => asList(o.sources))) : [];
  const reader = plan.data.reader || {};
  const readerContext = phase === "write"
    ? teachingContext.reader || { ...(reader.goal ? { goal: reader.goal } : {}), ...(reader.background ? { background: reader.background } : {}) }
    : selected && reader.background ? { background: reader.background } : null;
  const placedSkills = new Set(resolved.quiz.flatMap(q => q.skills || [q.typeId]).filter(Boolean));
  const packet = {
    phase, mode, role: effectiveRole,
    rules: rules.modules.map(m => m.path),
    ...(plan.hash && !(phase === "review" && selected) ? { plan: { path: plan.path } } : {}),
    ...(subsection ? { target: subsection.file } : {}),
    ...(readerContext && Object.keys(readerContext).length ? { reader: readerContext } : {}),
    ...(phase === "write" && plan.data.scope ? { scope: plan.data.scope } : {}),
    ...(phase === "write" && teachingContext.teaching ? { teaching: teachingContext.teaching } : {}),
    ...(phase === "write" && teachingContext.needs?.length ? { needs: teachingContext.needs } : {}),
    ...(phase === "write" && teachingContext.outline ? { outline: teachingContext.outline } : {}),
    ...(phase === "write" && teachingContext.prerequisiteEvidence ? { prerequisiteEvidence: teachingContext.prerequisiteEvidence } : {}),
    ...(phase === "plan" ? { inventory: plan.path } : {}),
    ...(phase === "write" && bank.types.length ? { questionTypes: bank.types.filter(r => asList(r.content.teach).includes(subsection?.id) || placedSkills.has(r.content.id)).map(r => r.content), inventory: bankMatrix(bank).rows.filter(r => asList(r.teach).includes(subsection?.id) || placedSkills.has(r.type)) } : {}),
    ...(local.length ? { objectives: local.map(objectiveContext) } : {}),
    ...(phase === "write" && prerequisites.length ? { prerequisites } : {}),
    ...(phase === "write" && families.length ? { families } : {}),
    ...(phase !== "review" && lesson?.directives ? { directives: lesson.directives } : {}),
    ...(refs.length ? { sourceRefs: [...new Map(refs.map(r => [JSON.stringify(r), r])).values()] } : {}),
    ...(sources.length ? { sources } : {}),
    ...(selected ? { item: { ...(selected.authorId ? { id: selected.authorId } : { selector: item }), content: Object.fromEntries(Object.entries(selected).filter(([key]) => key !== "authorId")) } } : {}),
    ...(issue ? { issue } : {}),
    warnings: [...warnings, ...rules.warnings, ...asList(teachingContext.warnings)]
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
export function planCoverage(plan, subsections, { verifySource } = {}) {
  const dir = join(plan.path, "../..");
  const bank = readAuthorBank(dir);
  const objectives = asList(plan.data.objectives).filter(active);
  const familyIndex = new Map(asList(plan.data.families).map(f => [f.id, f]));
  const found = new Map(subsections.map(s => [s.id, resolveAuthorQuiz(dir, parseFile(s.file) || {}, bank)]));
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
  for (const { content: item } of bank.items) {
    const type = bank.types.find(r => r.content.id === item.typeId)?.content;
    if (!type || item.use === "diagnostic") continue;
    for (const id of type.objectives || []) {
      if (!evidence.has(id)) evidence.set(id, { teaching: [], questions: [] });
      evidence.get(id).questions.push(item.id);
      if (!assessedFamilies.has(id)) assessedFamilies.set(id, new Set());
      for (const family of type.families || []) assessedFamilies.get(id).add(family);
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
  const requiredFamilies = asList(plan.data.families).filter(f => f?.assessmentRequired === true);
  const familyRows = requiredFamilies.map(family => {
    const missing = [];
    const disposition = family.disposition || "unspecified";
    if (disposition !== "teach") missing.push(`disposition is ${disposition}; required assessment scope must remain teach`);
    const candidates = asList(family.sources).filter(ref => ref && typeof ref === "object" &&
      typeof ref.source === "string" && ref.source.trim() && typeof ref.unit === "string" && ref.unit.trim() &&
      (ref.source !== "generated" || (typeof ref.provenance === "string" && ref.provenance.trim())));
    const routes = [];
    for (const ref of candidates) {
      if (ref.source === "generated" || !verifySource) { routes.push(ref); continue; }
      try {
        const evidence = verifySource(ref);
        if (!substantiveSourceUnit(evidence) || /Source changed or disappeared since indexing/.test(evidence.warning || "")) continue;
        routes.push({ source: ref.source, unit: ref.unit, locator: evidence.locator,
          ...(evidence.warning ? { warning: evidence.warning } : {}) });
      } catch { /* An unknown/stale source is not evidence for a required family. */ }
    }
    if (!routes.length) missing.push("no exact source or explicit generated-provenance route");
    const mappedTypeIds = new Set(asList(family.questions).map(named).filter(Boolean));
    const knownObjectives = new Set(objectives.map(objective => objective.id));
    const knownConcepts = new Set(asList(plan.data.concepts).map(named).filter(Boolean));
    if (["course.yaml", "course.yml", "course.json"].some(name => existsSync(join(dir, name))))
      for (const id of Object.keys(loadCourse(dir).course.concepts || {})) knownConcepts.add(id);
    const mappedTypes = bank.types.map(record => record.content).filter(type => mappedTypeIds.has(type.id) &&
      asList(type.families).map(named).includes(family.id) && type.assess !== false && knownConcepts.has(type.concept) &&
      asList(type.objectives).map(named).some(id => knownObjectives.has(id)));
    if (!mappedTypes.length) missing.push("no mapped question type links this family");
    const objectivesForFamily = new Set([
      ...objectives.filter(objective => asList(objective.families).map(named).includes(family.id)).map(objective => objective.id),
      ...mappedTypes.flatMap(type => asList(type.objectives).map(named))
    ]);
    const conceptsForFamily = new Set(mappedTypes.map(type => type.concept).filter(Boolean));
    const familyTeaching = [];
    const familyTeach = new Set(asList(family.teach).map(named).filter(Boolean));
    const typeTeach = new Set(mappedTypes.flatMap(type => asList(type.teach).map(named).filter(Boolean)));
    const compatibleTeach = new Set([...familyTeach].filter(id => typeTeach.has(id)));
    if (!familyTeach.size) missing.push("no lesson teaching route is declared on the family");
    else if (!compatibleTeach.size) missing.push("family and mapped question types have no compatible teach route");
    for (const [sub, unit] of found) for (const [i, block] of (unit.blocks || []).entries()) {
      if (!compatibleTeach.has(sub) || isOptional(block) ||
          ["depth", "apply", "attempt"].includes(block?.t)) continue;
      const hasFamily = [...asList(block?.families ?? block?.family)].map(named).includes(family.id);
      if (!hasFamily || !hasMainPathContent(block)) continue;
      const linkedObjective = tags(block).some(id => objectivesForFamily.has(id));
      const linkedConcept = conceptTags(block).some(id => conceptsForFamily.has(id));
      if (linkedObjective || linkedConcept) familyTeaching.push({
        location: `${sub}/block:${i + 1}`, ...(block.authorId ? { authorId: block.authorId } : {})
      });
    }
    if (!familyTeaching.length) missing.push("no substantive main-path block on a compatible teach route links this family to its objective or concept");
    const allowedTypes = new Set(mappedTypes.map(type => type.id));
    const tasks = [];
    const addTask = (where, item) => {
      const typeId = item?.typeId || item?.type;
      if (!allowedTypes.has(typeId) || item?.use === "diagnostic" || !meaningfulQuestion(item)) return;
      tasks.push(where);
    };
    for (const [sub, unit] of found) for (const [i, item] of (unit.quiz || []).entries())
      addTask(`${sub}/quiz:${i + 1}`, item);
    for (const record of bank.items) addTask(record.content.id, record.content);
    const uniqueTasks = [...new Set(tasks)];
    if (!uniqueTasks.length) missing.push("no active mapped assessment or practice item exists");
    return { id: family.id, disposition, required: true, sources: routes, questionTypes: mappedTypes.map(type => type.id),
      teaching: familyTeaching, tasks: uniqueTasks, complete: missing.length === 0, missing };
  });
  const assessmentReady = familyRows.every(row => row.complete);
  return { available: !!plan.hash, total: rows.length,
    percent: rows.length ? Math.round(100 * rows.filter(r => r.complete).length / rows.length) : null,
    rows, requiredFamilies: familyRows, assessmentReady,
    assessmentMessage: familyRows.length
      ? `${familyRows.filter(row => row.complete).length}/${familyRows.length} declared assessment-required families have source, teaching, and task evidence. This is a routing check, not a semantic quality judgment.`
      : "No assessment-required families were declared; legacy family coverage remains report-only.",
    message: "Explicit teaching/question links; author judgments, not proof of mastery." };
}

const hasValue = value => {
  if (typeof value === "string") return substantiveText(value);
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasValue);
  if (value && typeof value === "object") return Object.entries(value)
    .filter(([key]) => !["id", "title", "label", "caption", "cap", "alt", "gist", "family", "families", "concept", "concepts", "objective", "objectives", "tier", "source", "authorId", "introduces", "layout"].includes(key))
    .some(([, child]) => hasValue(child));
  return false;
};
function substantiveText(value) {
  return String(value).replace(/<c\s+k=["'][^"']+["'][^>]*>[\s\S]*?<\/c>/g, " ")
    .replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|amp|lt|gt|quot|#\d+);/g, " ").trim().length > 0;
}
function substantiveSourceUnit(evidence) {
  if (!evidence?.locator) return false;
  if (evidence.asset) return true;
  if (typeof evidence.text !== "string") return false;
  const body = evidence.text.replace(/^\s{0,3}#{1,6}\s.*$/gm, " ")
    .replace(/<!-- [\s\S]*? -->/g, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return body.length > 0;
}
function hasMainPathContent(block) {
  if (!["core", "h", "c"].some(key => typeof block?.[key] === "string" && substantiveText(block[key])))
    return ["items", "rows", "slides", "spec"].some(key => hasValue(block?.[key]));
  return true;
}
function conceptTags(item) {
  const values = asList(item?.concepts ?? item?.concept).map(named).filter(Boolean);
  const scan = value => {
    if (typeof value === "string") for (const match of value.matchAll(/<c\s+k=["']([^"']+)["']/g)) values.push(match[1]);
    else if (Array.isArray(value)) value.forEach(scan);
    else if (value && typeof value === "object") Object.values(value).forEach(scan);
  };
  scan(item);
  return [...new Set(values)];
}
function meaningfulQuestion(item) {
  return typeof item?.q === "string" && !!item.q.trim() && item.response && typeof item.response === "object" &&
    Object.entries(item.response).some(([key, value]) => key !== "kind" && hasValue(value));
}

export function packetText(packet) {
  return YAML.dump(packet, { lineWidth: -1, noRefs: true }).trim() + "\n";
}
