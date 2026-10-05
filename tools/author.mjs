#!/usr/bin/env node
import { resolveAuthorQuiz } from "./lib/author-bank.mjs";
/* Course commands select whole rules and exact sources, track workflow and
   structural progress, and never run a model. Policy lives in authoring/. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as YAML from "js-yaml";
import { loadContext, selectContext, shapeNeeds, estimateTokens } from "./lib/author-context.mjs";
import { readPlan, buildPacket, packetText, planCoverage, fileHash, planSignature, indexPlan, fingerprint } from "./lib/author-packets.mjs";
import { indexSources, readUnit } from "./lib/source-catalog.mjs";
import { loadWorkflow, flowState } from "./lib/author-flow.mjs";
import { digest } from "./lib/digest.mjs";
import { parseFile, loadCourse } from "./lib/load.mjs";
import { readReader } from "./lib/reader.mjs";
import { roots as resolveRoots, list, index, outline, loadMap, mapPath } from "./lib/sources.mjs";
import { ENGINE, WORKSPACE, COURSES, STATE, DOCS, TEMPLATE } from "./lib/paths.mjs";
import { note } from "./author-log.mjs";
import { reviewIndex, screenPackets, fullItems, saveIssues, saveCorrections, readReview, acceptReview, affectedItems, changedItems, reviewContext, recordReviewView } from "./lib/author-review.mjs";

const est = estimateTokens;
const context = loadContext(join(ENGINE, "authoring"));
const workflow = loadWorkflow(context);
/* AUTHOR_READER exists for the test suite, which cannot use a person's own
   profile; everything else reads the one beside the courses. */
const READER = process.env.AUTHOR_READER || join(COURSES, "_reader.yaml");

/* ------------------------------------------------------------- arguments --*/
const [cmd, id, ...rest] = process.argv.slice(2);
const USAGE = "usage: author.mjs <begin|sources|index|screen|issues|corrected|packet|batch|write|rules|pilot|done|reviewed|finish|status|redo|reset|plan> <course-id> [args]";
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
// Diagnostics must operate on the same workspace even when it came from CLI.
process.env.AUTHOR_WORKSPACE = WORKSPACE;
const valueFlags = new Set(["--source", "--need", "--mode", "--phase", "--role", "--sub", "--item", "--issue", "--workspace", "--handoff", "--section", "--ids", "--report"]);
const booleanFlags = new Set(["--all", "--confident", "--corrections", "--digest", "--expand", "--full-spec", "--lean", "--no-validate", "--repeat-warnings", "--research", "--show", "--staging", "--refresh", "--changed"]);
const unknownFlag = rest.find(a => a.startsWith("--") && !valueFlags.has(a) && !booleanFlags.has(a));
if (unknownFlag) fail(`unknown option ${unknownFlag}; use --workspace PATH to select the course workspace`);
if (!existsSync(courseDir)) fail(`courses/${id} does not exist (npm run new -- ${id} "Title")`);

const flag = f => rest.includes(f);
const positional = rest.filter((a, i) => !a.startsWith("--") && !valueFlags.has(rest[i - 1]));
const option = (name, fallback) => {
  const at = rest.indexOf(name);
  if (at < 0) return fallback;
  if (!rest[at + 1] || rest[at + 1].startsWith("--")) fail(`${name} needs a value`);
  return rest[at + 1];
};
const options = name => rest.flatMap((a, i) => a === name ? (rest[i + 1] || "").split(",") : []);
const lean = flag("--lean"), research = flag("--research"), confident = flag("--confident");
const stateDir = join(STATE, id);
const marker = name => join(stateDir, `${name}.done`);
const stagedPath = join(stateDir, "staged.txt");
const rootsFile = join(stateDir, "roots.txt");
const today = new Date().toISOString().slice(0, 10);
const settingsFile = join(stateDir, "settings.yaml");
const flowFile = join(stateDir, "flow.yaml");
const settings = existsSync(settingsFile) ? parseFile(settingsFile) || {} : {};
const requestedMode = option("--mode", settings.mode || "single");
const mode = requestedMode === "paried" ? "paired" : requestedMode;
if (!["single", "paired"].includes(mode)) fail("--mode needs single or paired");
const handoff = option("--handoff", settings.handoff || context.manifest.profiles?.[mode]?.handoff || "direct");
if (!["auto", "manual", "direct"].includes(handoff)) fail("--handoff needs auto or manual (direct for single)");
if (rest.includes("--mode") || rest.includes("--handoff")) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(settingsFile, YAML.dump({ ...settings, mode, handoff }));
}
const flowRecords = () => existsSync(flowFile) ? parseFile(flowFile) || {} : {};
const currentFlow = (p = progress()) => {
  const flow = flowState({ mode, handoff, progress: p, plan: readPlan(courseDir), records: flowRecords(), workflow });
  const review = readReview(stateDir);
  if (!review || ["plan", "migrate", "setup", "write"].includes(flow.stage)) return flow;
  if (review.status === "accepted") {
    try {
      if (!changedItems(review.accepted, reviewIndex(courseDir, stateDir, { assign: false, persist: false })).length) return flow;
    } catch (e) {
      if (!e.message.includes("missing authorId")) throw e;
    }
    return { ...flow, stage: "review", phase: "review", role: defaultRole("review"),
      action: "Accepted content changed; screen --changed, expand relevant IDs, then reviewed --all before finish." };
  }
  const stage = review.status === "issues" ? "correct" : "review";
  return { ...flow, stage, phase: stage === "correct" ? "write" : "review",
    role: mode === "single" ? "single" : stage === "correct" ? "writer" : "reviewer",
    action: stage === "correct" ? "Apply all consolidated corrections; record corrected --report, then checked done --all."
      : "Review screen --changed; expand all suspect IDs together, then reviewed --all after acceptance.",
    corrections: join(stateDir, "corrections.yaml") };
};
const defaultRole = phase => mode === "single" ? "single" : phase === "plan" ? "planner" : phase === "review" ? "reviewer" : "writer";
const selection = (phase, needs = [], full = false) => selectContext(context, { phase, role: option("--role", defaultRole(phase)), needs, full });
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
  const checksFile = join(stateDir, "checks.yaml");
  const checks = existsSync(checksFile) ? parseFile(checksFile) || {} : {};
  const plan = readPlan(courseDir);
  const planIndex = indexPlan(plan), freshness = new Map();
  const fresh = u => {
    if (!freshness.has(u.id)) freshness.set(u.id, !checks[key(u)] || (checks[key(u)].hash === fileHash(u.file) &&
      checks[key(u)].plan === planSignature(plan, u.id, planIndex)));
    return freshness.get(u.id);
  };
  const review = readReview(stateDir);
  let reviewFresh = !review || review.status === "accepted";
  if (review?.status === "accepted") {
    try { reviewFresh = !changedItems(review.accepted, reviewIndex(courseDir, stateDir, { assign: false, persist: false })).length; }
    catch (e) { if (!e.message.includes("missing authorId")) throw e; reviewFresh = false; }
  }
  return {
    d,
    done: d.subs.filter(u => key(u) in map && fresh(u)),
    staged: d.subs.filter(u => staged.has(key(u))),
    todo: d.subs.filter(u => (!(key(u) in map) || !fresh(u)) && !staged.has(key(u))),
    courseDone: existsSync(marker("course")),
    finished: existsSync(marker("finish")) && reviewFresh && d.subs.every(u => fresh(u))
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
  const path = join(stateDir, "warnings.yaml");
  const seen = existsSync(path) ? parseFile(path) || {} : {};
  const revision = [context.version, readPlan(courseDir).hash,
    ...digest(courseDir).subs.map(u => fileHash(u.file))].join("/");
  if (seen[text] === revision && !flag("--repeat-warnings")) return;
  seen[text] = revision;
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(path, YAML.dump(seen, { lineWidth: -1 }));
  say(`warning: ${text}`);
  try { note(courseDir, `\`author ${process.argv.slice(2).join(" ")}\` → warning: ${text}`); }
  catch { /* the log must never break a command */ }
};

/* What to write next, in one line, so no command has to repeat the rules. */
function pointer(p) {
  const flow = currentFlow(p);
  return [`Flow: ${flow.mode} · stage: ${flow.stage} · role: ${flow.role}` +
    (flow.subsection ? ` · subsection: ${flow.subsection}` : ""),
    ...(flow.batch ? [`Batch: ${flow.batch.id} · members: ${flow.batch.members.join(", ")} · assigned: ${flow.batch.tasks.join(", ")}`] : []),
    `Handoff: ${flow.handoff}`,
    `Next: ${flow.action}`,
    ...(flow.target ? [`  file: ${flow.target}`] : []),
    ...(flow.corrections ? [`  corrections: ${flow.corrections}`] : []),
    ...(flow.warnings || []).map(w => `warning: ${w}`)].join("\n");
}

function taskPacket(p, flow, phase, sub, plan, catalog) {
  const subsection = sub ? p.d.subs.find(s => s.id === sub) : undefined;
  if (sub && !subsection) fail(`no subsection ${sub}`);
  const refs = options("--source").map(value => {
    const match = /^([^/]+)\/([^@]+)(?:@L(\d+)-L?(\d+))?$/.exec(value);
    return match ? { source: match[1], unit: match[2], ...(match[3] ? { lines: [+match[3], +match[4]] } : {}) } : { source: value };
  });
  const packet = buildPacket({ context, plan, index: plan.index ||= indexPlan(plan), subsection, phase, mode,
    role: option("--role"), needs: options("--need"), item: option("--item"), issue: option("--issue"), sourceRefs: refs });
  packet.workflow = { mode: flow.mode, handoff: flow.handoff, stage: flow.stage, role: flow.role,
    ...(flow.subsection ? { subsection: flow.subsection } : {}), action: flow.action };
  packet.catalog = join(stateDir, "sources/catalog.yaml");
  if (flow.stage === "migrate") {
    packet.legacy = plan.legacy;
    packet.contract = join(context.root, "plan.md");
  }
  const record = flowRecords()[sub];
  const consolidated = readReview(stateDir);
  if (phase === "write" && (consolidated?.status === "issues" || (record?.status === "correct" && record.plan === planSignature(plan, sub)))) {
    const correctionPath = consolidated?.status === "issues" ? join(stateDir, "corrections.yaml") : record.corrections;
    const directives = parseFile(correctionPath) || {};
    packet.corrections = correctionPath;
    // A correction is not a request to reread the lesson's complete evidence.
    const findings = directives.findings || directives.items || [];
    packet.sourceRefs = refs.length ? refs : findings.flatMap(i => i.sourceRefs || []);
    delete packet.families; delete packet.prerequisites; delete packet.directives;
    if (packet.objectives) packet.objectives = packet.objectives.map(o => ({ id: o.id, outcome: o.outcome }));
    if (!packet.sourceRefs.length) packet.warnings.push("read correction evidence locators; request exact spans only if needed");
  }
  if (flag("--expand") && phase === "review" && !packet.sourceRefs?.length)
    packet.sourceRefs = (plan.data.objectives || []).filter(o => packet.objectives?.some(p => p.id === o.id)).flatMap(o => o.sources || []);
  if (phase === "write" || phase === "review") for (const ref of packet.sourceRefs || []) {
    if ((phase === "review" || packet.corrections) && !flag("--expand") && !ref.lines) {
      packet.warnings.push("source reference has no exact line span; source text was not included");
      continue;
    }
    try {
      const evidence = readUnit(catalog, ref);
      if (phase === "write" && !packet.corrections) {
        const path = join(stateDir, "sources", "excerpts", `${fingerprint(JSON.stringify(evidence))}.yaml`);
        mkdirSync(dirname(path), { recursive: true });
        if (!existsSync(path)) writeFileSync(path, packetText(evidence));
        (packet.sources ||= []).push({ reference: ref, locator: evidence.locator, excerpt: path,
          ...(evidence.warning ? { warning: evidence.warning } : {}) });
      } else (packet.sources ||= []).push(evidence);
    }
    catch (e) { packet.warnings.push(e.message); }
  }
  if (phase === "plan") packet.profile = context.manifest.profiles?.[mode];
  const name = [phase, sub, option("--item")?.replace(":", "-")].filter(Boolean).join("-");
  const path = join(stateDir, "packets", `${name}.yaml`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, packetText(packet));
  return { path, packet };
}

function briefText(which, reader) {
  const phase = which === "course" ? "plan" : "write";
  const selected = selection(phase, [], flag("--full-spec"));
  return [
    `# ${phase} · ${mode} · context ${context.version}`,
    `Reader:\n${reader.trim()}`,
    selected.text,
    ...selected.warnings.map(w => `warning: ${w}`)
  ].join("\n\n");
}

function catalogSources() {
  const cached = join(stateDir, "sources/catalog.yaml");
  if (!["begin", "sources"].includes(cmd) && !flag("--refresh") && existsSync(cached))
    return { ...parseFile(cached), directory: join(stateDir, "sources") };
  return indexSources(list(savedRoots()), join(stateDir, "sources"), { refresh: rest.includes("--refresh") });
}

function coverageSummary() {
  const report = planCoverage(readPlan(courseDir), progress().d.subs);
  say(`Plan coverage: ${report.percent == null ? "unavailable" : report.percent + "%"} (${report.total} required objectives). ${report.message}`);
  for (const row of report.rows.filter(r => !r.complete))
    say(`  ! ${row.id}: teaching ${row.teaching.length}, questions ${row.questions.length}, families ${row.assessed}/${row.families}`);
  return report;
}

function readerOrDie() {
  try { return readReader(READER); } catch (e) { fail(e.message); }
}

/* ------------------------------------------------------------- commands --*/
const commands = {

  index() {
    const indexed = reviewIndex(courseDir, stateDir);
    say(`Indexed ${indexed.entries.length} stable review IDs. Hashes are internal change-detection state.`);
  },

  screen(overrides = {}) {
    const indexed = reviewIndex(courseDir, stateDir), plan = readPlan(courseDir);
    if (indexed.bankCoverage) {
      const { course, errors } = loadCourse(courseDir);
      if (errors.length) fail(errors.join("\n"));
      indexed.blueprints = Object.values(course.assessmentBlueprints || {}).map(({ version, ...blueprint }) => blueprint);
    }
    const changed = overrides.changed ?? flag("--changed"), paths = [];
    const contextPath = join(stateDir, "review-context.yaml");
    writeFileSync(contextPath, packetText(reviewContext(indexed, plan)));
    const packets = screenPackets(indexed, plan, { section: option("--section"),
      changed, review: readReview(stateDir), contextPath, issuePath: join(stateDir, "corrections.yaml"),
      envelope: { mode, role: defaultRole("review"), rules: selection("review").modules.map(m => m.path) } });
    if (!changed) writeFileSync(join(stateDir, "screen-baseline.yaml"), packetText(indexed));
    for (const packet of packets) {
      const review = readReview(stateDir), old = review?.status === "accepted" ? review.accepted : review?.baseline;
      const lookup = { evidence: indexed.evidence, entries: [...indexed.entries, ...(old?.entries || []).filter(e => !indexed.entries.some(now => now.id === e.id))] };
      const path = join(stateDir, "packets", `screen-${packet.section || "changes"}-${packet.part || 1}.yaml`);
      mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, packetText(packet));
      paths.push(path);
      recordReviewView(stateDir, lookup, packet.items.map(i => i.id));
      say(`Screen: ${path} (~${est(packetText(packet))} tokens).`);
      if (flag("--show")) say(packetText(packet));
    }
    return paths;
  },

  issues() {
    const report = option("--report");
    if (!report) fail("issues needs --report PATH containing items with target IDs, issue and done");
    const indexed = reviewIndex(courseDir, stateDir);
    const review = saveIssues(stateDir, indexed, parseFile(report));
    const affected = affectedItems(indexed, review.issues.flatMap(i => i.targets));
    const records = flowRecords(), plan = readPlan(courseDir);
    for (const sub of new Set(affected.map(e => e.sub).filter(Boolean))) {
      const unit = digest(courseDir).subs.find(s => s.id === sub);
      records[sub] = { status: "correct", hash: fileHash(unit.file), plan: planSignature(plan, sub),
        corrections: join(stateDir, "corrections.yaml") };
    }
    mkdirSync(stateDir, { recursive: true }); writeFileSync(flowFile, packetText(records));
    rmSync(marker("finish"), { force: true });
    say(`Saved ${review.issues.length} consolidated issues: ${join(stateDir, "corrections.yaml")}.`);
  },

  corrected() {
    const report = option("--report");
    if (!report) fail("corrected needs --report PATH with results: [{issue, disposition, affected}]");
    const indexed = reviewIndex(courseDir, stateDir);
    const review = saveCorrections(stateDir, indexed, parseFile(report));
    say(`Correction results saved; ${review.changes.length} actual item changes detected, including unreported edits.`);
    say(`Changed IDs and issue links: ${join(stateDir, "change-report.yaml")}.`);
    say(`Run checked done --all, then return to the reviewer for screen --changed and acceptance.`);
  },

  /* The first call, and the only one that has to be made: what exists, what
     the sources are, and the rules for the part that is not written yet. */
  begin() {
    const sourceArgs = rest.flatMap((a, i) => a === "--source" ? [rest[i + 1]] : []);
    if (sourceArgs.some(s => !s || s.startsWith("--"))) fail("--source needs a path");
    let roots;
    try {
      roots = sourceArgs.length || !existsSync(rootsFile)
        ? resolveRoots(courseDir, sourceArgs, rest.includes("--workspace") ? WORKSPACE : process.env.INIT_CWD || process.cwd())
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
    writeFileSync(settingsFile, YAML.dump({ ...settings, mode, handoff }));
    for (const [name, need] of [["concepts", "concepts"], ["variants", "variants"]])
      writeFileSync(join(stateDir, `rules-${name}.md`), selection("write", [need]).text);
    const catalog = catalogSources();
    const p = progress();
    if (left.length) say(`removed untouched template examples: ${left.join(", ")}`);
    say(`# ${id}: ${p.done.length}/${p.d.subs.length} subsections written${p.finished ? ", finished" : ""}`);
    say(`Sources: ${catalog.sources.length}; catalog ${join(stateDir, "sources/catalog.yaml")}`);
    for (const warning of catalog.warnings || []) warn(warning);
    if (p.courseDone || p.d.subs.length) {
      say("Course artifacts exist; resume from the flow below.");
      if (!p.courseDone) warn("setup was not recorded; follow the reported stage");
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
      if (missing.length) warn(`setup looks unfinished: no ${missing.join(", no ")}. ` +
        "Carry on if that is deliberate.");
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(marker("course"), today);
    }
    say(briefText("writing", readerOrDie()));
    say("\n" + pointer(progress()));
    say(`Task packet: author packet ${id} --phase write [--sub sN-M]`);
  },

  sources() {
    const catalog = catalogSources();
    say(`Sources: ${catalog.sources.length}; ${join(stateDir, "sources/catalog.yaml")}`);
    for (const source of catalog.sources) {
      say(`${source.id}: ${source.path} (${source.format}, ${source.status}, ${source.units.length} units)`);
      if (flag("--all")) for (const unit of source.units) say(`  ${source.id}/${unit.id}: ${JSON.stringify(unit.locator)}`);
    }
    for (const warning of catalog.warnings || []) warn(warning);
  },

  packet() {
    if (options("--ids").length) {
      const indexed = reviewIndex(courseDir, stateDir), review = readReview(stateDir);
      const old = review?.status === "accepted" ? review.accepted : review?.baseline;
      const lookup = { evidence: indexed.evidence, entries: [...indexed.entries, ...(old?.entries || []).filter(e => !indexed.entries.some(now => now.id === e.id))] };
      const selected = fullItems(lookup, options("--ids"));
      for (const item of selected) if (!indexed.entries.some(e => e.id === item.id)) item.change = "deleted";
      const catalog = catalogSources(), plan = readPlan(courseDir);
      const refs = selected.flatMap(item => item.content.sourceRefs || []);
      for (const raw of options("--source")) {
        const m = /^([^/]+)\/([^@]+)(?:@L(\d+)-L?(\d+))?$/.exec(raw);
        if (!m) fail(`invalid source locator ${raw}`);
        refs.push({ source: m[1], unit: m[2], ...(m[3] ? { lines: [+m[3], +m[4]] } : {}) });
      }
      if (flag("--expand")) for (const item of selected) {
        const entry = lookup.entries.find(e => e.id === item.id);
        const lessons = plan.data.lessons || plan.data.subsections || [];
        const lesson = lessons.find(l => l.id === entry.sub);
        refs.push(...(lesson?.sources || lesson?.sourceRefs || []));
        refs.push(...(item.content.sources || []).filter(r => r?.source && r?.unit));
        if (item.kind === "plan") refs.push(...lessons.flatMap(l => l.sources || l.sourceRefs || []));
        for (const locus of item.content.source_loci || []) {
          if (locus && typeof locus === "object") { refs.push(locus); continue; }
          const m = /^([^/]+)\/([^@]+)(?:@L(\d+)-L?(\d+))?$/.exec(locus);
          if (m) refs.push({ source: m[1], unit: m[2], ...(m[3] ? { lines: [+m[3], +m[4]] } : {}) });
        }
      }
      const sources = [], warnings = [];
      for (const ref of new Map(refs.map(r => [JSON.stringify(r), r])).values()) {
        if (!ref.lines && !flag("--expand")) { warnings.push("Source needs an exact span or explicit --expand."); continue; }
        const evidence = readUnit(catalog, ref);
        if (evidence.warning?.includes("Source changed or disappeared")) fail("source evidence is stale; run author sources --refresh before expanding IDs");
        sources.push(evidence);
      }
      const phase = option("--phase", currentFlow().phase), role = option("--role", defaultRole(phase));
      const needs = selected.flatMap(item => item.kind === "block" ? [...shapeNeeds({ blocks: [item.content] })] :
        ["quiz", "practice", "bank"].includes(item.kind) ? [...shapeNeeds({ quiz: [item.content] })] : item.kind === "concept" ? ["concepts"] : []);
      const packet = { phase, mode, role, rules: selection(phase, needs).modules.map(m => m.path),
        ...(review?.status === "issues" ? { corrections: join(stateDir, "corrections.yaml") } : {}),
        reader: plan.data.reader || {}, items: selected, sources, warnings };
      const path = join(stateDir, "packets", "review-items.yaml");
      mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, packetText(packet));
      recordReviewView(stateDir, lookup, selected.map(i => i.id));
      const screened = join(stateDir, "screen-baseline.yaml");
      const baseline = existsSync(screened) ? parseFile(screened) : { entries: [] };
      const ids = new Set(selected.map(i => i.id));
      baseline.entries = [...baseline.entries.filter(e => !ids.has(e.id)), ...lookup.entries.filter(e => ids.has(e.id))];
      writeFileSync(screened, packetText(baseline));
      say(`Packet: ${path} (~${est(packetText(packet))} tokens).`);
      if (flag("--show")) say(packetText(packet));
      return;
    }
    const p = progress();
    const flow = currentFlow(p);
    const phase = option("--phase", flow.phase);
    const sub = option("--sub", phase === "plan" ? null : flow.subsection || (p.todo[0] || p.staged[0])?.id);
    const { path, packet } = taskPacket(p, flow, phase, sub, readPlan(courseDir), catalogSources());
    say(pointer(p));
    say(`Packet: ${path} (~${est(packetText(packet))} tokens; rule files separate)`);
    if (flag("--show")) say(packetText(packet));
  },

  batch() {
    const p = progress(), flow = currentFlow(p), plan = readPlan(courseDir), catalog = catalogSources();
    const assigned = flow.batch?.tasks || [];
    const tasks = (assigned.length ? assigned : [null]).map(sub => {
      const { path } = taskPacket(p, flow, flow.phase, sub, plan, catalog);
      const record = flowRecords()[sub];
      return { ...(sub ? { subsection: sub, target: p.d.subs.find(s => s.id === sub).file } : {}),
        packet: path, ...(flow.stage === "correct" && record?.corrections ? { corrections: record.corrections } : {}) };
    });
    const path = join(stateDir, "batch.yaml");
    const review = readReview(stateDir);
    const reviewPackets = flow.phase === "review" && flow.stage === "review"
      ? commands.screen({ changed: !!review?.baseline && (!!flow.batch?.recheck || ["recheck", "accepted"].includes(review.status)) }) : [];
    const profile = context.manifest.profiles?.[mode] || {};
    const task = { version: 1, course: id, mode, stage: flow.stage, role: flow.role,
      workspace: WORKSPACE, engine: ENGINE, command: script("author"),
      status_command: [process.execPath, script("author"), "status", id, "--workspace", WORKSPACE],
      entrypoint: join(context.root, context.manifest.entrypoint),
      orchestration: join(context.root, context.manifest.orchestration),
      profile, ...(flow.batch ? { batch: flow.batch.id, members: flow.batch.members } : {}),
      ...(reviewPackets.length ? { review_packets: reviewPackets, review_context: join(stateDir, "review-context.yaml") } : {}),
      ...(flow.stage === "migrate" ? { legacy: plan.legacy } : {}),
      ...(plan.hash ? { plan: { path: plan.path, hash: plan.hash } } : {}), tasks };
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(path, packetText(task));
    say(pointer(p));
    say(`Task: ${path} (~${est(packetText(task))} tokens; packet files separate)`);
  },

  rules() {
    const p = progress();
    const next = p.todo[0] || p.staged[0];
    const inferred = next ? shapeNeeds(parseFile(next.file)) : [];
    const selected = selection(option("--phase", currentFlow(p).phase), options("--need").length ? options("--need") : inferred, flag("--full-spec"));
    say(`# Context ${context.version}\n${selected.text}`);
    for (const warning of selected.warnings) warn(warning);
  },

  pilot() {
    const p = progress(), sub = option("--sub", p.d.subs[0]?.id);
    const unit = p.d.subs.find(s => s.id === sub);
    if (!unit) fail("pilot needs an existing subsection (--sub sN-M)");
    const result = runDiagnostic("audit-content", "--profile", "publish", "--sub", sub, id);
    const path = saveDiagnostics();
    const plan = readPlan(courseDir), planIndex = indexPlan(plan), lesson = planIndex.lessons.get(sub);
    const data = resolveAuthorQuiz(courseDir, parseFile(unit.file) || {}), issues = [];
    const objectives = lesson?.objectives || [];
    const families = lesson?.families || objectives.flatMap(id => planIndex.objectives.get(typeof id === "string" ? id : id.id)?.families || []);
    const tags = item => Array.isArray(item?.objectives) ? item.objectives : item?.objectives ? [item.objectives] : [];
    for (const id of objectives) {
      if (!(data.blocks || []).some(b => tags(b).includes(id))) issues.push(`missing teaching objective tag ${id}`);
      if (!(data.quiz || []).some(q => tags(q).includes(id))) issues.push(`missing question objective tag ${id}`);
    }
    for (const id of families.filter(id => !["excluded", "moved", "prerequisite"].includes(planIndex.families.get(id)?.disposition))) if (!(data.quiz || []).some(q => q.family === id || q.type === id || q.families?.includes(id)))
      issues.push(`missing assessed family tag ${id}`);
    if (!(data.quiz || []).length) issues.push("missing quiz");
    const ok = result.status === 0 && !result.error && !result.signal && !issues.length;
    writeFileSync(join(stateDir, "pilot.yaml"), YAML.dump({ subsection: sub, hash: fileHash(unit.file),
      ready: ok, diagnostics: path, issues }));
    say(`${ok ? "Pilot ready" : "Pilot needs attention"}: ${sub}; publish-format check only, not quality approval.`);
    for (const issue of issues) say(`warning: ${sub}: ${issue}`);
    if (result.status !== 0) say((result.stdout || result.stderr || result.error?.message || "audit failed").trim());
  },

  /* Once per subsection, and the only thing it adds is the next one. */
  done() {
    // Assign identity before recording file hashes, not after completion.
    reviewIndex(courseDir, stateDir);
    if (flag("--all")) {
      if (flag("--staging") || flag("--no-validate")) fail("done --all requires checked completion");
      const p = progress(), plan = readPlan(courseDir), planIndex = indexPlan(plan);
      if (!p.d.subs.length) fail("done --all needs existing subsections");
      const result = runDiagnostic("validate", id);
      if (result.status !== 0 || result.error || result.signal)
        fail(`not finished: ${(result.stdout || result.stderr || result.error?.message || "validation failed").trim()}`);
      const checks = existsSync(join(stateDir, "checks.yaml")) ? parseFile(join(stateDir, "checks.yaml")) || {} : {};
      const records = flowRecords(), map = loadMap(WORKSPACE, id);
      const catalogPath = join(stateDir, "sources/catalog.yaml");
      const sourcePaths = new Map((existsSync(catalogPath) ? parseFile(catalogPath)?.sources || [] : []).map(s => [s.id, s.path]));
      for (const u of p.d.subs) {
        const file = relative(courseDir, u.file), signature = planSignature(plan, u.id, planIndex);
        checks[file] = { hash: fileHash(u.file), plan: signature, status: "structural" };
        const lesson = planIndex.lessons.get(u.id);
        const refs = lesson?.sources || lesson?.sourceRefs || (lesson?.objectives || []).flatMap(id => planIndex.objectives.get(typeof id === "string" ? id : id.id)?.sources || []);
        const paths = [...new Set(refs.map(ref => sourcePaths.get(ref.source)).filter(Boolean))];
        map[file] = map[file]?.length ? map[file] : paths.length ? paths : ["NONE"];
        if (records[u.id]?.status === "correct") records[u.id] = { status: "recheck", hash: checks[file].hash, plan: signature };
        else if (records[u.id]?.hash !== checks[file].hash || records[u.id]?.plan !== signature) delete records[u.id];
      }
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(join(stateDir, "checks.yaml"), YAML.dump(checks));
      writeFileSync(flowFile, YAML.dump(records));
      writeFileSync(mapPath(WORKSPACE, id), Object.entries(map).map(([file, refs]) => `${file}: ${Array.isArray(refs) ? refs.join(" | ") : refs}`).join("\n") + "\n");
      rmSync(stagedPath, { force: true }); rmSync(marker("finish"), { force: true });
      say(`Checked ${p.d.subs.length} subsections in one validation pass.`);
      say(pointer(progress())); return;
    }
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
    const problems = [];
    if (why) warn(`${sub} has ${why}; this is a teaching decision, not a structural failure`);
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
    const path = join(stateDir, "checks.yaml");
    const checks = existsSync(path) ? parseFile(path) || {} : {};
    checks[file] = { hash: fileHash(u.file), plan: planSignature(readPlan(courseDir), u.id),
      status: flag("--staging") ? "staged" : "structural" };
    writeFileSync(path, YAML.dump(checks));
    const records = flowRecords();
    if (records[sub]?.status === "correct" && !flag("--staging"))
      records[sub] = { status: "recheck", hash: fileHash(u.file), plan: planSignature(readPlan(courseDir), sub) };
    else delete records[sub];
    writeFileSync(flowFile, YAML.dump(records));
    if (flag("--staging")) say(`${sub} staged; it is not complete until done passes without --staging.`);
    say(pointer(progress()));
  },

  reviewed() {
    const [sub] = positional;
    const p = progress();
    if (flag("--all")) {
      if (flag("--corrections")) fail("record correction outcomes individually; reviewed --all is a clean review declaration");
      if (p.done.length !== p.d.subs.length) fail("run checked done for every subsection before reviewed --all");
      acceptReview(stateDir, reviewIndex(courseDir, stateDir), option("--report") ? parseFile(option("--report")) : null);
      const records = flowRecords(), plan = readPlan(courseDir), planIndex = indexPlan(plan);
      for (const unit of p.d.subs) records[unit.id] = { status: "reviewed", hash: fileHash(unit.file), plan: planSignature(plan, unit.id, planIndex) };
      mkdirSync(stateDir, { recursive: true }); writeFileSync(flowFile, YAML.dump(records));
      rmSync(marker("finish"), { force: true });
      say("All clean review outcomes recorded by the agent; not an independent quality certificate.");
      say(pointer(progress())); return;
    }
    const unit = p.d.subs.find(s => s.id === sub);
    if (!unit) fail(`reviewed needs an existing subsection ID`);
    if (!p.done.some(s => s.id === sub)) fail(`run done for ${sub} before recording review`);
    const records = flowRecords();
    const corrections = flag("--corrections") ? join(courseDir, "materials", "review", `${sub}.yaml`) : null;
    if (corrections && !existsSync(corrections)) fail(`save correction directives at ${corrections} before recording them`);
    records[sub] = { status: corrections ? "correct" : "reviewed", hash: fileHash(unit.file),
      plan: planSignature(readPlan(courseDir), sub), ...(corrections ? { corrections } : {}) };
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(flowFile, YAML.dump(records));
    rmSync(marker("finish"), { force: true });
    say(`Review outcome recorded by the agent; not an independent quality certificate.`);
    say(pointer(progress()));
  },

  /* The last call: the three course-wide checks, cut to what needs doing. */
  finish() {
    const run = runDiagnostic;
    const refuse = message => { rmSync(marker("finish"), { force: true }); fail(`not finished: ${message}`); };
    const p = progress();
    const review = readReview(stateDir);
    if (review) {
      if (review.status !== "accepted") refuse("consolidated issues still need reviewer acceptance");
      if (changedItems(review.accepted, reviewIndex(courseDir, stateDir)).length)
        refuse("reviewed content changed; screen and review its current revision before finishing");
    }
    if (currentFlow(p).stage !== "finish") warn(`workflow still reports ${currentFlow(p).stage}; finish checks structure only, not semantic review`);
    const required = [
      !p.courseDone && "setup was not recorded with author write",
      !existsSync(join(courseDir, "materials", "expectations.md")) && "materials/expectations.md is missing",
      !p.d.subs.length && "no subsection files",
      p.todo.length && `not written yet: ${p.todo.map(u => u.id).join(", ")}`,
      p.staged.length && `staged, not completed: ${p.staged.map(u => u.id).join(", ")}`
    ].filter(Boolean);
    if (required.length) refuse(required.join("\n"));
    for (const u of p.d.subs.filter(thin)) warn(`${u.id} has ${thin(u)}; inspect the declared teaching decision`);
    coverageSummary();
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
    say(`\nRecorded as finished (structural checks only; semantic review is separate). ` +
      `Review flagged coverage topics as teaching or Skip decisions. ` +
      `\`author redo ${id} <sN-M>\` to revise.`);
  },

  status() {
    const p = progress();
    say(`${id}: setup ${p.courseDone ? "done" : "to do"} · ${p.done.length}/${p.d.subs.length} ` +
      `subsections${p.staged.length ? ` · ${p.staged.length} staged` : ""} · finish ${p.finished ? "done" : "to do"}`);
    if (p.todo.length) say(`to write: ${p.todo.map(u => u.id).join(", ")}`);
    const thinDone = p.done.filter(thin);
    if (thinDone.length) say(`recorded but thin: ${thinDone.map(u => `${u.id} (${thin(u)})`).join(", ")}`);
    const left = placeholders();
    if (left.length) say(`untouched template examples (begin removes them): ${left.join(", ")}`);
    coverageSummary();
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
    const records = flowRecords();
    for (const sub of positional) delete records[sub];
    if (positional.includes("course")) for (const sub of Object.keys(records)) delete records[sub];
    if (existsSync(flowFile)) writeFileSync(flowFile, YAML.dump(records));
    if (positional.includes("course")) rmSync(marker("course"), { force: true });
    if (files.size || positional.includes("finish")) rmSync(marker("finish"), { force: true });
    say(`reopened ${positional.join(", ")}: read each file, change what was asked, then ` +
      `\`author done ${id} <sN-M>\` again.`);
    say(pointer(progress()));
  },

  reset() {
    for (const f of [mapPath(WORKSPACE, id), stagedPath, marker("course"), marker("finish"), flowFile]) rmSync(f, { force: true });
    say(`forgot progress for ${id}; the course files are untouched`);
  },

  /* Estimates are explicitly approximate; no limits are imposed on teaching. */
  plan() {
    for (const phase of ["plan", "write", "review"]) {
      const selected = selection(phase);
      say(`${mode} ${phase}: ~${selected.estimatedTokens} instruction tokens (${selected.modules.map(m => m.id).join(", ")})`);
    }
    say(`full reference: ~${selection("write", [], true).estimatedTokens} tokens; on-demand, not a default prompt`);
    coverageSummary();
    say("Estimates use UTF-8 bytes/4; not measured model usage. Reader and selected sources are separate.");
  }

};

if (!commands[cmd]) fail(USAGE);
try { commands[cmd](); } catch (e) { fail(e.message); }
