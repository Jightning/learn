# Authoring flow

Read local `courses/` first. Resume the named course, or the sole unfinished
course when the user says continue. If several are plausible, ask only for its
ID. Course content always lives in `<current workspace>/courses/<id>/`; hidden
`.author/` holds generated state only. Never find a different checkout to write
into. Use `--workspace` only when the user explicitly selected that workspace.
Run status once at startup or handoff; preserve approved scope and completed
files. Missing plan.yaml means migrate approved planning, not re-inventory it.
All modes finish course writing before initial review and finish initial review
before correction. Batches bound writer context. During review, `batch` links
the combined section screens and shared context rather than asking for one
item at a time.

## Manual paired: three prompts, plus correction and recheck when needed

When the user requests separate models, manual switching, or no subagents,
persist `--mode paired --handoff manual`. No subagents. Status selects the role;
the user need not name a phase. Internal batches do not require user handoffs.

1. Strong planner inventories sources once and writes the compact plan plus
   `categorize/{objectives,families,concepts}.yaml`, with exact lesson
   family/source assignments and reader prerequisites. It writes keys,
   requirements, scope, and source-family judgments only; it never drafts
   teaching prose. End with one line: “Switch to your writer model and say: Continue
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
3. Strong reviewer screens each section, then uses full packets for source or
   math judgments and inspects exact supporting spans: flagged uncertainty,
   high-risk claims and representative families. Screening excerpts are
   deterministic leads, not sufficient evidence for truth judgments. It
   records concise judgments, not rewritten lessons. If clean, mark reviewed,
   finish, audit and pack. For defects, save one consolidated issues report.
   Read the shared `.author/<id>/review-context.yaml` once for the whole review;
   section packets link to it and provide only a small local outline. Group IDs
   in packet requests so repeated source spans are read once across each batch.

4. If corrections are needed, the writer applies them, reports dispositions
   with `corrected --report PATH`, then runs checked `done --all`. Return issue
   IDs and changed IDs to the reviewer. The writer does not run `finish` or
   accept its own corrections.
5. The reviewer runs `screen --changed`, expands IDs that need source or math
   evidence, rechecks changed items and affected context, records
   `reviewed --all`, then finishes, audits, and packs. This fifth prompt is
   required after corrections. No section-by-section switching.

Unresolved truth/scope issues remain explicit; never claim independent
re-review that did not occur. A serious uncertainty can require further human
judgment. Minor corrections still belong to the writer: the expensive model
never rewrites, reformats or converts content.

## Automatic paired

Persist `--handoff auto`. Use the configured cheap writer with explicit model
and effort, `fork_turns: none`, assigned file ownership, relevant packets and
no inherited conversation. Never silently inherit the expensive model. Wait
for a completed batch; do not poll at short intervals or pre-review files while
it writes. Reuse checked results. Return only paths, checks and uncertainties.
Use focused strong judgments as above; finish all assigned reviews, then save
one consolidated issues report. Fresh cheap workers apply corrections and
write a separate correction-results report, then run checked `done --all`.
Reviewers read the shared review context once and reuse it across section
packets. Group item IDs to deduplicate source spans. After correction, the
reviewer screens changed items and affected context before acceptance; fresh
screening is required for every current changed or affected item.
Run the same initial writer format pilot.
If explicit dispatch is unavailable, switch to manual course-wide flow.

## Single

The current model plans, writes, checks, and reviews directly using the same
plan, stable IDs, issues report, correction-results report, and screen packets.
No handoff or duplicated manuscript. Apply the same correction and recheck
sequence; `reviewed --all` accepts the review in this direct single-model flow.

## Bounded work

Let n include source bytes, authored content and evidence links. Process each
once per phase; retain source extraction and compact prerequisite/evidence
indices on disk. Never feed accumulated course prose or the full plan to every
lesson. Request only local prerequisites, original selected items and exact
source spans. Review unchanged accepted items once; recheck only changed items.
Use whole-course `done --all` and `reviewed --all` when finishing a course; run
global coverage/audit/pack once at completion, not after each lesson.

Normal model work must grow proportionally to n; avoid multiplying it by the
number of lessons or handoffs. If one focused correction fails, stop and report
the uncertainty rather than loop. This bounds normal work, not wall-clock time,
provider latency or arbitrary model retries. Large courses may require fresh
writer contexts internally; resume from files with the same user prompt.

When a usage budget applies, save starting meter/reset/approved increment in
`.author/<id>/usage.yaml`, preserve across handoffs and include child usage.
Account-wide percentages cannot be inferred from token estimates.
