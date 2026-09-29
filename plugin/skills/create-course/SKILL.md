---
name: create-course
description: Create, continue, or revise a course in the courses directory from sources, a repository, or research. Use when the user asks to make, write, generate, resume, fix, or extend a course or its subsections.
---

# Authoring a course

Write the course in this conversation. From the author's working folder, `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs"` provides rules, sources, progress, mechanical completion checks, and quality warnings; it never runs a model.

Course flow: `begin`, `write`, `done` for each subsection, then `finish`.

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" begin <id> [--source PATH]...` reports status, sources, and rules for steps 0–4. Follow them to write `materials/expectations.md`, section/subsection files, categories, and the concept set. If no course exists, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/new-course.mjs" <id> "Title"`; sources may be anywhere except unsafe paths.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" write <id>` gives the compact, versioned rule digest and first subsection. Use `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" rules <id>` for sections matching the next subsection's declared block, figure, and question shapes, or `--need block:<type>`, `--need figure:<kind>`, and `--need question:<kind>` before adding a new shape. `--full-spec` on `begin` or `write` prints the complete phase spec.
3. For each subsection, read only what it needs, write it in one operation, then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" done <id> <sN-M> <absolute source paths>`; use `file#Heading` for part of a file. It checks spine, quiz, and local validation errors, then names the next subsection. Use `--staging` only to keep an unfinished draft moving; a staged subsection must pass `done` again without the override.
4. After the subsections, add `practice/<concept>.yaml` variants where a weak or important skill needs a different surface, then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" finish <id>`. Every encountered question can enter Review, so a variant bank is optional. `finish` records mechanical completion only when required work and validation pass. Use `node "${CLAUDE_PLUGIN_ROOT}/scripts/audit-content.mjs" --profile draft <id>` for nonblocking content debt. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/coverage.mjs" <id> --init-review` once to create `materials/coverage-review.yaml`; review each low-score lead and fill its disposition. Then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/audit-content.mjs" --profile publish <id>` before calling the course publish-ready. Scores are leads, not proof; review source dispositions and answers yourself.

## Cost

Model requests process conversation context; cached input is cheaper but not free, and subagents also consume usage.

- Request each rule set once; after compaction use `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" status <id> --digest`.
- Read each subsection's needed sources once, in parallel; write its file once and use targeted patches for fixes. Do not reread it or run unlisted commands.
- Delegate broad reading only when it saves context or enables independent work; return concise cited findings. Search locally for small lookups.
- The compact digest includes the mandatory checklist from the source spec. `--lean` trims optional guidance; `--full-spec` restores the complete phase rules. `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" plan <id>` estimates both paths. `done` reports compact feedback for its subsection; do not reread the full course. `--no-validate` is available only with `--staging` and still requires a later checked `done`. Use `--confident` for extra checks.

## Subagents

Use the cheapest model that meets correctness and teaching requirements; do not trade away depth, source checks, answer verification, or validation. Give each agent one bounded deliverable, relevant rules/sources, an acceptance checklist, and explicit file ownership. Agents must not revert others' edits.

- `course-drafter` (Haiku): writes one concept card or one practice variant bank. Give it the file to write, the rules file `.author/<id>/rules-concepts.md` or `rules-variants.md`, and the course files to read.
- `course-researcher`: reads widely and returns or saves condensed notes with citations. Use it for a repository's subsystem, a long document you need only part of, or web research.

Check every result against its sources and rules, including independent answer checks for practice variants. Escalate for conflicting evidence, insufficient reasoning, or errors after one focused correction; choose stronger models upfront for difficult or ambiguous work. Report uncertainty, never invent content, and keep each subsection's spine, quizzes, and depth in this conversation.

## Revising and resuming

- Resume with `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" begin <id>`; recorded work is not redone.
- Revise with `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" redo <id> <sN-M>...` (or `course`, `finish`), edit those files, and run `done` again for each.
- Read a course with `node "${CLAUDE_PLUGIN_ROOT}/scripts/pack.mjs" <id>`; it writes `packed/<id>.course.json` for the study site.

## When something fails

- After a failed call, change something before retrying; never repeat it unchanged.
- If a subsection still fails after two honest attempts, leave it and say so at the end.

The generation log (`courses/<id>/.authoring-log.md`) is written by a hook from this session's transcript, and by the commands themselves. Never write or edit it.
