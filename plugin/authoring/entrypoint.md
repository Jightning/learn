# Course authoring

Choose **single** or **paired** (accept “paried”). Separate models or manual
switching means `--mode paired --handoff manual`; subagents means `--handoff
auto`. Persist the choice. Never ask which phase comes next.

Find the named or sole unfinished course under the current local `courses/`.
Resume it from status; do not relocate it or restart approved work. If several
courses match, ask only for the ID. Course content belongs in `courses/<id>/`;
`.author/` is generated state, never a content folder.

```sh
npm run new -- <id> "Title"
node tools/author.mjs begin <id> --mode single|paired --handoff manual|auto [--source PATH]...
node tools/author.mjs status <id>
node tools/author.mjs index <id>
node tools/author.mjs screen <id> [--section s1] [--changed]
node tools/author.mjs packet <id> --ids id1,id2 [--expand]
node tools/author.mjs issues <id> --report PATH
node tools/author.mjs corrected <id> --report PATH
node tools/author.mjs write <id>
node tools/author.mjs pilot <id> --sub sN-M # first representative lesson only
node tools/author.mjs done <id> --all
node tools/author.mjs reviewed <id> --all
node tools/author.mjs finish <id>
```

Read `authoring/orchestration.md` for the selected flow. Manual paired mode uses
one planner prompt, one writer prompt for all remaining lessons, one validation
prompt, and, only when needed, a writer correction prompt followed by reviewer
validation. Do not hand off per section. Automatic paired uses fresh cheap
workers and `batch`; single works directly on the same plan, issue, correction,
and review artifacts without handoffs. In paired mode the writer never accepts
its own corrections.
Commands never run models. Use status at handoffs or compaction; read only named
rules, local prerequisites and exact sources. `index` assigns missing stable
`authorId` values to blocks, quiz and practice items, and indexes named metadata.
`screen` emits compact deterministic excerpts and a closure map; `--changed`
adds actual changed items, affected context, and issue links after correction.
Each screen links to shared `.author/<id>/review-context.yaml`; read it once
per review, then use section outlines and excerpts. Screening is for triage
only: expand the full packet before source or math judgments. IDs appear once in packet
envelopes; hashes remain internal to `.author/`. `corrected` records issue
dispositions from a separate results report and emits changed/added/deleted
IDs with issue links. Run checked `done --all` after `corrected`; the reviewer
alone accepts through `screen --changed` and `reviewed --all` after rechecking
changed items and context. Acceptance requires a fresh screen or full packet
for every current changed or affected item. The writer correction handoff does not include
`finish`; reviewer validation is the next paired step.

Size follows the learning need: one subject or a large course, without padding
or omitted families. The planner owns scope and difficult judgment; the writer
owns teaching, questions, answers, formatting and corrections. The reviewer
returns concise evidence-backed judgments and never rewrites course content.
Mechanical completion and coverage scores alone do not prove mastery.
