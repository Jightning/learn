# Course authoring

Choose **single** or **paired** (accept “paried”). Separate models or manual
switching means `--mode paired --handoff manual`; subagents means `--handoff
auto`. Persist the choice. Never ask which phase comes next.

Find the named or sole unfinished course under the current local `courses/`.
Resume it from status; do not relocate it or restart approved work. If several
courses match, ask only for the ID. Course content belongs in `courses/<id>/`;
`.author/` is generated state, never a content folder.

```sh
node "<KIT>/scripts/new-course.mjs" <id> "Title"
node "<KIT>/scripts/author.mjs" begin <id> --mode single|paired --handoff manual|auto [--source PATH]...
node "<KIT>/scripts/author.mjs" status <id>
node "<KIT>/scripts/author.mjs" packet <id> [--sub sN-M] [--item block:N|quiz:N] [--source sourceID/unitID@Lx-Ly]
node "<KIT>/scripts/author.mjs" write <id>
node "<KIT>/scripts/author.mjs" pilot <id> --sub sN-M # first representative lesson only
node "<KIT>/scripts/author.mjs" done <id> --all
node "<KIT>/scripts/author.mjs" reviewed <id> --all
node "<KIT>/scripts/author.mjs" finish <id>
```

Read `<KIT>/authoring/orchestration.md` for the selected flow. Manual paired mode uses
one planner prompt, one writer prompt for all remaining lessons, one validation
prompt, and an optional writer correction prompt. Do not hand off per section.
Automatic paired uses fresh cheap workers and `batch`; single works directly.
Commands never run models. Use status at handoffs or compaction; read only named
rules, local prerequisites and exact sources. Use item packets for review;
`--expand` explicitly widens evidence when needed. `done`/`reviewed` also accept
one subsection for targeted repairs. Reuse checks for unchanged content.

Size follows the learning need: one subject or a large course, without padding
or omitted families. The planner owns scope and difficult judgment; the writer
owns teaching, questions, answers, formatting and corrections. The reviewer
returns concise evidence-backed judgments and never rewrites course content.
Mechanical completion and coverage scores alone do not prove mastery.
