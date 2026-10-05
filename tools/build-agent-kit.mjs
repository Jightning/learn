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
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
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
                 "gen-materials.mjs", "pack.mjs", "new-course.mjs", "audit-content.mjs", "migrate-question-ids.mjs"];
/* Read at runtime by validate.mjs, so it travels with the scripts. */
const ASSETS = [["src/blocks/index.js", "src/blocks/index.js"]];

const DOCS = ["create_course.md", "material_truth.md", "writing.md"];

/* ------------------------------------------------------------- workflow --*/
const workflow = readFileSync(join(ROOT, "authoring", "entrypoint.md"), "utf8");
const modelConfig = readFileSync(join(ROOT, "authoring", "agents.toml"), "utf8");
const agentConfig = role => {
  const section = modelConfig.split(`[${role}]`)[1]?.split(/\n\[/)[0];
  if (!section) throw new Error(`missing centralized agent role ${role}`);
  const fields = Object.fromEntries([...section.matchAll(/^(\w+) = (".*")$/gm)]
    .map(m => [m[1], JSON.parse(m[2])]));
  return fields;
};
const workerToml = name => {
  const config = agentConfig("writer");
  return `name = ${JSON.stringify(name)}\ndescription = ${JSON.stringify(config.description)}\nmodel = ${JSON.stringify(config.model)}\nmodel_reasoning_effort = ${JSON.stringify(config.reasoning)}\ndeveloper_instructions = ${JSON.stringify(config.instructions)}\n`;
};
const contextFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(f =>
  f.isDirectory() ? contextFiles(join(dir, f.name)) : [join(dir, f.name)]);

const fill = (vars) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), workflow).replaceAll("node tools/author.mjs", vars.AUTHOR).replaceAll("npm run new --", vars.NEW).replaceAll("`authoring/orchestration.md`", "`" + vars.ORCHESTRATION + "`");

const repoVars = {
  AUTHOR: "node tools/author.mjs", NEW: 'npm run new --', PACK: "node tools/pack.mjs",
  AUDIT: "node tools/audit-content.mjs",
  COVERAGE: "node tools/coverage.mjs",
  WHERE: "From the repository root,",
  ORCHESTRATION: "authoring/orchestration.md"
};
const pluginVars = a => ({
  AUTHOR: `node "${a}/scripts/author.mjs"`, NEW: `node "${a}/scripts/new-course.mjs"`,
  PACK: `node "${a}/scripts/pack.mjs"`,
  AUDIT: `node "${a}/scripts/audit-content.mjs"`,
  COVERAGE: `node "${a}/scripts/coverage.mjs"`,
  WHERE: "From the author's working folder,",
  ORCHESTRATION: `${a}/authoring/orchestration.md`
});
const anyVars = a => pluginVars(a);

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
  ".claude/skills/create-course/SKILL.md": FRONT + fill(repoVars),
  ".agents/skills/create-course/SKILL.md": FRONT + fill(repoVars),
  ...Object.fromEntries(["course-drafter", "course-researcher"].map(name =>
    [`.codex/agents/${name}.toml`, workerToml(name)])),
  "AGENTS.md": `# ${pkg.name}\n\nThis repository builds study courses and the site that reads them. ` +
    "Follow the workflow below for course work; otherwise read " +
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
  cpSync(join(ROOT, "authoring"), join(outDir, "authoring"), { recursive: true });
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
    ...contextFiles(join(ROOT, "authoring")).map(path =>
      [`plugin/authoring/${relative(join(ROOT, "authoring"), path)}`, readFileSync(path, "utf8")]),
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
