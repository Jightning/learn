# Authoring a course

Write the course in this conversation. {{WHERE}} `{{AUTHOR}}` provides rules, sources, progress, and non-blocking warnings; it never runs a model.

Course flow: `begin`, `write`, `done` for each subsection, then `finish`.

1. `{{AUTHOR}} begin <id> [--source PATH]...` reports status, sources, and rules for steps 0–4. Follow them to write `materials/expectations.md`, section/subsection files, categories, and the concept set. If no course exists, run `{{NEW}} <id> "Title"`; sources may be anywhere except unsafe paths.
2. `{{AUTHOR}} write <id>` gives the writing rules and first subsection.
3. For each subsection, read only what it needs, write it in one operation, then run `{{AUTHOR}} done <id> <sN-M> <absolute source paths>`; use `file#Heading` for part of a file. It names the next subsection.
4. After the subsections, write the drills and run `{{AUTHOR}} finish <id>`. Act on its report or explain why not, including what was written, skipped, or unsourced.

## Cost

Model requests process conversation context; cached input is cheaper but not free, and subagents also consume usage.

- Request each rule set once; after compaction use `{{AUTHOR}} status <id> --digest`.
- Read each subsection's needed sources once, in parallel; write its file once and use targeted patches for fixes. Do not reread it or run unlisted commands.
- Delegate broad reading only when it saves context or enables independent work; return concise cited findings. Search locally for small lookups.
- For cheaper requests, use `--lean` with `begin`/`write` and `--no-validate` with `done`. Use `--confident` for extra checks.

## Subagents

Use the cheapest model that meets correctness and teaching requirements; do not trade away depth, source checks, answer verification, or validation. Give each agent one bounded deliverable, relevant rules/sources, an acceptance checklist, and explicit file ownership. Agents must not revert others' edits.

{{DELEGATE}}

Check every result against its sources and rules, including independent drill-answer checks. Escalate for conflicting evidence, insufficient reasoning, or errors after one focused correction; choose stronger models upfront for difficult or ambiguous work. Report uncertainty, never invent content, and keep each subsection's spine, quizzes, and depth in this conversation.

## Revising and resuming

- Resume with `{{AUTHOR}} begin <id>`; recorded work is not redone.
- Revise with `{{AUTHOR}} redo <id> <sN-M>...` (or `course`, `finish`), edit those files, and run `done` again for each.
- Read a course with `{{PACK}} <id>`; it writes `packed/<id>.course.json` for the study site.

## When something fails

- After a failed call, change something before retrying; never repeat it unchanged.
- If a subsection still fails after two honest attempts, leave it and say so at the end.

{{LOG}}
