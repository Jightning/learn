# Plan packet

The plan is a small machine-readable packet, not a manuscript. It must cover
the source and problem-family inventory before prose starts.

Before new-course writing, show the user a compact outline of capabilities,
prerequisites, applications, exclusions and unresolved evidence. Distinguish
explicit requirements from proposed additions; explain each addition's need.
Compare the requested capability with the source inventory independently:
missing exposition is not proof that a method is outside scope. For example,
an ODE scope may warrant proposing reduction of order even if the supplied
notes omit it; a broad topic title alone does not establish exam requirements.
Ask for outline approval or clarification of material ambiguity, and save the
decision in the existing scope/directives or expectations artifact. Reuse
explicit prior approval; do not invent approval or ask again for unchanged scope.
Any later material addition or exclusion needs the same explicit decision.
Examples, representations and changed-case practice within an approved
capability are ordinary writing choices, not new scope approvals.
Unresolved required coverage prevents a claim of completeness.

```yaml
course: <id>
scope:
  format: <subject|exam-guide|course, matching the request>
  goal: <requested capability, not assumed full-source mastery>
reader:
  background: [<prerequisite stated precisely>]
objectives: [obj-1, obj-2] # definitions live in categorize/objectives.yaml
families: [family-1] # definitions live in categorize/families.yaml
concepts: [concept-1] # definitions live in categorize/concepts.yaml
lessons:
  - id: s1-1
    objectives: [obj-1]
    families: [family-1] # lesson-local references, not repeated definitions
    sources: [{source: src-1, unit: page-1, lines: [3, 8]}]
    needs: ['block:def', 'question:single']
    teaching: # optional; reuse IDs from categorize and reader.background
      outcome: <observable capability under stated conditions>
      requires: [concept-0]
      introduces: [concept-1, obj-1]
      reasoning: <relationship or decisions the reader must be able to reconstruct>
      representation: {job: <relationship to make inspectable>, needs: ['figure:graph']}
      practice: <attempt and useful variation>
      boundary: <assumptions, deferred material, or unresolved source issue>
    directives: <optional deliberate choice or open freedom>
batches: # optional scheduling overrides; no size ceiling
  - {id: section-1, subsections: [s1-1]}
sources:
  - id: src-1
    path: <raw source path>
    kind: pdf|ppt|image|html|repository
    units:
      - id: <unit id>
        locator: <pages/slides/headings/figure or image region>
```

The three `categorize/*.yaml` files own the definitions and judgments. Each is
a list of entries with a stable `id`; the plan stores references and schedule
only. Objectives record outcome, source evidence, prerequisites, risks, and
required evidence. Families record disposition (`teach`, `prerequisite`,
`moved`, or `excluded`), rationale, source loci, and teaching/question routes.
Concepts record their identity and planned reuse. Legacy planning artifacts
remain valid migration inputs; do not duplicate their definitions in the new
plan.

When an assessment, review sheet, or related test establishes that one family
is required, set `assessmentRequired: true` on that existing canonical family.
This opts that family into the finish gate without migrating old families.
Keep its disposition `teach`, give it an exact `sources: [{source, unit}]`
route (including the assessment/problem source when the skill is absent from
the main exposition), lesson-level `teach` routing, and `questions` type IDs.
Use a substantive problem/source unit, not a title-only chapter heading; the
finish path resolves source and unit IDs through the current source catalog.
An explicitly generated route uses `source: generated`, a meaningful `unit`,
and a `provenance` explanation. Excluded, moved, and prerequisite dispositions
cannot satisfy or hide an explicit requirement. Do not set this field because
a topic merely appears in a book; it records an approved assessment obligation.
`write` retains the required IDs in generated state. Clearing a flag or deleting
a family later cannot quietly shrink the agreed scope. Packing and full publish
audit enforce the same obligations, including reopenable source evidence.

The finish report checks for an original substantive main-path block tagged
with the family and a linked canonical objective or concept, plus an actual
task item of an assessable type mapped to that family and the exact source
route. The family's lesson route and the mapped types' `teach` routes must
overlap. Stable block author IDs and task IDs keep the evidence reviewable.
These mechanical
links are not a judgment that the teaching or question is good, and they cannot
discover an unseen or undeclared exam topic; review the routed source and the
original teaching and task before accepting the plan.

Inventory candidates from exposition and representative questions, solutions,
and diagrams; use `sources.md` to infer task demands. Record locators and uncertainty,
then select needed capabilities. Related families may share evidence when it
actually tests each; exclusions/background need a reason;
required families cannot disappear merely to shorten the course. An active
objective is incomplete if it has no teaching and question evidence, or if its
prerequisite is not planned earlier or declared in the reader background.

Preserve an approved plan's learning intent, not an accidentally oversized
outline. When the plan conflicts with the requested goal, flag the mismatch and
propose the smallest complete outline before production; never silently drop
required capabilities.

Allow writers open choices only when the condition that resolves each is
explicit. Single mode edits the same artifacts; paired mode passes them from
planner to writer to reviewer.

Assign lesson-local families and sources even when lessons share an objective.

For every new lesson, a compact `lesson.teaching` brief records the lesson's learning route without
drafting the manuscript. `requires` may name an existing concept/objective ID
or an item in `reader.background`; every other requirement must be introduced
by an earlier lesson. Each concept/objective in `introduces` has one owning
lesson. Tools reject unknown IDs, duplicate ownership, and forward
requirements. Omit fields that do not apply. Legacy plans without briefs remain
usable and keep their existing mapping warnings.

An introduction in a brief is planned evidence, not established understanding;
apply the core teaching contract to its actual content. Include needed local
foundations even when they do not deserve separate curriculum IDs.

A block is mechanically indexed as a written teaching anchor only when it has
`introduces: [the-id]`, substantive teaching
content, and a stable `authorId`;
objective/concept tags locate potentially relevant blocks but do not establish
that an idea was taught. Prerequisite packets include only direct requirements
and their original anchored block content, with author IDs and locations.
Earlier lessons assigned in the same writing batch remain planned until written.
`written` means the content exists, not that a learner has mastered it. Missing
anchors remain visible as planned evidence with a warning, never as mastery.

Use `reasoning` for the learner's central question, the route from known ideas,
and the distinction or mistaken model that the explanation must resolve.
Name what the reader should understand at the introduction, not just the facts
or implementation to cover. Keep it local and brief; do not script prose or
create a per-term checklist.
Use the existing `reasoning`, `practice`, and `boundary` fields to connect
required reading and section-end questions to the lesson outcome, including
without separate Practice. Capture decisions, conditions, applicable stopping criteria,
variation, and limits without fixed word, visual, or question counts. Bound
any needed research and consolidate findings before later reliance.

For bank courses, define `questions/skills.yaml` (legacy `types.yaml` remains readable) alongside lesson planning: one
capability and independent performance standard per skill, a canonical family
link, and only genuine prerequisite judgments. Inherit unique curriculum and
teaching links; supply explicit links when ambiguous. Record sparse assessment
criteria/weight exceptions in `questions/assessment.yaml`; tools derive
bookkeeping. Ambiguous mappings stay explicit for review. Approve the expanded
blueprint and source-to-type/type-to-source coverage before claiming readiness.
Do not infer exam weights from question counts.
