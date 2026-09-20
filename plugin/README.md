# create-course — write study courses with an agent

Built from study-sites. Two ways to install, both offline; nothing here is published.

## Claude Code

```sh
claude
/plugin marketplace add <owner>/<repo>      # or a local path to the repo root
/plugin install create-course@learn
```

Then, in any folder you want your courses in, ask for a course. The plugin brings the workflow
skill, two subagents (a cheap drafter, a researcher) and a hook that logs each session's token use
into the course.

Without installing, one session can try it: `claude --plugin-dir <repo>/plugin`.

## Codex and other CLI agents

```sh
node install.mjs ~/my-courses            # writes AGENTS.md there
node install.mjs ~/my-courses --name AGENTS.md,GEMINI.md
```

The file tells the agent the same workflow and the commands to run. Subagents are optional: where
the CLI has none, the agent does that work itself. In Codex, it specifies a cheap model for routine
work and stronger models when correctness requires them; this portable installer does not install
custom agent TOML files. In the full repository, Codex discovers the skill in
`.agents/skills/create-course/` and the workers in `.codex/agents/`.

## What it writes

A course is a folder of YAML under `courses/<id>/`, checked by the same validator the study site
uses. `node scripts/pack.mjs <id>` turns it into `packed/<id>.course.json`, which the
site imports from its library.

The scripts need only Node; there is nothing to install. The full repository is still the place to
change the engine, the spec, or the site.
