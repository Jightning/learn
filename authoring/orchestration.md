# Authoring flow

Read local `courses/` first. Resume the named course, or the sole unfinished
course when the user says continue. If several are plausible, ask only for its
ID. Course content always lives in `<current workspace>/courses/<id>/`; hidden
`.author/` holds generated state only. Never find a different checkout to write
into. Use `--workspace` only when the user explicitly selected that workspace.
Run status once at startup or handoff; preserve approved scope and completed
files. Missing plan.yaml means migrate approved planning, not re-inventory it.
All modes finish course writing before formal review and finish that review
before consolidated correction. Batches bound writer context. During review, `batch` links
the combined section screens and shared context rather than asking for one
item at a time.

In every mode, resolve plan.md's outline approval before first writing or a
writer handoff; reuse an unchanged approved scope when resuming.

For revisions, reconcile affected briefs/directives with the current task before
writing. Preserve approved outcomes, source routes and completed work; replace
stale instructions locally rather than restarting planning.

When an explanatory approach is unproven or repeated learner complaints expose
failure, use one representative complete subsection as a bounded calibration
batch before bulk writing. Choose a difficult dependency or source ambiguity,
not just easy recall. Inspect its introduction, first worked case and changed
task in isolation using review.md's reader check; a format-only `pilot` cannot answer that
question. Return the earliest missing explanation, then continue with the same
writer context and reuse the checked material in final review. This is an early
writing sample, not per-lesson handoffs or formal acceptance. Repeated failure
calls for reassessing the brief or authoring approach, not expanding a repair
loop. Ordinary proven work keeps the single writing pass.

## Manual paired: three prompts, plus correction and recheck when needed

When the user requests separate models, manual switching, or no subagents,
persist `--mode paired --handoff manual`. No subagents. Status selects the role;
the user need not name a phase. Internal batches do not require user handoffs.

1. Strong planner inventories sources once and writes the compact plan plus
   `categorize/{objectives,families,concepts}.yaml`, with exact lesson
   family/source assignments, teaching briefs, and reader prerequisites. It writes keys,
   requirements, scope, and source-family judgments only; it never drafts
   teaching prose. End with one line: “Switch to your writer model and say: Continue
   this course.”
2. Cheap writer completes setup, then writes coherent lesson sequences from
   their teaching briefs. Use `pilot <id> --sub sN-M` as a format smoke check
   for new or unfamiliar shapes; it does not require a reviewer handoff.
   Resolve local format/tag gaps while writing. Inspect assembled passages
   with `preview <id> --sub sN-M` and their final layout in the real reader. Verify answers
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

Persist `--handoff auto`. Use one writer for a coherent prerequisite sequence. Parallel workers own
independent branches only; planned teaching from another worker is unavailable
until written. Start new workers with the configured cheap model
and explicit effort, `fork_turns: none`, assigned file ownership, relevant packets and
no inherited conversation. Never silently inherit the expensive model. Wait
for a completed batch; do not poll at short intervals or pre-review files while
it writes. Reuse checked results. Return only paths, checks and uncertainties.
Use focused strong judgments as above; finish all assigned reviews, then save
one consolidated issues report. Reuse a reliable writer for related batches
and consolidated corrections; a batch boundary alone does not justify a new
agent. Start fresh when context or repeated failure makes reuse unreliable,
or when an independent role or parallel workload justifies startup overhead.
The writer records correction results and runs checked `done --all`;
the reviewer still accepts separately.
Reviewers read the shared review context once and reuse it across section
packets. Group item IDs to deduplicate source spans. After correction, the
reviewer screens changed items and affected context before acceptance; fresh
screening is required for every current changed or affected item.
Use the same local format smoke check for unfamiliar shapes.
If explicit dispatch is unavailable, switch to manual course-wide flow.

## Single

The current model plans, writes, checks, and reviews directly using the same
plan, stable IDs, issues report, correction-results report, and screen packets.
No handoff or duplicated manuscript. Apply the same correction and recheck
sequence; `reviewed --all` accepts the review in this direct single-model flow.

## Bounded work

Read shared rules/evidence once per phase. Give each assignment only its local
brief, prerequisites and exact source spans; never repeat the whole course.
Reuse checked results and grouped packets. Run global completion/coverage checks
once at completion; after correction, recheck changed items and affected context.
If one focused correction fails, report the uncertainty rather than looping.
Resume large courses from files; fresh contexts do not require a new user handoff.

When a usage budget applies, save starting meter/reset/approved increment in
`.author/<id>/usage.yaml`, preserve across handoffs and include child usage.
Account-wide percentages cannot be inferred from token estimates.
