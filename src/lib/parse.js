/* ============================================================================
 * src/lib/parse.js — a course, from the files it is written in
 *
 * The browser half of what tools/lib/load.mjs does on disk. Same rules, same
 * positional ids, same shape out; the only difference is that a course arrives
 * as a map of path to text rather than as a directory.
 *
 *   { "course.yaml": "...", "sections/01-intro/1-start.yaml": "...", ... }
 *
 * That map is the unit of everything now: what the build ships, what a user
 * imports, what an author edits, what IndexedDB stores. There is no compiled
 * form in between, so what a model writes is exactly what the app runs.
 *
 * Measured cost on a low-tier phone: 87ms for ma26600's 458KB across 105
 * files, once per course open.
 * ==========================================================================*/
import { readQuestionCollections, resolveQuestionBank } from "./question-bank.js";
import { questionStimuli } from "./questions.js";
import * as YAML from "js-yaml";
import { curriculumMap, mergeCurriculumDefinitions, mergePlanCurriculum, readCurriculumCollections, validateCourseCurriculumReferences, validateCurriculumReferences } from "./curriculum.js";

const DATA = /\.(ya?ml|json)$/i;
const stem = p => p.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
const num = (name, fallback) => {
  const m = /^(\d+)/.exec(name.replace(/^.*\//, ""));
  return m ? parseInt(m[1], 10) : fallback;
};

/** Files directly inside `dir`, data only, ignoring `_`-prefixed ones. */
const listing = (files, dir) => Object.keys(files)
  .filter(p => p.startsWith(dir) && !p.slice(dir.length).includes("/"))
  .filter(p => DATA.test(p) && !p.slice(dir.length).startsWith("_"))
  .sort();

/** The exam the scheduler aims at, and why the review set is what it is (M3). */
function calibration(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text || "");
  if (!m) return {};
  let front = {};
  try { front = YAML.load(m[1]) || {}; } catch { return {}; }
  const exam = front.exam;
  return {
    exam: exam && {
      format: exam.format || [],
      dates: (exam.dates || []).map(d =>
        d instanceof Date ? d.toISOString().slice(0, 10) : String(d))
    },
    reviewBasis: String((front.review || {}).basis || "").trim()
  };
}

/**
 * @param files {Record<string,string>} path -> text, relative to the course root
 * @returns {{course: object, errors: string[]}}
 */
export function parseCourse(files) {
  const errors = [];
  const mapping = value => value && typeof value === "object" && !Array.isArray(value);
  const read = p => {
    try { return p.endsWith(".json") ? JSON.parse(files[p]) : YAML.load(files[p]); }
    catch (e) { errors.push(`${p}: ${e.message.split("\n")[0]}`); return null; }
  };

  const metaPath = Object.keys(files).find(p => /^course\.(ya?ml|json)$/.test(p));
  if (!metaPath) return { course: null, errors: ["no course.yaml at the root"] };

  const parsedMeta = read(metaPath);
  if (!mapping(parsedMeta)) errors.push(`${metaPath}: not a mapping`);
  const meta = mapping(parsedMeta) ? parsedMeta : {};
  const C = Object.assign(
    { code: "", title: "", tagline: "", meta: "", concepts: {}, drills: {}, practice: {}, sections: [] },
    meta);
  C.sections = [];
  if (meta.concepts != null && !mapping(meta.concepts)) errors.push(`${metaPath}: concepts must be a mapping`);
  if (meta.cats != null && !mapping(meta.cats)) errors.push(`${metaPath}: cats must be a mapping`);
  const canonical = readCurriculumCollections(files, errors);
  const canonicalPresent = ["objectives", "families", "concepts"].some(name =>
    ["yaml", "yml", "json"].some(ext => Object.hasOwn(files, `categorize/${name}.${ext}`)));
  if (canonicalPresent && Object.hasOwn(files, "materials/plan.yaml")) {
    const plan = read("materials/plan.yaml");
    if (!mapping(plan)) errors.push("materials/plan.yaml: not a mapping");
    else {
      const planDefinitions = mergePlanCurriculum(plan, canonical, errors, "materials/plan.yaml");
      validateCurriculumReferences(plan, planDefinitions, errors);
    }
  }
  const concepts = Object.entries(mapping(meta.concepts) ? meta.concepts : {}).flatMap(([id, value]) => {
    if (!mapping(value)) { errors.push(`${metaPath}: concepts.${id} must be a mapping`); return []; }
    return [{ id, ...value }];
  });
  C.concepts = Object.assign({}, mapping(meta.concepts) ? meta.concepts : {});
  C.drills = {};
  C.practice = {};
  C.cats = Object.assign({}, mapping(meta.cats) ? meta.cats : {});

  /* Categories are declared, never inferred (the M31 shape): one file per
     category, carrying the boundary that makes it a category rather than a
     label. A `cat:` naming no file is caught by validate.mjs, and renders as
     an undeclared membership rather than inventing a category at read time. */
  for (const p of listing(files, "categories/")) {
    const body = read(p);
    if (!mapping(body)) { errors.push(`${p}: not a mapping`); continue; }
    C.cats[body.key || stem(p)] = body;
  }

  for (const p of listing(files, "concepts/")) {
    const body = read(p);
    if (!mapping(body)) { errors.push(`${p}: not a mapping`); continue; }
    if (canonicalPresent) concepts.push({ id: body.id || body.key || stem(p), ...body });
    else C.concepts[body.key || stem(p)] = body;
  }
  if (canonicalPresent) {
    const merged = mergeCurriculumDefinitions(canonical, { objectives: [], families: [], concepts }, errors,
      "course legacy curriculum", true);
    C.concepts = curriculumMap(merged.concepts);
    C.objectives = curriculumMap(merged.objectives);
    C.families = curriculumMap(merged.families);
  }

  for (const p of listing(files, "drills/")) {
    const body = read(p);
    if (!mapping(body)) { errors.push(`${p}: not a mapping`); continue; }
    const key = body.concept || stem(p);
    if (body.items != null && !Array.isArray(body.items)) errors.push(`${p}: items must be a list`);
    C.drills[key] = { concept: key, items: Array.isArray(body.items) ? body.items : [] };
  }
  for (const p of listing(files, "practice/")) {
    const body = read(p);
    if (!mapping(body)) { errors.push(`${p}: not a mapping`); continue; }
    const key = body.concept || stem(p);
    if (body.items != null && !Array.isArray(body.items)) errors.push(`${p}: items must be a list`);
    C.practice[key] = { concept: key, items: Array.isArray(body.items) ? body.items : [] };
  }

  const cal = calibration(files["materials/expectations.md"]);
  C.reviewBasis = cal.reviewBasis || "";
  if (cal.exam) {
    C.exam = cal.exam;
    C.retention = Object.assign({ deadlines: cal.exam.dates }, C.retention || {});
  }

  /* Sections are folders, subsections the files inside them; both are numbered
     by filename prefix, so an author never writes an id. */
  const folders = [...new Set(Object.keys(files)
    .filter(p => p.startsWith("sections/"))
    .map(p => p.split("/")[1])
    .filter(d => d && !d.startsWith("_")))].sort();

  folders.forEach((folder, si) => {
    const dir = `sections/${folder}/`;
    const metaFile = Object.keys(files).find(p => new RegExp(`^${dir}_section\\.(ya?ml|json)$`).test(p));
    const parsedSection = metaFile && read(metaFile);
    if (metaFile && !mapping(parsedSection)) errors.push(`${metaFile}: not a mapping`);
    const smeta = mapping(parsedSection) ? parsedSection : {};
    const n = smeta.num != null ? smeta.num : num(folder, si + 1);
    const id = smeta.id || `s${n}`;

    const subs = listing(files, dir).map((p, k) => {
      const sub = read(p);
      if (!mapping(sub)) { errors.push(`${p}: not a mapping`); return null; }
      if (sub.blocks != null && !Array.isArray(sub.blocks)) errors.push(`${p}: blocks must be a list`);
      if (sub.quiz != null && !Array.isArray(sub.quiz)) errors.push(`${p}: quiz must be a list`);
      return Object.assign({}, sub, {
        id: sub.id || `${id}-${num(p, k + 1)}`,
        title: sub.title || stem(p),
        blocks: Array.isArray(sub.blocks) ? sub.blocks : [],
        quiz: Array.isArray(sub.quiz) ? sub.quiz : []
      });
    }).filter(Boolean);

    if (!subs.length) errors.push(`sections/${folder}: no subsection files`);
    C.sections.push({
      id, num: n,
      title: smeta.title || folder,
      blurb: smeta.blurb || "",
      primer: smeta.primer || [],
      subs
    });
  });

  C.sections.sort((a, b) => a.num - b.num);
  if (!C.sections.length) errors.push("no sections found");

  resolveQuestionBank(C, readQuestionCollections(files, read, errors), errors);

  /* Images travel as data URIs under their own path, so a course stays one
     self-contained map with nothing to fetch alongside it. Resolved here rather
     than in the renderer: block config is applied in an effect, which runs
     after the first paint, and a figure must not 404 on the way to being right. */
  const assets = {};
  for (const p of Object.keys(files)) if (p.startsWith("assets/")) assets[p] = files[p];
  const resolveImage = (image, where) => {
    if (!image || !image.src) return;
    if (assets[image.src]) image.src = assets[image.src];
    else errors.push(`${where}: missing image asset "${image.src}"`);
  };
  for (const s of C.sections)
    for (const u of s.subs) {
      for (const b of u.blocks) {
        if (b?.t === "image") resolveImage(b, u.id);
        if (b?.t === "slides")
          for (const [i, frame] of (Array.isArray(b.frames) ? b.frames : []).entries())
            resolveImage(frame?.image, `${u.id} slide ${i + 1}`);
      }
      for (const q of u.quiz) for (const part of questionStimuli(q?.stimulus))
        if (part?.t === "image") resolveImage(part, `${u.id} question`);
    }
  for (const bank of Object.values(C.practice))
    for (const item of bank.items) for (const part of questionStimuli(item?.stimulus))
      if (part?.t === "image") resolveImage(part, `practice/${bank.concept}`);
  for (const bank of Object.values(C.drills))
    for (const item of bank.items) for (const part of questionStimuli(item?.stimulus))
      if (part?.t === "image") resolveImage(part, `drills/${bank.concept}`);

  for (const item of Object.values(C.questionBank)) for (const part of questionStimuli(item.stimulus))
    if (part?.t === "image") resolveImage(part, `questions/bank ${item.id}`);

  if (canonicalPresent) validateCourseCurriculumReferences(C, errors);

  return { course: C, errors };
}
