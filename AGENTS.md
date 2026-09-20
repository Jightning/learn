# study-sites

This repository builds study courses and the site that reads them. To create, continue or revise a course, follow the workflow below. For anything else, read `README.md` and `docs/`.

# Authoring a course

You write the course in this conversation. `node tools/author.mjs` never runs a model: it hands you the rules, lists the sources, records progress, and warns — it never blocks, so its warnings are advice you may overrule. Run them from the repository root.

Four calls carry a course: `begin`, `write`, `done` per subsection, `finish`.

1. `node tools/author.mjs begin <id> [--source PATH]...` — where the course stands, an index of its sources, and the rules for steps 0–4. Follow them, writing `materials/expectations.md`, the section and subsection files, the categories and the concept set. (No course yet: `npm run new -- <id> "Title"`. Sources may be anywhere; the command refuses only unsafe paths.)
2. `node tools/author.mjs write <id>` — the writing rules, once, and the first subsection.
3. For each subsection: read what it needs, write the file in one go, then `node tools/author.mjs done <id> <sN-M> <absolute source paths>` (`file#Heading` for part of a file). It names the next one.
4. When none are left: the drills, then `node tools/author.mjs finish <id>`. Act on what it reports, or explain why not, and tell the user what was written, skipped, or could not be sourced.

## Cost

Each model request processes conversation context; cached input is cheaper, not free, and cache hits are not guaranteed. Subagents also consume usage.

- Ask for each set of rules once; after a compaction, `node tools/author.mjs status <id> --digest`.
- Read a subsection's sources in one turn, in parallel, and only the parts you need.
- Write each subsection file in one operation with the available file-writing tool; use targeted patches for fixes.
- Don't re-read what you just wrote, and don't run commands this file doesn't list.
- Delegate wide reading only when it saves context or independent work; return concise findings and citations, not raw source dumps. For a small lookup, search locally instead of spawning an agent.
- Cheaper on request: `--lean` on `begin` and `write` (about 40% smaller rules, no apply tier) and `--no-validate` on `done`. `--confident` is the opposite — extra answer checks — for a small model, or when asked.

## Subagents

Use the cheapest available model that can meet the task's correctness and teaching requirements. Cost savings must not remove required depth, source checks, step-by-step answer verification, or validation. Assign one bounded deliverable, the relevant rules and sources, and a short acceptance checklist. Give writers explicit file ownership; other agents may be working, so they must not revert others' edits.

- In Codex, use `gpt-5.6-luna` with medium reasoning for routine concept cards, drill banks based on established worked examples, and focused source extraction. These are the defaults in `.codex/agents/course-drafter.toml` and `course-researcher.toml`. Reassess against the models available in the session; never silently inherit the parent's expensive model.
- `course-drafter` owns one concept card or drill bank. Supply `.author/<id>/rules-concepts.md` or `rules-drills.md` and only the relevant course files. `course-researcher` returns concise cited notes for a bounded question.
- For harder synthesis or derivations, select the cheapest capable stronger model (for example `gpt-5.6-terra`, then `gpt-5.6-sol`); reserve Astra for work that needs it. The cheap custom roles pin their model: use a `default` worker with the relevant role instructions and an explicit model and reasoning effort when escalating.
- When `spawn_agent` exposes `fork_turns`, set `fork_turns="none"` and explicitly select model and reasoning effort; provide a self-contained task. A full-history fork can inherit the parent's model and prevent an override. Check the returned configuration when available. If a requested model is unavailable or ignored, report it and select a supported suitable model explicitly; do not silently launch an expensive worker.

The parent checks the result against the sources and rules before accepting it, including independently checking drill answers. Escalate when evidence conflicts, reasoning exceeds the worker's ability, or substantive errors remain after one focused correction. Choose a stronger model upfront for difficult derivations or ambiguous synthesis; do not burn usage on repeated cheap attempts. Report uncertainty instead of inventing content. Never delegate a subsection's spine, quizzes or depth; those need this conversation's view of the course.

## Revising and resuming

- Resume: `node tools/author.mjs begin <id>` and carry on from what it says; finished work is recorded and not redone.
- Revise: `node tools/author.mjs redo <id> <sN-M>...` (or `course`, `finish`), edit those files, `done` each again.
- Read a course: `node tools/pack.mjs <id>` writes `packed/<id>.course.json`, which the study site imports.

## When something fails

- A failed call means change something before retrying; never repeat an identical failing call.
- A subsection that won't come right after two honest attempts: leave it, and say so at the end.

The generation log (`courses/<id>/.authoring-log.md`) is written by the commands themselves. Never write or edit it. Transcript token counts depend on the installed agent hook; the commands work without it.
