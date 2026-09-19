#!/usr/bin/env node
/* The authoring pipeline's contracts that no browser can reach.
 *
 *   node tools/test-author.mjs
 *
 * 1. The reader profile is refused rather than guessed. It is the one input
 *    every prompt carries and the one nothing downstream can check: a course
 *    written against a placeholder is calibrated to nobody, and it fails in the
 *    files it produced rather than at the moment the profile went missing.
 * 2. The spec still slices. Phases address create_course.md by heading id, so
 *    renaming a heading silently empties a prompt — the prefix would still
 *    build, just without the rules it was supposed to carry.
 * 3. The commands keep the agent honest for free: a subsection is recorded as
 *    finished only when it has a spine and quizzes, course-level and finishing
 *    steps only when their conditions hold, unsafe sources are refused, and
 *    progress survives and can be reopened precisely.
 * 4. The generation log is built from the transcript, not by the model.
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readReader, peekReader } from "./lib/reader.mjs";
import { loadSpec } from "./lib/spec.mjs";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { summarize, entry, record } from "./author-log.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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

/* ------------------------------------------------------------- the slices --*/
const CC = loadSpec(join(ROOT, "docs/create_course.md"));
const MT = loadSpec(join(ROOT, "docs/material_truth.md"));

/* Every heading id named by a phase in author.mjs, read from the file itself so
   this cannot drift from the table it is checking. */
const src = await import("node:fs").then(fs => fs.readFileSync(join(ROOT, "tools/author.mjs"), "utf8"));
const idsIn = key => [...src.matchAll(new RegExp(`${key}: \\[([^\\]]*)\\]`, "g"))]
  .flatMap(m => [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1].replace(/\*$/, "")));

for (const [name, spec, ids] of [["create_course", CC, idsIn("cc")], ["material_truth", MT, idsIn("mt")]]) {
  const gone = [...new Set(ids)].filter(id => !spec.ids.includes(id));
  ck(`every ${name} heading a phase names still exists`, gone.length === 0,
     gone.length ? "missing: " + gone.join(", ") : [...new Set(ids)].length + " headings");
}

/* §1 is in every phase's prefix, so an empty §1 is an uncalibrated build. */
ck("§1 carries the reader form", /reader:/.test(CC.pick(["1"])));

/* A heading that owns numbered subsections carries its rules in them, not in
   its own preamble: §1's D1-D7 table is §1.1, the drill bank's two hardest
   instructions are §8.1 and §8.2. `pick("8")` returns the preamble alone, so a
   phase naming the parent alone silently ships a prompt with those rules
   missing — the build still passes and the course is simply worse. Naming a
   parent shallow is legal only when the phase also picks subsections of it by
   hand, which is how phase 4 takes §6.1/6.2/6.4 and leaves §6.3 to phase 7. */
const parents = new Set(CC.ids.filter(id => /^\d+\.\d+$/.test(id)).map(id => id.split(".")[0]));
const dropped = [];
for (const m of src.matchAll(/cc: \[([^\]]*)\]/g)) {
  const ids = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
  for (const id of ids) {
    if (id.endsWith("*") || !parents.has(id)) continue;
    if (!ids.some(o => o.replace(/\*$/, "").startsWith(id + "."))) dropped.push(id);
  }
}
ck("no phase drops a heading's subsections", dropped.length === 0,
   dropped.length ? "named shallow with no subsection picked: " + [...new Set(dropped)].join(", ")
                  : [...parents].sort().join(",") + " have subsections");

/* ----------------------------------------------------------- the commands --*/
const cid = `_test-author-${process.pid}`;
const cdir = join(ROOT, "courses", cid);
const state = join(ROOT, ".author", cid);
const reader = at("reader.yaml", "reader:\n  goal: test\n  background: none\n");
const author = (...a) => spawnSync("node", [join(ROOT, "tools/author.mjs"), ...a],
  { encoding: "utf8", cwd: tmp, env: { ...process.env, AUTHOR_READER: reader, INIT_CWD: tmp } });
const put = (rel, body) => { const p = join(cdir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); };
try {
  spawnSync("node", [join(ROOT, "tools/new-course.mjs"), cid, "T"], { stdio: "ignore" });
  mkdirSync(join(tmp, "src"), { recursive: true });
  writeFileSync(join(tmp, "src", "notes.md"), "# Notes\n\n## Alpha Topic\n\ntext\n");

  const unsafe = author("begin", cid, "--source", "/");
  ck("begin refuses an unsafe source", unsafe.status === 1 && /refused/.test(unsafe.stdout), unsafe.stdout);
  const b = author("begin", cid, "--source", "src");
  ck("begin removes the template's untouched examples",
     /removed untouched template examples: .*sections\/01-first-topic/.test(b.stdout) &&
     !existsSync(join(cdir, "sections/01-first-topic")), b.stdout.slice(0, 300));
  ck("begin indexes a relative --source and lists its headings",
     /src\/notes\.md|notes\.md/.test(b.stdout) && /- Alpha Topic/.test(b.stdout), b.stdout);
  ck("begin remembers the sources", readFileSync(join(state, "roots.txt"), "utf8").includes(join(tmp, "src")));
  ck("begin writes the drafter's rules", existsSync(join(state, "rules-drills.md")) &&
     /^## 8\. The drill bank/m.test(readFileSync(join(state, "rules-drills.md"), "utf8")));

  const brief = author("write", cid), lean = author("write", cid, "--lean");
  ck("write carries the writing rules, the reader and the spec",
     /Steps 5-7/.test(brief.stdout) && /goal: test/.test(brief.stdout) && /## The spec/.test(brief.stdout));
  ck("a lean brief is much smaller", lean.stdout.length < brief.stdout.length * 0.75 && /keep optional material focused/.test(lean.stdout),
     `${lean.stdout.length} vs ${brief.stdout.length}`);
  for (const [name, output] of [["full", brief.stdout], ["lean", lean.stdout]]) {
    ck(`${name} writing rules include phrase notes and the complexity judgement`,
       /Judging a passage/.test(output) && /asides:/.test(output) && /follows: true/.test(output));
    ck(`${name} writing rules allow combined help without caps`,
       /Use none, one, or several/.test(output) && /no numerical caps/.test(output) &&
       !/Nothing earns all three|no apply tier/.test(output));
  }
  ck("write warns about unfinished shape but records it anyway",
     /warning: steps 0-4 look unfinished/.test(brief.stdout) && existsSync(join(state, "course.done")), brief.stdout.slice(0, 200));
  ck("begin gives the shape rules while the course has none",
     /Steps 0-4/.test(author("begin", cid).stdout) === false, "");

  put("materials/expectations.md", "x\n");
  put("sections/01-a/_section.yaml", "title: A\n");
  put("sections/01-a/1-one.yaml", "title: One\n");
  put("sections/01-a/2-two.yaml", "title: Two\n");
  put("concepts/idea.yaml", "term: Idea\nbody: <p>An idea.</p>\nreview: true\n");
  ck("the next subsection is named without another command",
     /Next: s1-1 One/.test(author("write", cid).stdout));

  const thinDone = author("done", cid, "s1-1", "--no-validate");
  ck("a thin subsection is warned about, not refused",
     thinDone.status === 0 && /warning: s1-1 has no spine blocks; recorded anyway/.test(thinDone.stdout) &&
     readFileSync(join(state, "map.txt"), "utf8").includes("1-one.yaml"), thinDone.stdout);
  put("sections/01-a/1-one.yaml", "title: One\nblocks:\n  - t: p\n    text: x\nquiz:\n  - type: recall\n    q: q\n");
  const src = join(tmp, "src", "notes.md");
  const ok = author("done", cid, "s1-1", `${src}#Alpha Topic`, "--no-validate");
  ck("recording a subsection replaces its line and names the next",
     ok.status === 0 && /Next: s1-2/.test(ok.stdout) &&
     readFileSync(join(state, "map.txt"), "utf8").split("\n").filter(l => l.startsWith("sections/01-a/1-one")).length === 1,
     ok.stdout);
  const odd = author("done", cid, "s1-2", "notes.md", "--no-validate");
  ck("a doubtful source path is a warning too",
     odd.status === 0 && /warning: sources should be absolute/.test(odd.stdout), odd.stdout);

  const fin = author("finish", cid);
  ck("finish reports and records, and never blocks",
     fin.status === 0 && /review concepts with no drills: idea/.test(fin.stdout) &&
     /Recorded as finished/.test(fin.stdout) && existsSync(join(state, "finish.done")), fin.stdout.slice(0, 400));

  const redo = author("redo", cid, "s1-1");
  ck("redo reopens only what it names, and the finish",
     /Next: s1-1/.test(author("status", cid).stdout) &&
     readFileSync(join(state, "map.txt"), "utf8").includes("2-two.yaml") && !existsSync(join(state, "finish.done")),
     redo.stdout);
  ck("status reports progress", /steps 0-4 done · 1\/2 subsections/.test(author("status", cid).stdout));
  ck("reset forgets progress, keeps files",
     author("reset", cid).status === 0 && !existsSync(join(state, "course.done")) && existsSync(join(cdir, "sections/01-a/1-one.yaml")));

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
     ab.status === 0 && existsSync(join(ws, ".author/away/rules-drills.md")) &&
     !existsSync(join(ROOT, ".author/away")), ab.stdout + ab.stderr);
  ck("and the spec still comes from the engine", /## The spec/.test(away("begin", "away").stdout));

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
    { input: JSON.stringify({ session_id: "hook-1", transcript_path: tr }), encoding: "utf8" });
  ck("the hook writes the log and prints nothing",
     hook.status === 0 && hook.stdout === "" && /session hook-1/.test(readFileSync(join(cdir, ".authoring-log.md"), "utf8")));
  ck("a broken hook input is ignored quietly",
     spawnSync("node", [join(ROOT, "tools/author-log.mjs")], { input: "not json", encoding: "utf8" }).status === 0);
} finally {
  rmSync(cdir, { recursive: true, force: true });
  rmSync(state, { recursive: true, force: true });
}

rmSync(tmp, { recursive: true, force: true });

const bad = R.filter(r => !r.ok);
for (const r of bad) console.error(`       ✗ ${r.n}  ${r.x}`);
console.log(`${bad.length ? "FAIL" : "ok  "} author     ${R.length - bad.length}/${R.length} checks`);
process.exitCode = bad.length ? 1 : 0;
