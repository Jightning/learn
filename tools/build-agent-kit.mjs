#!/usr/bin/env node
/* ============================================================================
 * tools/build-agent-kit.mjs — package the authoring workflow for agents
 *
 *   node tools/build-agent-kit.mjs [--check]
 *
 * A course is written by an agent following one workflow (tools/agent/
 * workflow.md) and calling the `author` commands. This builds its entrypoints
 * from one source so they
 * cannot drift:
 *
 *   .claude/skills/create-course/SKILL.md   this repository, Claude Code
 *   .agents/skills/create-course/SKILL.md  this repository, Codex
 *   .codex/agents/*.toml                   Codex course workers
 *   AGENTS.md                             this repository, shared workflow
 *   plugin/                                 the published package, committed
 *
 * The package holds bundled scripts (no npm install), the spec, the course
 * template, and two front ends:
 *
 * The folder is one Claude Code plugin (skill, subagents, log hook) and, in
 * the same place, a kit any other CLI agent can use: AGENTS.md beside
 * install.mjs, which writes that workflow into whatever folder the author
 * works in. One copy of the scripts serves both.
 *
 * Packaged, the engine is the package and the courses belong to the folder
 * the agent is run in (lib/paths.mjs).
 *
 * `plugin/` is committed and `.claude-plugin/marketplace.json` at this
 * repository's root points at it, so `/plugin marketplace add <owner>/<repo>`
 * installs the plugin alone out of a repository that also holds the site. The
 * clone is the whole repository either way, which is why the package stays
 * small and why nothing private may be tracked here. `--check` fails when the
 * committed copy is stale.
 * ==========================================================================*/
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { rolldown } from "rolldown";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "plugin");
const check = process.argv.includes("--check");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

/* The scripts an authoring agent runs, bundled one by one so each stays a
   command a person can also type. */
const SCRIPTS = ["author.mjs", "author-log.mjs", "coverage.mjs", "validate.mjs",
                 "gen-materials.mjs", "pack.mjs", "new-course.mjs"];
/* Read at runtime by validate.mjs, so it travels with the scripts. */
const ASSETS = [["src/blocks/index.js", "src/blocks/index.js"]];

const DOCS = ["create_course.md", "material_truth.md", "writing.md"];

/* ------------------------------------------------------------- workflow --*/
const workflow = readFileSync(join(ROOT, "tools/agent/workflow.md"), "utf8");

const DELEGATE = {
  codex: "- In Codex, use `gpt-5.6-luna` with medium reasoning for routine concept cards, drill banks based on established worked examples, and focused source extraction. These are the defaults in `.codex/agents/course-drafter.toml` and `course-researcher.toml`. Reassess against the models available in the session; never silently inherit the parent's expensive model.\n" +
    "- `course-drafter` owns one concept card or drill bank. Supply `.author/<id>/rules-concepts.md` or `rules-drills.md` and only the relevant course files. `course-researcher` returns concise cited notes for a bounded question.\n" +
    "- For harder synthesis or derivations, select the cheapest capable stronger model (for example `gpt-5.6-terra`, then `gpt-5.6-sol`); reserve Astra for work that needs it. The cheap custom roles pin their model: use a `default` worker with the relevant role instructions and an explicit model and reasoning effort when escalating.\n" +
    "- When `spawn_agent` exposes `fork_turns`, set `fork_turns=\"none\"` and explicitly select model and reasoning effort; provide a self-contained task. A full-history fork can inherit the parent's model and prevent an override. Check the returned configuration when available. If a requested model is unavailable or ignored, report it and select a supported suitable model explicitly; do not silently launch an expensive worker.",
  claude: "- `course-drafter` (Haiku): writes one concept card or one drill bank. Give it the file to " +
    "write, the rules file `.author/<id>/rules-concepts.md` or `rules-drills.md`, and the course files to read.\n" +
    "- `course-researcher`: reads widely and returns or saves condensed notes with citations. Use it for " +
    "a repository's subsystem, a long document you need only part of, or web research.",
  any: "- If your CLI can run subagents or spawn a cheaper model, hand it one concept card or one drill " +
    "bank at a time, with the rules file `.author/<id>/rules-concepts.md` or `rules-drills.md` and the " +
    "course files to read; and hand it wide reading (a repository's subsystem, a long document, web " +
    "research) so the raw material stays out of this conversation.\n" +
    "- If it cannot, do that work yourself, but read narrowly: search for what you need instead of " +
    "reading whole files."
};
const LOG = {
  claude: "The generation log (`courses/<id>/.authoring-log.md`) is written by a hook from this session's " +
    "transcript, and by the commands themselves. Never write or edit it.",
  any: "The generation log (`courses/<id>/.authoring-log.md`) is written by the commands themselves. " +
    "Never write or edit it. Transcript token counts depend on the installed agent hook; the commands work without it."
};

const fill = (vars) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), workflow);

const repoVars = {
  AUTHOR: "node tools/author.mjs", NEW: 'npm run new --', PACK: "node tools/pack.mjs",
  WHERE: "Run them from the repository root.", DELEGATE: DELEGATE.codex, LOG: LOG.any
};
const pluginVars = a => ({
  AUTHOR: `node "${a}/scripts/author.mjs"`, NEW: `node "${a}/scripts/new-course.mjs"`,
  PACK: `node "${a}/scripts/pack.mjs"`,
  WHERE: "Run them from the folder the author is working in: that folder's `courses/` and `.author/` " +
    "hold the course and its progress.",
  DELEGATE: DELEGATE.claude, LOG: LOG.claude
});
const anyVars = a => ({ ...pluginVars(a),
  DELEGATE: DELEGATE.codex + "\n- This portable install supplies instructions only, not Codex custom roles. If the role files are absent, use a `default` worker with the same bounded instructions and explicit model and reasoning settings.\n" + DELEGATE.any,
  LOG: LOG.any });

const FRONT = "---\nname: create-course\ndescription: Create, continue, or revise a course in " +
  "the courses directory from sources, a repository, or research. Use when the user asks to make, write, " +
  "generate, resume, fix, or extend a course or its subsections.\n---\n\n";

/* The marketplace lives at the repository root: that is where Claude Code
   looks, and plugin sources resolve relative to it. */
const MARKETPLACE = JSON.stringify({
  name: "learn",
  owner: { name: "learn" },
  plugins: [{
    name: "create-course",
    source: "./plugin",
    description: "Write study courses from sources, a repository, or research, " +
      "with the checks the study-site engine expects."
  }]
}, null, 2) + "\n";

/* Files that must match what this builds, in the repository itself. */
const generated = {
  ".claude-plugin/marketplace.json": MARKETPLACE,
  ".claude/skills/create-course/SKILL.md": FRONT + fill({ ...repoVars, DELEGATE: DELEGATE.claude, LOG: LOG.claude }),
  ".agents/skills/create-course/SKILL.md": FRONT + fill(repoVars),
  ...Object.fromEntries(["course-drafter", "course-researcher"].map(name =>
    [`.codex/agents/${name}.toml`, readFileSync(join(ROOT, "tools/agent", `${name}.toml`), "utf8")])),
  "AGENTS.md": `# ${pkg.name}\n\nThis repository builds study courses and the site that reads them. ` +
    "To create, continue or revise a course, follow the workflow below. For anything else, read " +
    "`README.md` and `docs/`.\n\n" + fill(repoVars)
};

/* ---------------------------------------------------------------- bundle --*/
async function bundle(outDir) {
  mkdirSync(join(outDir, "scripts"), { recursive: true });
  for (const s of SCRIPTS) {
    const b = await rolldown({
      input: join(ROOT, "tools", s),
      platform: "node",
      /* katex ships its own fonts and CSS; only its math parser is used, and
         bundling it keeps the package dependency-free. */
      external: [],
      onwarn: () => {}
    });
    await b.write({ file: join(outDir, "scripts", s), format: "esm", codeSplitting: false });
  }
  for (const [from, to] of ASSETS) {
    mkdirSync(dirname(join(outDir, "scripts", to)), { recursive: true });
    cpSync(join(ROOT, from), join(outDir, "scripts", to));
  }
  /* validate.mjs reads src/blocks/index.js relative to the engine root, which
     in a package is the folder above scripts/. */
  mkdirSync(join(outDir, "src", "blocks"), { recursive: true });
  cpSync(join(ROOT, "src/blocks/index.js"), join(outDir, "src/blocks/index.js"));
  mkdirSync(join(outDir, "docs"), { recursive: true });
  for (const d of DOCS) cpSync(join(ROOT, "docs", d), join(outDir, "docs", d));
  cpSync(join(ROOT, "courses", "_template"), join(outDir, "template"), { recursive: true });
}

/* ---------------------------------------------------------------- write --*/
async function build() {
  rmSync(OUT, { recursive: true, force: true });
  /* The kit is the plugin: ${CLAUDE_PLUGIN_ROOT} and <KIT> are the same
     folder, so one copy of the scripts serves both front ends. */
  const plugin = OUT;
  await bundle(plugin);

  const PLUGIN_ROOT = "${CLAUDE_PLUGIN_ROOT}";
  mkdirSync(join(plugin, ".claude-plugin"), { recursive: true });
  writeFileSync(join(plugin, ".claude-plugin", "plugin.json"), JSON.stringify({
    name: "create-course",
    description: "Write study courses from sources, a repository, or research, with the checks and " +
      "the spec that the study-site engine expects.",
    version: pkg.version || "0.1.0",
    keywords: ["course", "authoring", "study", "spaced-repetition"]
  }, null, 2) + "\n");
  mkdirSync(join(plugin, "skills", "create-course"), { recursive: true });
  writeFileSync(join(plugin, "skills", "create-course", "SKILL.md"), FRONT + fill(pluginVars(PLUGIN_ROOT)));
  mkdirSync(join(plugin, "agents"), { recursive: true });
  for (const a of ["course-drafter.md", "course-researcher.md"])
    cpSync(join(ROOT, ".claude/agents", a), join(plugin, "agents", a));
  mkdirSync(join(plugin, "hooks"), { recursive: true });
  writeFileSync(join(plugin, "hooks", "hooks.json"), JSON.stringify({
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: `node "${PLUGIN_ROOT}/scripts/author-log.mjs"` }] }]
    }
  }, null, 2) + "\n");

  /* A marketplace beside the plugin, so it installs from a local path or from
     wherever this folder is later pushed. */
  writeFileSync(join(OUT, "AGENTS.md"), fill(anyVars("<KIT>")));
  writeFileSync(join(OUT, "install.mjs"), INSTALL);
  writeFileSync(join(OUT, "README.md"), README(pkg));
  for (const [rel, text] of Object.entries(generated)) {
    mkdirSync(dirname(join(ROOT, rel)), { recursive: true });
    writeFileSync(join(ROOT, rel), text);
  }
  return OUT;
}

/* install.mjs writes the workflow into a working folder, with this package's
   real path in it, for a CLI that reads AGENTS.md (and its cousins). */
const INSTALL = `#!/usr/bin/env node
/* Put the authoring workflow in a folder you want to write courses in:
 *
 *   node <kit>/any-agent/install.mjs [folder] [--name AGENTS.md,CLAUDE.md,GEMINI.md]
 *
 * It writes one file per name, each pointing at this kit. Nothing else is
 * installed, and your agent needs no plugin support: it reads the file, runs
 * the commands, and writes the course into <folder>/courses/.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const at = args.indexOf("--name");
const names = (at >= 0 ? args[at + 1] : "AGENTS.md").split(",").map(s => s.trim()).filter(Boolean);
const dir = resolve(args.find((a, i) => !a.startsWith("--") && i !== at + 1) || process.cwd());
const text = readFileSync(join(KIT, "AGENTS.md"), "utf8").replaceAll("<KIT>", KIT);
for (const name of names) {
  const p = join(dir, name);
  if (existsSync(p) && !args.includes("--force")) {
    console.error(\`\${p} exists; --force to overwrite\`);
    process.exit(1);
  }
  writeFileSync(p, text);
  console.log(\`wrote \${p}\`);
}
console.log(\`Now ask your agent to make a course; it will run \${KIT}/scripts/author.mjs\`);
`;

const README = p => `# create-course — write study courses with an agent

Built from ${p.name}. Two ways to install, both offline; nothing here is published.

## Claude Code

\`\`\`sh
claude
/plugin marketplace add <owner>/<repo>      # or a local path to the repo root
/plugin install create-course@learn
\`\`\`

Then, in any folder you want your courses in, ask for a course. The plugin brings the workflow
skill, two subagents (a cheap drafter, a researcher) and a hook that logs each session's token use
into the course.

Without installing, one session can try it: \`claude --plugin-dir <repo>/plugin\`.

## Codex and other CLI agents

\`\`\`sh
node install.mjs ~/my-courses            # writes AGENTS.md there
node install.mjs ~/my-courses --name AGENTS.md,GEMINI.md
\`\`\`

The file tells the agent the same workflow and the commands to run. Subagents are optional: where
the CLI has none, the agent does that work itself. In Codex, it specifies a cheap model for routine
work and stronger models when correctness requires them; this portable installer does not install
custom agent TOML files. In the full repository, Codex discovers the skill in
\`.agents/skills/create-course/\` and the workers in \`.codex/agents/\`.

## What it writes

A course is a folder of YAML under \`courses/<id>/\`, checked by the same validator the study site
uses. \`node scripts/pack.mjs <id>\` turns it into \`packed/<id>.course.json\`, which the
site imports from its library.

The scripts need only Node; there is nothing to install. The full repository is still the place to
change the engine, the spec, or the site.
`;

/* ----------------------------------------------------------------- main --*/
if (check) {
  const stale = Object.entries(generated).filter(([rel, text]) =>
    !existsSync(join(ROOT, rel)) || readFileSync(join(ROOT, rel), "utf8") !== text).map(([rel]) => rel);
  /* The committed package's own text, and that its bundles exist: rebuilding
     them here would cost a second build on every `npm run check`. */
  const shipped = [
    ["plugin/skills/create-course/SKILL.md", FRONT + fill(pluginVars("${CLAUDE_PLUGIN_ROOT}"))],
    ["plugin/AGENTS.md", fill(anyVars("<KIT>"))],
    ...DOCS.map(d => [`plugin/docs/${d}`, readFileSync(join(ROOT, "docs", d), "utf8")]),
    ...["course-drafter.md", "course-researcher.md"].map(a =>
      [`plugin/agents/${a}`, readFileSync(join(ROOT, ".claude/agents", a), "utf8")])
  ];
  for (const [rel, text] of shipped)
    if (!existsSync(join(ROOT, rel)) || readFileSync(join(ROOT, rel), "utf8") !== text) stale.push(rel);
  for (const s of SCRIPTS) if (!existsSync(join(ROOT, "plugin", "scripts", s))) stale.push(`plugin/scripts/${s}`);
  if (stale.length) {
    console.log(`FAIL agent-kit  stale, run node tools/build-agent-kit.mjs: ${stale.join(", ")}`);
    process.exit(1);
  }
  console.log("ok   agent-kit  the workflow, the spec and plugin/ are in step");
} else {
  const out = await build();
  console.log(`built ${relative(ROOT, out)}/: a Claude Code plugin (skill, subagents, log hook) and, ` +
    `in the same folder, AGENTS.md + install.mjs for any other agent`);
  console.log(`try it:   claude --plugin-dir ${relative(ROOT, out)}`);
  console.log("publish:  commit plugin/ and .claude-plugin/marketplace.json, then push");
}
