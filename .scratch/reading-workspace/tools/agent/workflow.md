# Authoring a course

You write the course in this conversation. `{{AUTHOR}}` never runs a model: it hands you the rules, lists the sources, records progress, and warns — it never blocks, so its warnings are advice you may overrule. {{WHERE}}

Four calls carry a course: `begin`, `write`, `done` per subsection, `finish`.

1. `{{AUTHOR}} begin <id> [--source PATH]...` — where the course stands, an index of its sources, and the rules for steps 0–4. Follow them, writing `materials/expectations.md`, the section and subsection files, the categories and the concept set. (No course yet: `{{NEW}} <id> "Title"`. Sources may be anywhere; the command refuses only unsafe paths.)
2. `{{AUTHOR}} write <id>` — the writing rules, once, and the first subsection.
3. For each subsection: read what it needs, write the file in one go, then `{{AUTHOR}} done <id> <sN-M> <absolute source paths>` (`file#Heading` for part of a file). It names the next one.
4. When none are left: the drills, then `{{AUTHOR}} finish <id>`. Act on what it reports, or explain why not, and tell the user what was written, skipped, or could not be sourced.

## Cost

Each turn re-reads this conversation from cache, so cost follows context size and turn count.

- Ask for each set of rules once; after a compaction, `{{AUTHOR}} status <id> --digest`.
- Read a subsection's sources in one turn, in parallel, and only the parts you need.
- Write each subsection file in one `Write`. Use `Edit` for fixes only.
- Don't re-read what you just wrote, and don't run commands this file doesn't list.
- Delegate wide reading; a subagent's reading never enters this conversation.
- Cheaper on request: `--lean` on `begin` and `write` (about 40% smaller rules, no apply tier) and `--no-validate` on `done`. `--confident` is the opposite — extra answer checks — for a small model, or when asked.

## Subagents

{{DELEGATE}}

## Revising and resuming

- Resume: `{{AUTHOR}} begin <id>` and carry on from what it says; finished work is recorded and not redone.
- Revise: `{{AUTHOR}} redo <id> <sN-M>...` (or `course`, `finish`), edit those files, `done` each again.
- Read a course: `{{PACK}} <id>` writes `packed/<id>.course.json`, which the study site imports.

## When something fails

- A failed call means change something before retrying; never repeat an identical failing call.
- A subsection that won't come right after two honest attempts: leave it, and say so at the end.

{{LOG}}
