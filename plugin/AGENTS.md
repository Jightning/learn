# Authoring a course

Write the course in this conversation. From the author's working folder, `node "<KIT>/scripts/author.mjs"` provides rules, sources, progress, and non-blocking warnings; it never runs a model. That folder's `courses/` and `.author/` hold the course and progress.

Course flow: `begin`, `write`, `done` for each subsection, then `finish`.

1. `node "<KIT>/scripts/author.mjs" begin <id> [--source PATH]...` reports status, sources, and rules for steps 0–4. Follow them to write `materials/expectations.md`, section/subsection files, categories, and the concept set. If no course exists, run `node "<KIT>/scripts/new-course.mjs" <id> "Title"`; sources may be anywhere except unsafe paths.
2. `node "<KIT>/scripts/author.mjs" write <id>` gives the writing rules and first subsection.
3. For each subsection, read only what it needs, write it once, then run `node "<KIT>/scripts/author.mjs" done <id> <sN-M> <absolute source paths>`; use `file#Heading` for part of a file. It names the next subsection.
4. After the subsections, write the drills and run `node "<KIT>/scripts/author.mjs" finish <id>`. Act on its report or explain why not, including what was written, skipped, or unsourced.

## Cost

Model requests process conversation context; cached input is cheaper but not free, and subagents also consume usage.

- Request each rule set once; after compaction use `node "<KIT>/scripts/author.mjs" status <id> --digest`.
- Read each subsection's needed sources once, in parallel; write its file once and use targeted patches for fixes. Do not reread it or run unlisted commands.
- Delegate broad reading only when it saves context or enables independent work; return concise cited findings. Search locally for small lookups.
- For cheaper requests, use `--lean` with `begin`/`write` and `--no-validate` with `done`. Use `--confident` for extra checks.

## Subagents

Use the cheapest model that meets correctness and teaching requirements; do not trade away depth, source checks, answer verification, or validation. Give each agent one bounded deliverable, relevant rules/sources, an acceptance checklist, and explicit file ownership. Agents must not revert others' edits.

- Use `gpt-5.6-luna` with medium reasoning for routine concept cards, worked-example drill banks, and focused source extraction; these are the `.codex/agents` defaults. Never silently inherit an expensive parent model.
- `course-drafter` owns one concept card or drill bank and gets the matching `.author/<id>/rules-*.md` plus relevant course files. `course-researcher` returns concise cited notes for one bounded question.
- For hard synthesis or derivations, use the cheapest capable stronger model (`gpt-5.6-terra`, then `gpt-5.6-sol`); reserve Astra for work that needs it. When escalating, use a `default` worker with explicit model and reasoning settings.
- With `spawn_agent`, set `fork_turns="none"`, choose model/reasoning explicitly, provide a self-contained task, and verify the returned configuration. If a model is unavailable or ignored, choose and report a supported alternative.
- This portable install provides instructions, not custom Codex roles. If role files are absent, use a `default` worker with the same bounded instructions and explicit model/reasoning settings. If the CLI can spawn agents, use it for one concept card or drill bank at a time, or for broad reading; otherwise search narrowly yourself.

Check every result against its sources and rules, including independent drill-answer checks. Escalate for conflicting evidence, insufficient reasoning, or errors after one focused correction; choose stronger models upfront for difficult or ambiguous work. Report uncertainty, never invent content, and keep each subsection's spine, quizzes, and depth in this conversation.

## Revising and resuming

- Resume with `node "<KIT>/scripts/author.mjs" begin <id>`; recorded work is not redone.
- Revise with `node "<KIT>/scripts/author.mjs" redo <id> <sN-M>...` (or `course`, `finish`), edit those files, and run `done` again for each.
- Read a course with `node "<KIT>/scripts/pack.mjs" <id>`; it writes `packed/<id>.course.json` for the study site.

## When something fails

- After a failed call, change something before retrying; never repeat it unchanged.
- If a subsection still fails after two honest attempts, leave it and say so at the end.

The generation log (`courses/<id>/.authoring-log.md`) is written by the commands themselves. Never write or edit it. Transcript token counts depend on the installed agent hook; the commands work without it.
