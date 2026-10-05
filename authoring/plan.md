# Plan packet

The plan is a small machine-readable packet, not a manuscript. It must cover
the source and problem-family inventory before prose starts.

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

Inventory source families, not just topics: definitions, mechanisms,
procedures, exceptions, diagrams, values, and the distinct problem surfaces
that require retrieval. Record exact locators. Inventory every relevant candidate, then select the
required capabilities for this goal. Do not turn the inventory into one lesson
or question per family: related families can share teaching and assessment
when that evidence actually tests each. Exclusions/background need a reason;
required families cannot disappear merely to shorten the course. An active
objective is incomplete if it has no teaching and question evidence, or if its
prerequisite is not planned earlier or declared in the reader background.

Preserve an approved plan's learning intent, not an accidentally oversized
outline. When the plan conflicts with the requested goal, flag the mismatch and
propose the smallest complete outline before production; never silently drop
required capabilities.

The planner decides scope, order, reader calibration, objective outcomes,
family coverage, and difficult judgment. It writes only keys and requirements,
scope, and source-family judgments; it does not draft teaching prose or
normalize source wording. It may leave an explicit open choice for the writer,
with the condition that resolves it. The writer owns concept bodies, examples,
sentence shape, HTML, and block arrangement inside approved scope. A single
role keeps the same artifacts and writes directly; paired mode hands the
packet to a writer and then a reviewer.

Assign lesson-local families and sources even when lessons share an objective.
