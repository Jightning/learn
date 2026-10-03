# Authoring flow

Read local `courses/` first. Resume the named course, or the sole unfinished
course when the user says continue. If several are plausible, ask only for its
ID. Course content always lives in `<current workspace>/courses/<id>/`; hidden
`.author/` holds generated state only. Never find a different checkout to write
into. Use `--workspace` only when the user explicitly selected that workspace.
Run status once at startup or handoff; preserve approved scope and completed
files. Missing plan.yaml means migrate approved planning, not re-inventory it.

## Manual paired: three user prompts

When the user requests separate models, manual switching, or no subagents,
persist `--mode paired --handoff manual`. No subagents. Status selects the role;
the user need not name a phase. Internal batches do not require user handoffs.

1. Strong planner inventories sources once and writes the compact plan, exact
   lesson family/source assignments and reader prerequisites. It never drafts
   teaching. End with one line: “Switch to your writer model and say: Continue
   this course.”
2. Cheap writer completes setup, writes one representative lesson and runs
   `pilot <id> --sub sN-M` before scaling production. Resolve format/tag gaps
   there, then complete every unfinished lesson. Choose a naturally representative
   lesson, not an artificially enlarged sample. New shapes use their selected
   format rules before writing. Verify answers
   with explicit calculations or executable checks where useful, and runs
   `done <id> --all` once. Preserve existing drafts; repair only actual gaps.
   Reuse extracted spans by their packet excerpt paths; read shared evidence
   once per working context. Save uncertainty and exact evidence locators. End with one line: “Switch to
   your reviewer model and say: Validate and finish this course.”
3. Strong reviewer runs one global coverage pass, then inspects original items
   with exact supporting spans: flagged uncertainty, high-risk claims and a
   representative sample of remaining families. It records concise judgments,
   not rewritten lessons. If clean, `reviewed <id> --all`, finish, audit and pack.
   For defects, save all directives together. Return one optional fourth prompt:
   “On your writer model: Apply the saved corrections, verify the affected
   answers, and finish this course.” No section-by-section switching.

The fourth writer pass applies precise corrections, checks changed items and
finishes when all acceptance conditions are met. Unresolved truth/scope issues
remain explicit; never claim independent re-review that did not occur. A serious
uncertainty can require further human judgment; three prompts is the normal
flow, not permission to publish known errors. Minor corrections still belong to
the writer: the expensive model never rewrites, reformats or converts content.

## Automatic paired

Persist `--handoff auto`. Use the configured cheap writer with explicit model
and effort, `fork_turns: none`, assigned file ownership, relevant packets and
no inherited conversation. Never silently inherit the expensive model. Wait
for a completed batch; do not poll at short intervals or pre-review files while
it writes. Reuse checked results. Return only paths, checks and uncertainties.
Use focused strong judgments as above; finish all assigned reviews, then send
one consolidated correction set. Run the same initial writer format pilot.
If explicit dispatch is unavailable, switch to manual course-wide flow.

## Single

The current model plans, writes, checks and finishes directly. No model handoff
or duplicated manuscript. Write remaining lessons in plan order, then use
`done --all` once; use per-item completion only for targeted repairs. Use the
same scope and evidence requirements.

## Bounded work

Let n include source bytes, authored content and evidence links. Process each
once per phase; retain source extraction and compact prerequisite/evidence
indices on disk. Never feed accumulated course prose or the full plan to every
lesson. Request only local prerequisites, original selected items and exact
source spans. Review unchanged accepted items once; recheck only changed items.
Use whole-course `done --all` and `reviewed --all` when finishing a manual pass;
run global coverage/audit/pack once at completion, not after each lesson.

Normal model work must grow proportionally to n; avoid multiplying it by the
number of lessons or handoffs. If one focused correction fails, stop and report
the uncertainty rather than loop. This bounds normal work, not wall-clock time,
provider latency or arbitrary model retries. Large courses may require fresh
writer contexts internally; resume from files with the same user prompt.

When a usage budget applies, save starting meter/reset/approved increment in
`.author/<id>/usage.yaml`, preserve across handoffs and include child usage.
Account-wide percentages cannot be inferred from token estimates.
