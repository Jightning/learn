---
name: create-course
description: Create, continue, or revise a course in the courses directory from sources, a repository, or research. Use when the user asks to make, write, generate, resume, fix, or extend a course or its subsections.
---

# Authoring a course

You write the course in this conversation. `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs"` never runs a model: it hands you the rules, lists the sources, records progress, and warns — it never blocks, so its warnings are advice you may overrule. Run them from the folder the author is working in: that folder's `courses/` and `.author/` hold the course and its progress.

Four calls carry a course: `begin`, `write`, `done` per subsection, `finish`.

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" begin <id> [--source PATH]...` — where the course stands, an index of its sources, and the rules for steps 0–4. Follow them, writing `materials/expectations.md`, the section and subsection files, the categories and the concept set. (No course yet: `node "${CLAUDE_PLUGIN_ROOT}/scripts/new-course.mjs" <id> "Title"`. Sources may be anywhere; the command refuses only unsafe paths.)
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" write <id>` — the writing rules, once, and the first subsection.
3. For each subsection: read what it needs, write the file in one go, then `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" done <id> <sN-M> <absolute source paths>` (`file#Heading` for part of a file). It names the next one.
4. When none are left: the drills, then `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" finish <id>`. Act on what it reports, or explain why not, and tell the user what was written, skipped, or could not be sourced.

## Cost

Each model request processes conversation context; cached input is cheaper, not free, and cache hits are not guaranteed. Subagents also consume usage.

- Ask for each set of rules once; after a compaction, `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" status <id> --digest`.
- Read a subsection's sources in one turn, in parallel, and only the parts you need.
- Write each subsection file in one operation with the available file-writing tool; use targeted patches for fixes.
- Don't re-read what you just wrote, and don't run commands this file doesn't list.
- Delegate wide reading only when it saves context or independent work; return concise findings and citations, not raw source dumps. For a small lookup, search locally instead of spawning an agent.
- Cheaper on request: `--lean` on `begin` and `write` (about 40% smaller rules, no apply tier) and `--no-validate` on `done`. `--confident` is the opposite — extra answer checks — for a small model, or when asked.

## Subagents

Use the cheapest available model that can meet the task's correctness and teaching requirements. Cost savings must not remove required depth, source checks, step-by-step answer verification, or validation. Assign one bounded deliverable, the relevant rules and sources, and a short acceptance checklist. Give writers explicit file ownership; other agents may be working, so they must not revert others' edits.

- `course-drafter` (Haiku): writes one concept card or one drill bank. Give it the file to write, the rules file `.author/<id>/rules-concepts.md` or `rules-drills.md`, and the course files to read.
- `course-researcher`: reads widely and returns or saves condensed notes with citations. Use it for a repository's subsystem, a long document you need only part of, or web research.

The parent checks the result against the sources and rules before accepting it, including independently checking drill answers. Escalate when evidence conflicts, reasoning exceeds the worker's ability, or substantive errors remain after one focused correction. Choose a stronger model upfront for difficult derivations or ambiguous synthesis; do not burn usage on repeated cheap attempts. Report uncertainty instead of inventing content. Never delegate a subsection's spine, quizzes or depth; those need this conversation's view of the course.

## Revising and resuming

- Resume: `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" begin <id>` and carry on from what it says; finished work is recorded and not redone.
- Revise: `node "${CLAUDE_PLUGIN_ROOT}/scripts/author.mjs" redo <id> <sN-M>...` (or `course`, `finish`), edit those files, `done` each again.
- Read a course: `node "${CLAUDE_PLUGIN_ROOT}/scripts/pack.mjs" <id>` writes `packed/<id>.course.json`, which the study site imports.

## When something fails

- A failed call means change something before retrying; never repeat an identical failing call.
- A subsection that won't come right after two honest attempts: leave it, and say so at the end.

The generation log (`courses/<id>/.authoring-log.md`) is written by a hook from this session's transcript, and by the commands themselves. Never write or edit it.
