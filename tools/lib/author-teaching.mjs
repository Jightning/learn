/* Lesson-local teaching decisions and bounded evidence for prerequisite handoffs. */
import { createHash } from "node:crypto";
import { parseFile } from "./load.mjs";
import { isOptional } from "../../src/lib/tiers.js";

const list = value => value == null ? [] : Array.isArray(value) ? value : [value];
const idOf = value => typeof value === "string" ? value : value?.id;
const map = value => value != null && typeof value === "object" && !Array.isArray(value);
const ids = value => list(value).map(idOf).filter(value => typeof value === "string" && value);
const asText = value => typeof value === "string" && value.trim();
const blockRefs = block => new Set([
  ...ids(block?.objectives ?? block?.objective),
  ...ids(block?.concepts ?? block?.concept),
  ...ids(block?.introduces)
]);

function validateBrief(brief, lessonId) {
  const at = `lesson "${lessonId}" teaching`;
  if (!map(brief)) throw new Error(`${at} must be a mapping`);
  if (!asText(brief.outcome)) throw new Error(`${at}.outcome must state a nonempty lesson capability`);
  for (const key of ["requires", "introduces"])
    if (brief[key] != null && !Array.isArray(brief[key])) throw new Error(`${at}.${key} must be a list of IDs`);
  for (const key of ["outcome", "reasoning", "practice", "boundary"])
    if (brief[key] != null && !asText(brief[key])) throw new Error(`${at}.${key} must be nonempty text`);
  for (const key of ["requires", "introduces"])
    for (const value of list(brief[key]))
      if (!idOf(value) || typeof idOf(value) !== "string") throw new Error(`${at}.${key} entries need IDs`);
  if (brief.representation != null) {
    if (!map(brief.representation)) throw new Error(`${at}.representation must be a mapping`);
    if (brief.representation.job != null && !asText(brief.representation.job))
      throw new Error(`${at}.representation.job must be nonempty text`);
    if (brief.representation.needs != null && !Array.isArray(brief.representation.needs))
      throw new Error(`${at}.representation.needs must be a list`);
    if (list(brief.representation.needs).some(value => typeof value !== "string" || !value.trim()))
      throw new Error(`${at}.representation.needs entries must be nonempty strings`);
  }
}

/** Validate optional lesson briefs against existing curriculum and reading order. */
export function indexTeaching(plan) {
  const lessons = list(plan.data.lessons ?? plan.data.subsections);
  const objectives = new Set(list(plan.data.objectives).map(idOf).filter(Boolean));
  const concepts = new Set(list(plan.data.concepts).map(idOf).filter(Boolean));
  const allowed = new Set([...objectives, ...concepts]);
  const backgroundEntries = list(plan.data.reader?.background);
  const background = new Set(backgroundEntries.map(idOf).filter(Boolean));
  const owners = new Map(), requiredByLesson = new Map(), positions = new Map();
  lessons.forEach((lesson, position) => positions.set(lesson.id, position));
  for (const lesson of lessons) {
    const brief = lesson?.teaching;
    if (brief == null) continue;
    validateBrief(brief, lesson.id);
    for (const id of ids(brief.introduces)) {
      if (!allowed.has(id)) throw new Error(`lesson "${lesson.id}" teaching.introduces references unknown concept/objective "${id}"`);
      if (owners.has(id)) throw new Error(`teaching introduction "${id}" is owned by both "${owners.get(id)}" and "${lesson.id}"`);
      owners.set(id, lesson.id);
    }
  }
  lessons.forEach((lesson, position) => {
    const brief = lesson?.teaching;
    if (brief == null) return;
    const required = ids(brief.requires);
    requiredByLesson.set(lesson.id, required);
    for (const id of required) {
      if (!allowed.has(id) && !background.has(id))
        throw new Error(`lesson "${lesson.id}" teaching.requires references unknown prerequisite "${id}"`);
      if (background.has(id)) continue;
      const owner = owners.get(id);
      if (!owner) throw new Error(`lesson "${lesson.id}" requires "${id}", but it is not in reader.background or introduced by a lesson`);
      if (positions.get(owner) >= position)
        throw new Error(`lesson "${lesson.id}" requires "${id}" from "${owner}" before it is introduced`);
    }
  });
  return { owners, requiredByLesson, background, backgroundEntries, lessons };
}

function taggedFor(block, id) {
  if (blockRefs(block).has(id)) return true;
  const serialized = JSON.stringify(block);
  return [...serialized.matchAll(/<c\s+k=["']([^"']+)["']/g)].some(match => match[1] === id);
}

const contentFields = ["core", "h", "items", "src", "tex", "rows", "spec", "frames"];
const hasContent = value => {
  if (typeof value === "string") return value.replace(/<[^>]*>/g, "").trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasContent);
  if (map(value)) return Object.values(value).some(hasContent);
  return false;
};
const hasTeachingContent = block => !isOptional(block) && contentFields.some(key => hasContent(block[key]));

function evidenceBlocks(subsection, idsWanted) {
  if (!subsection?.file) return [];
  const unit = parseFile(subsection.file) || {};
  return list(unit.blocks).flatMap((block, position) => {
    if (!map(block)) return [];
    const matches = idsWanted.filter(id => taggedFor(block, id));
    if (!matches.length) return [];
    return [{ block, position: position + 1, matches, introduced: ids(block.introduces) }];
  });
}

/** Compact original teaching evidence for direct prerequisites only. */
export function teachingPacket({ plan, subsection, subsections = [], assigned = [], index = indexTeaching(plan) }) {
  const lesson = index.lessons.find(item => item.id === subsection?.id);
  const brief = lesson?.teaching;
  if (!brief) return {};
  const courseOutline = index.lessons.map(item => ({
    id: item.id,
    ...(item.teaching?.outcome ? { outcome: item.teaching.outcome } : {}),
    ...(ids(item.teaching?.introduces).length ? { introduces: ids(item.teaching.introduces) } : {})
  }));
  const byId = new Map(subsections.map(item => [item.id, item]));
  const positions = new Map(subsections.map((item, i) => [item.id, i]));
  const prerequisiteEvidence = [];
  const warnings = [];
  for (const id of ids(brief.requires)) {
    const background = index.backgroundEntries.find(item => idOf(item) === id);
    if (background) {
      prerequisiteEvidence.push({ id, status: "background", source: background });
      continue;
    }
    const ownerId = index.owners.get(id);
    if (positions.has(ownerId) && positions.has(subsection?.id) && positions.get(ownerId) >= positions.get(subsection.id))
      throw new Error(`prerequisite "${id}" must appear before "${subsection.id}" in the actual reading order`);
    const owner = byId.get(ownerId);
    const anchors = evidenceBlocks(owner, [id]);
    const explicit = anchors.filter(anchor => anchor.introduced.includes(id));
    const identified = explicit.filter(anchor => typeof anchor.block.authorId === "string" && anchor.block.authorId);
    const stableAnchors = identified.filter(anchor => hasTeachingContent(anchor.block));
    const source = stableAnchors.length ? stableAnchors : explicit.length ? explicit : anchors;
    const pendingInBatch = assigned.includes(ownerId);
    const written = stableAnchors.length > 0 && !pendingInBatch;
    const locations = source.map(anchor => ({
      authorId: anchor.block.authorId || null,
      locator: `${ownerId}/block:${anchor.position}`,
      ...(anchor.block.t ? { type: anchor.block.t } : {}),
      ...(written ? { content: anchor.block } : {})
    }));
    if (!explicit.length) warnings.push(`prerequisite "${id}" has no explicit block introduces anchor; planned evidence only`);
    if (explicit.length && !identified.length)
      warnings.push(`prerequisite "${id}" introduction anchor has no stable authorId in ${ownerId}/block:${explicit[0].position}; planned evidence only`);
    if (identified.some(anchor => !hasTeachingContent(anchor.block)))
      warnings.push(`prerequisite "${id}" introduction anchor has no substantive teaching content in ${ownerId}/block:${identified.find(anchor => !hasTeachingContent(anchor.block)).position}; planned evidence only`);
    if (pendingInBatch) warnings.push(`prerequisite "${id}" is owned by assigned lesson "${ownerId}" in this batch; keep it planned until that lesson is written`);
    if (!owner) warnings.push(`prerequisite "${id}" lesson "${ownerId}" is not in the supplied subsection list`);
    prerequisiteEvidence.push({ id, owner: ownerId, assigned: pendingInBatch, status: written ? "written" : "planned", locations });
  }
  const reader = plan.data.reader || {};
  const readerKeys = ["goal", "background", "failures", "not_failures", "onboarding", "priorities", "session_length", "audience"];
  const readerContext = Object.fromEntries(readerKeys.filter(key => reader[key] != null).map(key => [key, reader[key]]));
  const representationNeeds = list(brief.representation?.needs);
  const needs = [...new Set([...list(lesson.needs), ...representationNeeds])];
  return {
    teaching: brief,
    outline: courseOutline,
    ...(assigned.length ? { assignedLessons: [...assigned] } : {}),
    ...(prerequisiteEvidence.length ? { prerequisiteEvidence } : {}),
    ...(needs.length ? { needs } : {}),
    ...(Object.keys(readerContext).length ? { reader: readerContext } : {}),
    ...(warnings.length ? { warnings } : {})
  };
}

/** Signature input for only the direct prerequisites of one lesson. */
export function prerequisiteEvidenceSignature(plan, subsectionId, subsections = [], index = indexTeaching(plan)) {
  const lesson = index.lessons.find(item => item.id === subsectionId);
  const evidence = [];
  for (const id of ids(lesson?.teaching?.requires)) {
    const ownerId = index.owners.get(id);
    if (!ownerId) continue;
    const anchors = evidenceBlocks(subsections.find(item => item.id === ownerId), [id]);
    evidence.push({ id, ownerId, blocks: anchors.map(anchor => anchor.block) });
  }
  return createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
}
