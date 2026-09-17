# Authoring a course

You write the course in this conversation. `node "<KIT>/scripts/author.mjs"` never runs a model: it hands you the rules, lists the sources, records progress, and warns — it never blocks, so its warnings are advice you may overrule. Run them from the folder the author is working in: that folder's `courses/` and `.author/` hold the course and its progress.

Four calls carry a course: `begin`, `write`, `done` per subsection, `finish`.

1. `node "<KIT>/scripts/author.mjs" begin <id> [--source PATH]...` — where the course stands, an index of its sources, and the rules for steps 0–4. Follow them, writing `materials/expectations.md`, the section and subsection files, the categories and the concept set. (No course yet: `node "<KIT>/scripts/new-course.mjs" <id> "Title"`. Sources may be anywhere; the command refuses only unsafe paths.)
2. `node "<KIT>/scripts/author.mjs" write <id>` — the writing rules, once, and the first subsection.
3. For each subsection: read what it needs, write the file in one go, then `node "<KIT>/scripts/author.mjs" done <id> <sN-M> <absolute source paths>` (`file#Heading` for part of a file). It names the next one.
4. When none are left: the drills, then `node "<KIT>/scripts/author.mjs" finish <id>`. Act on what it reports, or explain why not, and tell the user what was written, skipped, or could not be sourced.

## Cost

Each turn re-reads this conversation from cache, so cost follows context size and turn count.

- Ask for each set of rules once; after a compaction, `node "<KIT>/scripts/author.mjs" status <id> --digest`.
- Read a subsection's sources in one turn, in parallel, and only the parts you need.
- Write each subsection file in one `Write`. Use `Edit` for fixes only.
- Don't re-read what you just wrote, and don't run commands this file doesn't list.
- Delegate wide reading; a subagent's reading never enters this conversation.
- Cheaper on request: `--lean` on `begin` and `write` (about 40% smaller rules, no apply tier) and `--no-validate` on `done`. `--confident` is the opposite — extra answer checks — for a small model, or when asked.

## Subagents

- If your CLI can run subagents or spawn a cheaper model, hand it one concept card or one drill bank at a time, with the rules file `.author/<id>/rules-concepts.md` or `rules-drills.md` and the course files to read; and hand it wide reading (a repository's subsystem, a long document, web research) so the raw material stays out of this conversation.
- If it cannot, do that work yourself, but read narrowly: search for what you need instead of reading whole files.
- Never delegate a subsection's spine, quizzes or depth. Those need this conversation's view of the course.

## Revising and resuming

- Resume: `node "<KIT>/scripts/author.mjs" begin <id>` and carry on from what it says; finished work is recorded and not redone.
- Revise: `node "<KIT>/scripts/author.mjs" redo <id> <sN-M>...` (or `course`, `finish`), edit those files, `done` each again.
- Read a course: `node "<KIT>/scripts/pack.mjs" <id>` writes `packed/<id>.course.json`, which the study site imports.

## When something fails

- A failed call means change something before retrying; never repeat an identical failing call.
- A subsection that won't come right after two honest attempts: leave it, and say so at the end.

The generation log (`courses/<id>/.authoring-log.md`) is written by the commands themselves. Never write or edit it. (Token counts are recorded only under Claude Code, which can read its own transcript.)
