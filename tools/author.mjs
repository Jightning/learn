#!/usr/bin/env node
/* ============================================================================
 * tools/author.mjs — the commands a CLI agent uses to write a course
 *
 *   author begin  <id> [--source PATH]... [--lean] [--research]
 *                     where the course stands, its sources, and the rules for its shape
 *   author write  <id> [--lean] [--confident]
 *                     the writing rules, once, and the first subsection
 *   author done   <id> <sN-M> [SOURCE]... [--staging]   check one, and name the next
 *   author finish <id>                      materials, validate and coverage, compactly
 *   author status <id> [--digest]   ·   redo <id> <sN-M|course|finish>...   ·   reset <id>
 *   author rules  <id> [--need KIND]...     on-demand sections for the next subsection
 *   author plan   <id>                      what the rules and sources weigh
 *
 * Four calls carry a whole course: begin, write, done per subsection, finish.
 * Each prints only what the one before it did not. Mechanical minimum-content
 * and validation failures refuse completion; --staging records a draft without
 * calling it done. Subjective coverage and writing judgments remain warnings.
 *
 * No command here runs a model. The agent the author is already talking to
 * (Claude Code, or any CLI agent) is the one that writes: it reads the rules
 * once, keeps its work in one cached conversation, and hands context-free work
 * (concept files, drills, digging through a large source) to its own
 * subagents (.claude/agents/). These commands do what code does better and
 * for free: slicing the spec, listing sources safely, knowing what is
 * finished, and refusing to call a subsection finished when it is not.
 *
 * The workflow the agent follows is .claude/skills/create-course/SKILL.md.
 * Progress is .author/<id>/: map.txt (checked subsections and sources),
 * staged.txt (drafts), course.done, finish.done, roots.txt.
 * The generation log is written by tools/author-log.mjs from the session
 * transcript, never by the model.
 * ==========================================================================*/
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadSpec } from "./lib/spec.mjs";
import { digestRules, needsIn, needSections, availableNeeds } from "./lib/author-rules.mjs";
import { digest } from "./lib/digest.mjs";
import { parseFile } from "./lib/load.mjs";
import { readReader } from "./lib/reader.mjs";
import { roots as resolveRoots, list, index, outline, loadMap, mapPath } from "./lib/sources.mjs";
import { ENGINE, WORKSPACE, COURSES, STATE, DOCS, TEMPLATE } from "./lib/paths.mjs";
import { note } from "./author-log.mjs";

const est = s => Math.round(s.length / 4);   /* chars/4: an estimate, not a count */

const CC = loadSpec(join(DOCS, "create_course.md"));
const MT = loadSpec(join(DOCS, "material_truth.md"));
const WR = loadSpec(join(DOCS, "writing.md"));
/* AUTHOR_READER exists for the test suite, which cannot use a person's own
   profile; everything else reads the one beside the courses. */
const READER = process.env.AUTHOR_READER || join(COURSES, "_reader.yaml");

/* ----------------------------------------------------------------- steps --
 * Which spec headings each step needs, by heading id (lib/spec.mjs):
 * create_course.md (cc), material_truth.md (mt), writing.md (wr). A brief
 * prints the union for its steps. `lean` drops the evidence, the prose craft
 * and the self-review checklists, and keeps every rule a check enforces.
 */
const PROSE = ["1*", "2*", "3*", "4*", "4a*", "5*", "6*"];
const COURSE_STEPS = {
  calibrate: { cc: ["0", "1*", "3", "11*"], mt: ["6*", "9*"] },
  sequence:  { cc: ["0", "1*", "2*", "3"], mt: ["4*"] },
  taxonomy:  { cc: ["0", "1*", "2*", "5a"], mt: ["10*"] },
  conceptSet:{ cc: ["0", "1*", "5*"], mt: ["4*"] }
};
const WRITING_STEPS = {
  spine:     { cc: ["0", "1*", "6", "6.1", "6.2", "6.4", "6.6", "5a", "10*"], wr: PROSE,
               mt: ["2*", "3*", "5*", "10*"] },
  quizzes:   { cc: ["0", "1*", "6.5", "7*", "9"], mt: ["2*"] },
  tiers:     { cc: ["0", "1*", "6.3*", "14"], wr: PROSE, mt: ["7*"] },
  verify:    { cc: ["0", "1*", "12*"], mt: ["6*", "9*"] }
};
/* For the drafter subagent, which is pointed at these files rather than
   handed the whole brief. */
const DRAFTER = {
  concepts:  { cc: ["0", "1*", "5*"], mt: ["4*"] },
  variants:  { cc: ["0", "1*", "8*"], mt: ["8*"] }
};
const LEAN_DROPS = new Set(["12*", "14"]);

const union = (steps, key) => [...new Set(Object.values(steps).flatMap(s => s[key] || []))];
const specOf = (steps, lean = false) => [
  CC.pick(union(steps, "cc").filter(h => !(lean && LEAN_DROPS.has(h)))),
  !lean && union(steps, "wr").length ? WR.pick(union(steps, "wr")) : "",
  lean ? "" : "# Evidence (material_truth.md)\n\n" + MT.pick(union(steps, "mt"))
].filter(Boolean).join("\n\n");

/* ------------------------------------------------------------- arguments --*/
const [cmd, id, ...rest] = process.argv.slice(2);
const USAGE = "usage: author.mjs <begin|write|rules|done|finish|status|redo|reset|plan> <course-id> [args]";
const say = s => console.log(s);
/* Every refusal is logged where the course is, so the record of a build does
   not depend on the agent keeping a readable transcript. */
const fail = s => {
  console.log(s);
  try { if (existsSync(courseDir)) note(courseDir, `\`author ${process.argv.slice(2).join(" ")}\` → ${s}`); }
  catch { /* the log must never break a command */ }
  process.exit(1);
};
if (!cmd || !id) fail(USAGE);
const courseDir = join(COURSES, id);
if (!existsSync(courseDir)) fail(`courses/${id} does not exist (npm run new -- ${id} "Title")`);

const flag = f => rest.includes(f);
const positional = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--source");
const lean = flag("--lean"), research = flag("--research"), confident = flag("--confident");
const stateDir = join(STATE, id);
const marker = name => join(stateDir, `${name}.done`);
const stagedPath = join(stateDir, "staged.txt");
const rootsFile = join(stateDir, "roots.txt");
const today = new Date().toISOString().slice(0, 10);
/* Beside this file in a package, under tools/ in the repository. */
const script = name => {
  if (process.env.AUTHOR_TOOL_DIR) return join(process.env.AUTHOR_TOOL_DIR, `${name}.mjs`);
  const local = join(ENGINE, "tools", `${name}.mjs`);
  return existsSync(local) ? local : join(ENGINE, "scripts", `${name}.mjs`);
};

const diagnostics = [];
const runDiagnostic = (name, ...args) => {
  const result = spawnSync(process.execPath, [script(name), ...args], { encoding: "utf8" });
  diagnostics.push({ name, args, status: result.status, signal: result.signal,
    error: result.error?.message, stdout: result.stdout || "", stderr: result.stderr || "" });
  return result;
};
const saveDiagnostics = () => {
  mkdirSync(stateDir, { recursive: true });
  const path = join(stateDir, `finish-diagnostics-${Date.now()}.md`);
  writeFileSync(path, diagnostics.map(d => [
    `## ${d.name} ${d.args.join(" ")}`, `status: ${d.status ?? "unavailable"}`,
    `signal: ${d.signal || "none"}`, `error: ${d.error || "none"}`,
    "### stdout", "```", d.stdout, "```", "### stderr", "```", d.stderr, "```", ""
  ].join("\n")).join("\n"));
  const summary = diagnostics.map(d => `${d.name}: ${d.status === 0 ? "ok" : `failed (status ${d.status ?? "unavailable"})`}`).join(", ");
  say(`Subprocesses: ${summary}. Full diagnostics: ${path}`);
  return path;
};

/* The roots `begin` recorded, checked again rather than trusted. */
function savedRoots() {
  const extra = existsSync(rootsFile) ? readFileSync(rootsFile, "utf8").split("\n").filter(Boolean) : [];
  return resolveRoots(courseDir, extra.filter(existsSync));
}

/* ---------------------------------------------------------- placeholders --
 * `npm run new` copies the template's worked example. A file byte-identical
 * to its template copy is still the example and would read as finished work,
 * so `begin` removes it; anything edited is kept.
 */
function placeholders() {
  const tpl = TEMPLATE;
  const out = [];
  const walk = d => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      const rel = relative(tpl, p);
      if (rel === "course.yaml") continue;
      const mine = join(courseDir, rel);
      if (existsSync(mine) && readFileSync(mine).equals(readFileSync(p))) out.push(rel);
    }
  };
  if (existsSync(tpl)) walk(tpl);
  return out;
}

/* --------------------------------------------------------------- progress --*/
function progress() {
  const d = digest(courseDir);
  const map = loadMap(WORKSPACE, id);
  const staged = existsSync(stagedPath) ? new Set(readFileSync(stagedPath, "utf8").split("\n")
    .filter(Boolean).map(l => l.split(":")[0].trim())) : new Set();
  const key = u => relative(courseDir, u.file);
  return {
    d,
    done: d.subs.filter(u => key(u) in map),
    staged: d.subs.filter(u => staged.has(key(u))),
    todo: d.subs.filter(u => !(key(u) in map) && !staged.has(key(u))),
    courseDone: existsSync(marker("course")),
    finished: existsSync(marker("finish"))
  };
}

const thin = u => !u.spine ? "no spine blocks" : !u.quiz ? "no quiz items" : null;
function recordLine(path, file, sources = null) {
  const kept = existsSync(path) ? readFileSync(path, "utf8").split("\n")
    .filter(l => l && l.split(":")[0].trim() !== file) : [];
  if (sources) kept.push(`${file}: ${sources.join(" | ") || "NONE"}`);
  if (kept.length) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, kept.join("\n") + "\n"); }
  else rmSync(path, { force: true });
}
const researchFile = u => join(courseDir, "sources", "research",
  `${relative(join(courseDir, "sections"), dirname(u.file))}.md`);

/* Warnings cover judgments the mechanical checks cannot settle. */
const warn = text => {
  say(`warning: ${text}`);
  try { note(courseDir, `\`author ${process.argv.slice(2).join(" ")}\` → warning: ${text}`); }
  catch { /* the log must never break a command */ }
};

/* What to write next, in one line, so no command has to repeat the rules. */
function pointer(p) {
  if (!p.courseDone) return `Next: steps 0-4 above, then \`author write ${id}\`.`;
  const u = p.todo[0];
  if (!u) return p.staged.length
    ? `Next: finish staged ${p.staged.map(x => x.id).join(", ")} with \`author done ${id} <sN-M> <source>...\`, then finish.`
    : `Next: add useful practice variants, then \`author finish ${id}\`.`;
  const sec = p.d.sections.find(s => s.subs.includes(u));
  return [
    `Next: ${u.id} ${u.title}  (${p.done.length}/${p.d.subs.length} done)`,
    `  file:    courses/${id}/${relative(courseDir, u.file)}` +
      (u.blocks ? `  — has ${u.blocks} blocks, ${u.quiz} quiz items: read it and continue` : ""),
    `  section: ${sec.id} ${sec.title} (${sec.subs.map(x => x.id).join(", ")})`,
    research && !existsSync(researchFile(u))
      ? `  research: none for this section yet — course-researcher writes ` +
        `courses/${id}/${relative(courseDir, researchFile(u))}, one \`## \` per subsection title` : "",
    `  then:    author done ${id} ${u.id} <source>...`
  ].filter(Boolean).join("\n");
}

function briefText(which, reader) {
  const steps = which === "course" ? COURSE_STEPS : WRITING_STEPS;
  const procedure = which === "course" ? [
    research ? "0. Research, if the sources are thin: course-researcher works out the scope and saves " +
      "it to sources/research/scope.md (one `## ` per topic, in teaching order, with URLs). Use an " +
      "authoritative outline (syllabus, exam spec, standard textbook) where one exists and fits the " +
      "reader's goal; many subjects have none, so build it from the best reference material and say " +
      "so. Never present an invented outline as official." : "",
    "1. materials/expectations.md: every source topic taught, bridged, or under Skip with a reason.",
    "2. sections/NN-slug/_section.yaml for each section, and for each subsection a " +
      "sections/NN-slug/N-slug.yaml holding only its title.",
    "3. categories/<key>.yaml, or none if the material has no such kinds.",
    "4. The concept set: ideas used in three or more places. " +
      `course-drafter writes each concepts/<key>.yaml (rules: .author/${id}/rules-concepts.md).`,
    `Then \`author write ${id}\`, which gives you the writing rules and the first subsection.`
  ] : [
    "For each subsection, finished before the next begins:",
    "  - Read what it needs from its sources in one turn (parallel reads; part of a large file only).",
    "  - Write the file once: spine (§6), then quizzes (§7), then depth and apply (§6.3)" +
      (lean ? " — lean: keep optional material focused; retain any examples or depth needed for understanding" : "") + ".",
    "    Work every quiz answer out before writing it; `verified: <today>` only on answers you worked out.",
    "    A source topic you do not teach gets a YAML comment at the top of the file: " +
      "`# moved: <topic> -> sN-M` or `# skipped: <topic> — <reason>`.",
    confident ? "  - Re-derive every answer from scratch as if you had not written it; fix what differs." : "",
    `  - \`author done ${id} <sN-M> <source>...\` checks it and names the next one. ` +
      "Fix minimum-content and local validation errors before moving on; use --staging only for a draft.",
    "When none are left: add practice/<key>.yaml variants where another surface is needed " +
      `(rules: .author/${id}/rules-variants.md)` +
      (confident ? ", then independently check their answers" : "") +
      `; then \`author finish ${id}\`.`
  ];
  return [
    `# ${which === "course" ? "Steps 0-4: the shape of the course" : "Steps 5-7: writing it"}` +
      `${lean ? " (lean)" : ""}. Today is ${today}.`,
    "Keep these rules for the rest of the conversation; ask for them again only after a compaction.",
    procedure.filter(Boolean).join("\n"),
    `## The reader\n\n\`\`\`yaml\n${reader}\n\`\`\``,
    flag("--full-spec")
      ? `## The full spec (§-numbers are create_course.md)\n\n${specOf(steps)}`
      : digestRules(which, CC, [CC, MT, WR], { lean })
  ].join("\n\n");
}

function readerOrDie() {
  try { return readReader(READER); } catch (e) { fail(e.message); }
}

/* ------------------------------------------------------------- commands --*/
const commands = {

  /* The first call, and the only one that has to be made: what exists, what
     the sources are, and the rules for the part that is not written yet. */
  begin() {
    const sourceArgs = rest.flatMap((a, i) => a === "--source" ? [rest[i + 1]] : []);
    if (sourceArgs.some(s => !s || s.startsWith("--"))) fail("--source needs a path");
    let roots;
    try {
      roots = sourceArgs.length || !existsSync(rootsFile)
        ? resolveRoots(courseDir, sourceArgs, process.env.INIT_CWD || process.cwd())
        : savedRoots();
    } catch (e) { fail(e.message); }

    const left = placeholders();
    for (const rel of left) {
      rmSync(join(courseDir, rel));
      for (let d = dirname(join(courseDir, rel)); d !== courseDir && !readdirSync(d).length; d = dirname(d))
        rmSync(d, { recursive: true });
    }
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(rootsFile, roots.join("\n") + "\n");
    for (const [name, steps] of Object.entries(DRAFTER))
      writeFileSync(join(stateDir, `rules-${name}.md`), specOf({ [name]: steps }));

    const files = list(roots);
    const p = progress();
    if (left.length) say(`removed untouched template examples: ${left.join(", ")}`);
    say(`# ${id}: ${p.done.length}/${p.d.subs.length} subsections written` +
      `${p.finished ? ", finished" : ""}\n`);
    if (files.some(f => f.text)) {
      say("## Sources (read what a subsection needs when you reach it, not all of this now)\n");
      say(index(roots, files));
      say("\n### Headings of the document files\n");
      say(outline(roots, files) || "(none)");
      say("");
    } else {
      say("## Sources\n\nNone. Research them (course-researcher), rerun with --source PATH, or write " +
        "from what you know and mark every def, key and trap `source: generated`.\n");
    }
    say(`Drafter rules for subagents: .author/${id}/rules-concepts.md, .author/${id}/rules-variants.md\n`);
    if (p.courseDone || p.d.subs.length) {
      say(`The course already has its sections. \`author write ${id}\` for the writing rules.`);
      if (!p.courseDone) warn("steps 0-4 were never recorded; `author write` records them");
    } else {
      say(briefText("course", readerOrDie()));
    }
    say("\n" + pointer(p));
  },

  /* The second call: the writing rules, once, and the first subsection. */
  write() {
    const p = progress();
    if (!p.courseDone) {
      const missing = [
        !existsSync(join(courseDir, "materials", "expectations.md")) && "materials/expectations.md",
        !p.d.subs.length && "subsection files under sections/",
        !p.d.concepts.length && "concept files",
        p.d.concepts.some(c => !c.body) && "bodies in every concept file"
      ].filter(Boolean);
      if (missing.length) warn(`steps 0-4 look unfinished: no ${missing.join(", no ")}. ` +
        "Carry on if that is deliberate.");
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(marker("course"), today);
    }
    say(briefText("writing", readerOrDie()));
    say("\n" + pointer(progress()));
    say(`On-demand details: author rules ${id} [--need block:<type>|figure:<kind>|question:<kind>]`);
  },

  rules() {
    const p = progress();
    const next = p.todo[0] || p.staged[0];
    const explicit = rest.flatMap((a, i) => a === "--need" ? (rest[i + 1] || "").split(",") : []);
    if (explicit.some(n => !n || n.startsWith("--"))) fail("--need requires a value");
    let inferred = [];
    if (next) {
      try { inferred = needsIn(parseFile(next.file)); }
      catch (e) { fail(`cannot read ${next.id}: ${e.message}`); }
    }
    const needs = [...new Set(explicit.length ? explicit : inferred)];
    if (flag("--full-spec")) {
      say(`# Full writing spec for ${id}\n\n${specOf(WRITING_STEPS)}`);
      return;
    }
    if (!needs.length) {
      say(`No block, figure, or question shapes are declared in the next subsection. Use --need with one of: ${availableNeeds.join(", ")}`);
      return;
    }
    let selected;
    try { selected = needSections(CC, needs); } catch (e) { fail(e.message); }
    say(`# On-demand rules for ${next ? next.id : id}: ${needs.join(", ")}\n\n${selected}`);
  },

  /* Once per subsection, and the only thing it adds is the next one. */
  done() {
    const [sub, ...sources] = positional;
    if (!sub) fail(`usage: author done ${id} <sN-M> [source]...`);
    if (flag("--no-validate") && !flag("--staging"))
      fail("--no-validate requires --staging; a completed subsection needs local validation");
    const p = progress();
    const u = p.d.subs.find(x => x.id === sub);
    if (!u) fail(`no subsection ${sub} (have ${p.d.subs.map(x => x.id).join(", ")})`);
    const file = relative(courseDir, u.file);
    /* A changed subsection cannot keep an older completion or final marker
       when this attempt fails. A staged attempt lives outside the source map. */
    recordLine(mapPath(WORKSPACE, id), file);
    recordLine(stagedPath, file);
    rmSync(marker("finish"), { force: true });
    const why = thin(u);
    const problems = why ? [`${sub} has ${why}`] : [];
    let advice = [];
    if (!flag("--no-validate")) {
      const v = spawnSync(process.execPath, [script("validate"), id], { encoding: "utf8" });
      const mine = (v.stdout || "").split("\n")
        .filter(l => /✗/.test(l) && (l.includes(file) || l.includes(file.slice("sections/".length)) ||
          l.includes(`${sub} "`) || l.includes(`${sub}:`)));
      advice = (v.stdout || "").split("\n")
        .filter(l => /^\s+! /.test(l) && (l.includes(file) || l.includes(`${sub} "`) || l.includes(`${sub}:`)));
      if (mine.length) problems.push(...mine.map(l => l.trim()));
      if (v.error || v.signal || (v.status !== 0 && !/✗/.test(v.stdout || "")))
        problems.push(`validation could not complete: ${(v.stderr || v.stdout || v.error?.message || "unknown failure").trim()}`);
    }
    if (problems.length && !flag("--staging"))
      fail(`not finished: ${problems.join("\n")}. Fix these, or use --staging for a draft.`);
    if (problems.length) warn(`staging ${sub}: ${problems.join("; ")}`);
    if (advice.length) warn(`validate on ${sub}: ${advice.slice(0, 8).map(l => l.trim()).join("; ")}` +
      (advice.length > 8 ? `; ${advice.length - 8} more warnings` : ""));
    const unknown = sources.filter(x => !x.startsWith("/") || !existsSync(x.split("#")[0]));
    if (unknown.length) warn(`sources should be absolute paths that exist: ${unknown.join(", ")}`);
    recordLine(flag("--staging") ? stagedPath : mapPath(WORKSPACE, id), file, sources);
    if (flag("--staging")) say(`${sub} staged; it is not complete until done passes without --staging.`);
    say(pointer(progress()));
  },

  /* The last call: the three course-wide checks, cut to what needs doing. */
  finish() {
    const run = runDiagnostic;
    const refuse = message => { rmSync(marker("finish"), { force: true }); fail(`not finished: ${message}`); };
    const p = progress();
    const required = [
      !p.courseDone && "steps 0-4 were not recorded with author write",
      !existsSync(join(courseDir, "materials", "expectations.md")) && "materials/expectations.md is missing",
      !p.d.subs.length && "no subsection files",
      p.todo.length && `not written yet: ${p.todo.map(u => u.id).join(", ")}`,
      p.staged.length && `staged, not completed: ${p.staged.map(u => u.id).join(", ")}`,
      ...p.d.subs.filter(thin).map(u => `${u.id} has ${thin(u)}`)
    ].filter(Boolean);
    if (required.length) refuse(required.join("\n"));
    const g = run("gen-materials", id);
    say(`materials: ${g.status === 0 ? "generated" : "FAILED\n" + (g.stderr || g.stdout).trim()}`);
    if (g.status !== 0) { saveDiagnostics(); refuse("materials generation failed"); }
    const v = run("validate", id);
    const errs = (v.stdout || "").split("\n").filter(l => /✗/.test(l));
    const advice = (v.stdout || "").split("\n").filter(l => /^\s+! /.test(l));
    say(errs.length ? `validate: ${errs.length} errors\n${errs.slice(0, 30).join("\n")}` :
      v.status === 0 ? "validate: ok" : `validate: FAILED\n${(v.stderr || v.stdout || "unknown failure").trim()}`);
    if (v.status !== 0) { saveDiagnostics(); refuse("validation failed; fix the reported errors and run finish again"); }
    if (advice.length) warn(`validate: ${advice.length} quality warnings\n${advice.slice(0, 12).join("\n")}` +
      (advice.length > 12 ? `\n${advice.length - 12} more warnings in validate output` : ""));
    const c = run("coverage", id);
    const lines = (c.stdout || c.stderr || "").split("\n");
    const flagged = lines.filter(l => /^\s+! |missing:|^Named by no|^  \//.test(l));
    const summary = lines.filter(l => /topics below/.test(l)).join(" ") || "no report";
    say(`coverage: ${summary}` + (flagged.length ? `\n${flagged.slice(0, 60).join("\n")}` : ""));
    if (c.status !== 0) warn(`coverage could not be scored: ${(c.stderr || c.stdout || "unknown failure").trim()}`);
    saveDiagnostics();
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(marker("finish"), today);
    note(courseDir, `\`author finish ${id}\` → materials ${g.status === 0 ? "ok" : "FAILED"}, ` +
      `validate ${errs.length ? errs.length + " errors" : "ok"}, coverage: ${summary}`);
    say(`\nRecorded as finished. Review flagged coverage topics as teaching or Skip decisions. ` +
      `\`author redo ${id} <sN-M>\` to revise.`);
  },

  status() {
    const p = progress();
    say(`${id}: steps 0-4 ${p.courseDone ? "done" : "to do"} · ${p.done.length}/${p.d.subs.length} ` +
      `subsections${p.staged.length ? ` · ${p.staged.length} staged` : ""} · finish ${p.finished ? "done" : "to do"}`);
    if (p.todo.length) say(`to write: ${p.todo.map(u => u.id).join(", ")}`);
    const thinDone = p.done.filter(thin);
    if (thinDone.length) say(`recorded but thin: ${thinDone.map(u => `${u.id} (${thin(u)})`).join(", ")}`);
    const left = placeholders();
    if (left.length) say(`untouched template examples (begin removes them): ${left.join(", ")}`);
    say(pointer(p));
    if (flag("--digest") && p.d.text) say(`\nWhat the course already covers:\n${p.d.text}`);
  },

  redo() {
    if (!positional.length || positional.some(r => !/^(s\d+-\d+|course|finish)$/.test(r)))
      fail(`usage: author redo ${id} <sN-M|course|finish>...`);
    const d = digest(courseDir);
    const unknown = positional.filter(r => r.startsWith("s") && !d.subs.some(u => u.id === r));
    if (unknown.length) fail(`no subsection ${unknown.join(", ")}`);
    const files = new Set(d.subs.filter(u => positional.includes(u.id)).map(u => relative(courseDir, u.file)));
    const map = mapPath(WORKSPACE, id);
    if (files.size && existsSync(map)) {
      writeFileSync(map, readFileSync(map, "utf8").split("\n")
        .filter(l => !files.has(l.split(":")[0].trim())).join("\n"));
    }
    if (files.size) for (const file of files) recordLine(stagedPath, file);
    if (positional.includes("course")) rmSync(marker("course"), { force: true });
    if (files.size || positional.includes("finish")) rmSync(marker("finish"), { force: true });
    say(`reopened ${positional.join(", ")}: read each file, change what was asked, then ` +
      `\`author done ${id} <sN-M>\` again.`);
    say(pointer(progress()));
  },

  reset() {
    for (const f of [mapPath(WORKSPACE, id), stagedPath, marker("course"), marker("finish")]) rmSync(f, { force: true });
    say(`forgot progress for ${id}; the course files are untouched`);
  },

  /* What the rules weigh: they sit in context for the whole conversation. */
  plan() {
    const p = progress();
    let files = [];
    try { files = list(savedRoots()); } catch { /* sources moved since begin */ }
    const text = files.filter(f => f.text);
    for (const l of [false, true])
      say(`compact${l ? " --lean" : "       "}: begin ~${est(digestRules("course", CC, [CC, MT, WR], { lean: l }))} tok; ` +
          `write ~${est(digestRules("writing", CC, [CC, MT, WR], { lean: l }))} tok`);
    say(`full-spec          : begin ~${est(specOf(COURSE_STEPS))} tok; ` +
        `write ~${est(specOf(WRITING_STEPS))} tok`);
    const next = p.todo[0] || p.staged[0];
    if (next) try {
      const needs = needsIn(parseFile(next.file));
      if (needs.length) say(`next ${next.id} on-demand sections (${needs.join(", ")}): ` +
        `~${est(needSections(CC, needs))} tok`);
    } catch { /* a cost estimate also works on an unfinished draft */ }
    say(`sources: ${text.length} readable files, ~${Math.round(text.reduce((n, f) => n + f.bytes, 0) / 4)} tok ` +
      "in all (read per subsection, not at once)");
    say(`subsections: ${p.done.length} written, ${p.todo.length} left`);
    say("Estimates count rule text at four characters per token; reader, sources, and procedure are separate. " +
      "Use author rules for needed sections and --full-spec for the entire phase spec.");
  }
};

if (!commands[cmd]) fail(USAGE);
commands[cmd]();
