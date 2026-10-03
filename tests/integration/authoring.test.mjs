#!/usr/bin/env node
/* The authoring pipeline's contracts that no browser can reach.
 *
 *   npm run test:integration -- authoring
 *
 * 1. The reader profile is refused rather than guessed. It is the one input
 *    every prompt carries and the one nothing downstream can check: a course
 *    written against a placeholder is calibrated to nobody, and it fails in the
 *    files it produced rather than at the moment the profile went missing.
 * 2. Phases select whole instruction modules through the central manifest.
 * 3. Mechanical invalidity fails, pedagogical choices warn, and recorded
 *    completion is invalidated when its local course or plan changes.
 * 4. The generation log is built from the transcript, not by the model.
 */
import { mkdtempSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readReader, peekReader } from "../../tools/lib/reader.mjs";
import { loadContext, selectContext } from "../../tools/lib/author-context.mjs";
import * as YAML from "js-yaml";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { summarize, entry, record } from "../../tools/author-log.mjs";
import { digest } from "../../tools/lib/digest.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const R = [];
const ck = (n, ok, x = "") => R.push({ n, ok, x });
const threw = fn => { try { fn(); return null; } catch (e) { return e.message; } };

const tmp = mkdtempSync(join(tmpdir(), "author-"));
const at = (name, body) => { const p = join(tmp, name); writeFileSync(p, body); return p; };

/* ------------------------------------------------------------ the profile --*/
const missing = threw(() => readReader(join(tmp, "nope.yaml")));
ck("a missing profile is refused", !!missing && /does not exist/.test(missing));
ck("and the refusal says where to get one", !!missing && /courses\/_reader\.yaml/.test(missing));

const blank = threw(() => readReader(at("blank.yaml",
  "reader:\n  background: UNSET\n  failures: UNSET\n")));
ck("a half-filled profile is refused", !!blank && /2 UNSET fields/.test(blank), blank);

const wrong = threw(() => readReader(at("wrong.yaml", "notes: something else\n")));
ck("a file that is not a profile is refused", !!wrong && /no `reader:` block/.test(wrong));

const good = at("good.yaml", "reader:\n  background: holds calculus\n  failures: [transfer]\n");
ck("a filled profile is returned as written",
   readReader(good).startsWith("reader:") && /transfer/.test(readReader(good)));

/* A cost estimate is not a prompt, so it must survive what a prompt refuses. */
ck("costing the work tolerates a missing profile",
   peekReader(join(tmp, "nope.yaml")) === "reader: UNSET");

/* Whole module selection is the authoring contract; there are no heading IDs. */
const context = loadContext(join(ROOT, "authoring"));
ck("whole-file context includes core and phase policy", selectContext(context, { phase: "plan" }).modules.some(m => m.id === "plan"));

/* ----------------------------------------------------------- the commands --*/
const cid = `_test-author-${process.pid}`;
const cdir = join(tmp, "courses", cid);
const state = join(tmp, ".author", cid);
const reader = at("reader.yaml", "reader:\n  goal: test\n  background: none\n");
const author = (...a) => spawnSync("node", [join(ROOT, "tools/author.mjs"), ...a],
  { encoding: "utf8", cwd: tmp, env: { ...process.env, AUTHOR_READER: reader, INIT_CWD: tmp } });
const put = (rel, body) => { const p = join(cdir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); };
try {
  spawnSync("node", [join(ROOT, "tools/new-course.mjs"), cid, "T"], { stdio: "ignore", cwd: tmp, env: { ...process.env, INIT_CWD: tmp } });
  mkdirSync(join(tmp, "src"), { recursive: true });
  writeFileSync(join(tmp, "src", "notes.md"), "# Notes\n\n## Alpha Topic\n\ntext\n");

  const unsafe = author("begin", cid, "--source", "/");
  ck("begin refuses an unsafe source", unsafe.status === 1 && /refused/.test(unsafe.stdout), unsafe.stdout);
  const b = author("begin", cid, "--source", "src");
  ck("begin removes the template's untouched examples",
     /removed untouched template examples: .*sections\/01-first-topic/.test(b.stdout) &&
     !existsSync(join(cdir, "sections/01-first-topic")), b.stdout.slice(0, 300));
  ck("begin indexes a relative --source and lists its headings",
     /Sources: 1/.test(b.stdout) && /catalog\.yaml/.test(b.stdout), b.stdout);
  ck("begin remembers the sources", readFileSync(join(state, "roots.txt"), "utf8").includes(join(tmp, "src")));
  ck("begin writes the concept and optional-variant drafter rules",
     existsSync(join(state, "rules-concepts.md")) && existsSync(join(state, "rules-variants.md")) &&
     /variant|practice/i.test(readFileSync(join(state, "rules-variants.md"), "utf8")));

  const brief = author("write", cid), lean = author("write", cid, "--lean");
  const full = author("write", cid, "--full-spec");
  const plan = author("plan", cid).stdout;
  const compactEstimate = /single write: ~(\d+)/.exec(plan);
  const fullEstimate = /full reference: ~(\d+)/.exec(plan);
  ck("plan measures compact and full rule payloads",
     !!compactEstimate && !!fullEstimate && Number(compactEstimate[1]) < Number(fullEstimate[1]), plan);
  ck("write carries the compact versioned rules and the reader",
     /# write/.test(brief.stdout) && /goal: test/.test(brief.stdout) &&
     /context [a-f0-9]{12}/.test(brief.stdout));
  ck("compact rules cost much less than the explicit full spec",
     brief.stdout.length < full.stdout.length * 0.4 && /asides/.test(full.stdout),
     `${brief.stdout.length} vs ${full.stdout.length}`);
  ck("legacy lean flag preserves the compact instruction packet", /context [a-f0-9]{12}/.test(lean.stdout));
  for (const [name, output] of [["full", full.stdout], ["lean full", author("write", cid, "--lean", "--full-spec").stdout]]) {
    ck(`${name} writing rules include phrase notes and the complexity judgement`,
       /Judging a passage/.test(output) && /asides:/.test(output) && /follows: true/.test(output));
    ck(`${name} writing rules allow combined help without caps`,
       /Use none, one, or several/.test(output) && /no numerical caps|no numerical cap|not.*cap|floor|ceilings|quota/i.test(output) &&
       !/Nothing earns all three|no apply tier/.test(output));
  }
  ck("write warns about unfinished shape but records it anyway",
     /warning: setup looks unfinished/.test(brief.stdout) && existsSync(join(state, "course.done")), brief.stdout.slice(0, 200));
  ck("begin gives the shape rules while the course has none",
     /# plan/.test(author("begin", cid).stdout) === false, "");

  put("materials/expectations.md", "x\n");
  put("materials/plan.yaml", "objectives: []\nlessons: []\n");
  put("sections/01-a/_section.yaml", "title: A\n");
  put("sections/01-a/1-one.yaml", "title: One\n");
  put("sections/01-a/2-two.yaml", "title: Two\n");
  put("concepts/idea.yaml", "term: Idea\nbody: <p>An idea.</p>\nreview: true\n");
  ck("the next subsection is named without another command",
     /stage: write.*subsection: s1-1/.test(author("write", cid).stdout));
  const requestedRules = author("rules", cid, "--need", "figure:plot", "--need", "question:multi");
  ck("rules returns requested figure and question sections",
     requestedRules.status === 0 && /plot/i.test(requestedRules.stdout) &&
     /response:/i.test(requestedRules.stdout) && !/## 11. `materials\/`/.test(requestedRules.stdout));
  ck("unknown deliberate shapes warn without blocking",
     author("rules", cid, "--need", "figure:unknown").status === 0);

  const thinDone = author("done", cid, "s1-1");
  ck("teaching minima warn without refusing a deliberate structural draft",
     thinDone.status === 0 && /no spine blocks/.test(thinDone.stdout) &&
     existsSync(join(state, "map.txt")), thinDone.stdout);
  const noValidate = author("done", cid, "s1-1", "--no-validate");
  ck("skipping validation requires an explicit staging override",
     noValidate.status === 1 && /requires --staging/.test(noValidate.stdout));
  const stagedThin = author("done", cid, "s1-1", "--staging", "--no-validate");
  ck("a staging override records a draft without counting it complete",
     stagedThin.status === 0 && /s1-1 staged/.test(stagedThin.stdout) &&
     existsSync(join(state, "staged.txt")) && !existsSync(join(state, "map.txt")) &&
     /1 staged/.test(author("status", cid).stdout), stagedThin.stdout);
  put("sections/01-a/1-one.yaml", "title: One\nblocks:\n  - t: p\n    text: x\nquiz:\n  - type: recall\n    q: q\n");
  put("sections/01-a/2-two.yaml", "title: Two\nblocks:\n  - t: p\n    h: x\n");
  ck("rules detects the next subsection's declared block shape",
     /block|Blocks/i.test(author("rules", cid).stdout));
  const src = join(tmp, "src", "notes.md");
  const local = author("done", cid, "s1-1", `${src}#Alpha Topic`);
  ck("done refuses local validation errors and clears the staged record",
     local.status === 1 && /question.*needs a and why/.test(local.stdout) &&
     !existsSync(join(state, "map.txt")) && !existsSync(join(state, "staged.txt")), local.stdout);
  const stagedLocal = author("done", cid, "s1-1", `${src}#Alpha Topic`, "--staging");
  ck("staging can carry local validation errors forward explicitly",
     stagedLocal.status === 0 && /staging s1-1/.test(stagedLocal.stdout) &&
     existsSync(join(state, "staged.txt")) && !existsSync(join(state, "map.txt")), stagedLocal.stdout);
  const odd = author("done", cid, "s1-2", "notes.md", "--staging", "--no-validate");
  ck("a doubtful source path remains a warning",
     odd.status === 0 && /warning: sources should be absolute/.test(odd.stdout), odd.stdout);

  const fin = author("finish", cid);
  ck("finish refuses staged and thin work without writing its marker",
     fin.status === 1 && /staged, not completed/.test(fin.stdout) &&
     !existsSync(join(state, "finish.done")), fin.stdout.slice(0, 400));

  const redo = author("redo", cid, "s1-1");
  ck("redo reopens only what it names, and the finish",
     /stage: write.*subsection: s1-1/.test(author("status", cid).stdout) &&
     readFileSync(join(state, "staged.txt"), "utf8").includes("2-two.yaml") && !existsSync(join(state, "finish.done")),
     redo.stdout);
  ck("status reports staged progress separately", /setup done · 0\/2 subsections · 1 staged/.test(author("status", cid).stdout));
  ck("reset forgets progress, keeps files",
     author("reset", cid).status === 0 && !existsSync(join(state, "course.done")) &&
     !existsSync(join(state, "staged.txt")) && existsSync(join(cdir, "sections/01-a/1-one.yaml")));

  /* ---------------------------------------------------- courses elsewhere --
   * Packaged for an agent, the engine is the package and the courses belong
   * to the folder the author works in. AUTHOR_WORKSPACE is that folder. */
  const ws = join(tmp, "elsewhere");
  mkdirSync(ws, { recursive: true });
  const away = (...a) => spawnSync("node", [join(ROOT, "tools/author.mjs"), ...a],
    { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws, AUTHOR_READER: reader } });
  spawnSync("node", [join(ROOT, "tools/new-course.mjs"), "away", "Away"],
    { stdio: "ignore", env: { ...process.env, AUTHOR_WORKSPACE: ws } });
  ck("a course can live outside the repository", existsSync(join(ws, "courses/away/course.yaml")) &&
     !existsSync(join(ROOT, "courses/away")));
  const ab = away("begin", "away");
  ck("its progress lives beside it, not in the repository",
     ab.status === 0 && existsSync(join(ws, ".author/away/rules-variants.md")) &&
     !existsSync(join(ROOT, ".author/away")), ab.stdout + ab.stderr);
  ck("and the spec still comes from the engine", /context [a-f0-9]{12}/.test(away("begin", "away").stdout));

  /* The public demo is a validated, source-free fixture. Use its real content
     so finish proves the successful path without a brittle miniature course. */
  const completeWs = join(tmp, "complete-workspace");
  const completeDir = join(completeWs, "courses", "complete");
  const completeState = join(completeWs, ".author", "complete");
  mkdirSync(dirname(completeDir), { recursive: true });
  cpSync(join(ROOT, "courses", "demo"), completeDir, { recursive: true });
  const complete = (...a) => spawnSync("node", [join(ROOT, "tools/author.mjs"), ...a],
    { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: completeWs, AUTHOR_READER: reader } });
  ck("a complete course can record its initial shape", complete("write", "complete", "--lean").status === 0);
  const subs = digest(completeDir).subs;
  mkdirSync(completeState, { recursive: true });
  writeFileSync(join(completeState, "map.txt"), subs.slice(0, -1)
    .map(u => `${relative(completeDir, u.file)}: NONE`).join("\n") + "\n");
  const early = complete("finish", "complete");
  ck("finish refuses missing subsection work and leaves no marker",
     early.status === 1 && /not written yet/.test(early.stdout) &&
     !existsSync(join(completeState, "finish.done")), early.stdout);
  const last = complete("done", "complete", subs.at(-1).id);
  ck("done accepts a subsection that passes local validation",
     last.status === 0 && /stage: plan/.test(last.stdout), last.stdout);
  const finished = complete("finish", "complete");
  ck("finish succeeds after all required work and validation pass",
     finished.status === 0 && /validate: ok/.test(finished.stdout) &&
     /coverage|Coverage/.test(finished.stdout) &&
     /Recorded as finished/.test(finished.stdout) && existsSync(join(completeState, "finish.done")),
     finished.stdout.slice(0, 500));
  const lastFile = subs.at(-1).file;
  const validLast = readFileSync(lastFile, "utf8");
  writeFileSync(lastFile, "title: Temporarily broken\nblocks:\n  - t: invalid-renderer\n");
  const regressed = complete("done", "complete", subs.at(-1).id);
  ck("a refused redo revokes prior subsection and finish records",
     regressed.status === 1 && /unknown block type/.test(regressed.stdout) &&
     !readFileSync(join(completeState, "map.txt"), "utf8").includes(relative(completeDir, lastFile)) &&
     !existsSync(join(completeState, "finish.done")), regressed.stdout.slice(0, 400));
  writeFileSync(lastFile, validLast);
  ck("the repaired subsection can complete again", complete("done", "complete", subs.at(-1).id).status === 0);
  ck("the repaired course can finish again", complete("finish", "complete").status === 0 &&
     existsSync(join(completeState, "finish.done")));
  const diagnosticTools = join(tmp, "diagnostic-tools");
  mkdirSync(diagnosticTools, { recursive: true });
  const longError = "stderr-only diagnostic ".repeat(1800);
  writeFileSync(join(diagnosticTools, "gen-materials.mjs"),
    `process.stderr.write(${JSON.stringify(longError)}); process.exit(7);\n`);
  const failedFinish = spawnSync("node", [join(ROOT, "tools/author.mjs"), "finish", "complete"], {
    encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: completeWs, AUTHOR_READER: reader,
      AUTHOR_TOOL_DIR: diagnosticTools }
  });
  const reportMatch = failedFinish.stdout.match(/Full diagnostics: (.+)$/m);
  const reportPath = reportMatch?.[1];
  const reportText = reportPath && readFileSync(reportPath, "utf8");
  ck("finish reports nonzero subprocess status and diagnostic path",
    failedFinish.status === 1 && /gen-materials: failed \(status 7\)/.test(failedFinish.stdout) && !!reportText,
    failedFinish.stdout);
  ck("the diagnostic report keeps stderr-only output beyond the display cap",
    reportText?.includes("status: 7") && reportText.includes("### stdout\n```\n\n```") &&
    reportText.includes(longError) && reportText.length > 30000,
    reportText?.slice(-400));
  const metaFile = join(completeDir, "course.yaml");
  const validMeta = readFileSync(metaFile, "utf8");
  writeFileSync(metaFile, validMeta.replace(/^    - \{re:.*$/m, "    - {re: '[', cls: tok-n}"));
  const invalidFinish = complete("finish", "complete");
  ck("finish rejects validation errors and removes an old completion marker",
     invalidFinish.status === 1 && /validate: .* errors/.test(invalidFinish.stdout) &&
     !existsSync(join(completeState, "finish.done")), invalidFinish.stdout.slice(0, 500));

  // Exercise real CLI packets in both modes, including bounded catalog evidence.
  put("materials/plan.yaml", "objectives:\n  - {id: a, outcome: Apply arithmetic}\nlessons:\n  - {id: s1-1, objectives: [a]}\n");
  put("sections/01-a/1-one.yaml", "title: Intro\nblocks:\n  - {t: p, c: Original teaching, objectives: [a]}\nquiz:\n  - {type: Compute, q: Original question, a: Answer, objectives: [a]}\n");
  const planPacket = author("packet", cid, "--phase", "plan", "--mode", "paired");
  ck("paired CLI planning packet records the planner role", planPacket.status === 0 &&
    YAML.load(readFileSync(join(state, "packets/plan.yaml"), "utf8")).role === "planner", planPacket.stderr);
  const reviewPacket = author("packet", cid, "--phase", "review", "--sub", "s1-1", "--item", "block:1", "--mode", "paired");
  ck("real CLI review can select one item", reviewPacket.status === 0 &&
    YAML.load(readFileSync(join(state, "packets/review-s1-1-block-1.yaml"), "utf8")).item.content.c === "Original teaching", reviewPacket.stderr);
  const singlePacket = author("packet", cid, "--phase", "write", "--sub", "s1-1", "--mode", "single");
  ck("single CLI writes directly through the single role", singlePacket.status === 0 &&
    YAML.load(readFileSync(join(state, "packets/write-s1-1.yaml"), "utf8")).role === "single", singlePacket.stderr);

  /* --------------------------------------------------------------- the log --*/
  const sid = "abc-123";
  const tr = join(tmp, `${sid}.jsonl`);
  const ev = o => JSON.stringify({ timestamp: "2026-09-17T10:00:00Z", ...o });
  writeFileSync(tr, [
    ev({ type: "assistant", message: { id: "m1", model: "claude-sonnet-5",
      usage: { input_tokens: 5, cache_read_input_tokens: 1000, cache_creation_input_tokens: 50, output_tokens: 7 },
      content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command: `node tools/author.mjs begin ${cid}` } },
                { type: "tool_use", id: "t2", name: "Bash", input: { command: `node tools/author.mjs done ${cid} s1-1` } },
                { type: "tool_use", id: "t3", name: "Read", input: { file_path: "/x/.env" } }] } }),
    ev({ type: "assistant", message: { id: "m1", model: "claude-sonnet-5", usage: { input_tokens: 5 }, content: [] } }),
    ev({ type: "user", message: { content: [
      { type: "tool_result", tool_use_id: "t2", content: "not finished: s1-1 has no quiz items" },
      { type: "tool_result", tool_use_id: "t3", is_error: true, content: "Permission to read denied" }] } })
  ].join("\n"));
  mkdirSync(join(tmp, sid, "subagents"), { recursive: true });
  writeFileSync(join(tmp, sid, "subagents", "agent-1.jsonl"), ev({ type: "assistant", message: { id: "s1",
    model: "claude-haiku-4-5", usage: { input_tokens: 3, output_tokens: 9 }, content: [] } }));
  const sum = summarize(tr);
  ck("the log finds the course from `author begin`", sum.courses.join() === cid, sum.courses.join());
  ck("the log counts each message once, subagents included",
     sum.models["claude-sonnet-5"].calls === 1 && sum.models["claude-haiku-4-5"].output === 9, JSON.stringify(sum.models));
  ck("the log records refusals and author refusals",
     sum.told.some(t => /^refused: Read \/x\/\.env/.test(t)) &&
     sum.told.some(t => /^author refused: done .* not finished: s1-1 has no quiz items/.test(t)), sum.told.join(" | "));
  record(cdir, sid, sum);
  record(cdir, sid, sum);
  const logText = readFileSync(join(cdir, ".authoring-log.md"), "utf8");
  ck("a session's entry is replaced, not repeated",
     (logText.match(/<!-- session abc-123 -->/g) || []).length === 1 && /\| claude-sonnet-5 \| 1 \| 5 \| 1k \| 50 \| 7 \|/.test(logText),
     logText);
  const hook = spawnSync("node", [join(ROOT, "tools/author-log.mjs")],
    { input: JSON.stringify({ session_id: "hook-1", transcript_path: tr }), encoding: "utf8", cwd: tmp, env: { ...process.env, INIT_CWD: tmp } });
  ck("the hook writes the log and prints nothing",
     hook.status === 0 && hook.stdout === "" && /session hook-1/.test(readFileSync(join(cdir, ".authoring-log.md"), "utf8")));
  ck("a broken hook input is ignored quietly",
     spawnSync("node", [join(ROOT, "tools/author-log.mjs")], { input: "not json", encoding: "utf8" }).status === 0);

  const codex = join(tmp, "codex.jsonl");
  const ce = (type, payload) => ev({ type, payload });
  writeFileSync(codex, [
    ce("session_meta", { id: "codex-session" }),
    ce("turn_context", { turn_id: "turn-1", model: "gpt-6-sol" }),
    ce("response_item", { type: "custom_tool_call", call_id: "call-1", name: "exec",
      input: `await tools.exec_command({cmd:"node tools/author.mjs begin ${cid}"})` }),
    ce("token_usage_record", { turn_id: "turn-1", response_id: "response-1",
      usage: { input_tokens: 20, cached_input_tokens: 8, cache_write_input_tokens: 2, output_tokens: 4 } }),
    ce("token_usage_record", { turn_id: "turn-1", response_id: "response-1",
      usage: { input_tokens: 20, output_tokens: 4 } }),
    ce("response_item", { type: "custom_tool_call_output", call_id: "call-1",
      output: [{ type: "text", text: "not finished: missing source" }] })
  ].join("\n"));
  const codexSum = summarize(codex);
  ck("Codex log counts recorded usage once and finds the authored course",
     codexSum.courses.join() === cid && codexSum.models["gpt-6-sol"].calls === 1 &&
     codexSum.models["gpt-6-sol"].cacheRead === 8 && codexSum.turns === 1,
     JSON.stringify(codexSum));
  ck("Codex log includes author refusals from tool output",
     codexSum.told.some(t => t.includes("not finished: missing source")), codexSum.told.join(" | "));
  const codexRun = spawnSync("node", [join(ROOT, "tools/author-log.mjs")],
    { input: JSON.stringify({ session_id: "codex-hook", transcript_path: codex }), encoding: "utf8",
      cwd: tmp, env: { ...process.env, INIT_CWD: tmp } });
  ck("Codex hook writes usage to the course log without model-visible output",
     codexRun.status === 0 && codexRun.stdout === "" &&
     /session codex-hook/.test(readFileSync(join(cdir, ".authoring-log.md"), "utf8")));
  const packagedRun = spawnSync("node", [join(ROOT, "plugin/scripts/author-log.mjs")],
    { input: JSON.stringify({ session_id: "plugin-codex-hook", transcript_path: codex }),
      encoding: "utf8", cwd: tmp, env: { ...process.env, INIT_CWD: tmp } });
  ck("packaged hook accepts Codex transcripts too",
     packagedRun.status === 0 && packagedRun.stdout === "" &&
     /session plugin-codex-hook/.test(readFileSync(join(cdir, ".authoring-log.md"), "utf8")));
  const hookCommand = JSON.parse(readFileSync(join(ROOT, ".codex/hooks.json"), "utf8")).hooks.Stop[0].hooks[0].command;
  const codexHook = spawnSync(hookCommand, { shell: true, cwd: join(ROOT, "tests"),
    input: "{}", encoding: "utf8" });
  ck("Codex hook launches from a repository subdirectory without Claude variables",
     codexHook.status === 0 && codexHook.stdout === "" && codexHook.stderr === "",
     codexHook.stderr);
} finally {
  rmSync(cdir, { recursive: true, force: true });
  rmSync(state, { recursive: true, force: true });
}

rmSync(tmp, { recursive: true, force: true });

const bad = R.filter(r => !r.ok);
for (const r of bad) console.error(`       ✗ ${r.n}  ${r.x}`);
console.log(`${bad.length ? "FAIL" : "ok  "} author     ${R.length - bad.length}/${R.length} checks`);
process.exitCode = bad.length ? 1 : 0;
