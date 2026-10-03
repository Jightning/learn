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
objectives:
  - id: obj-1
    outcome: <reader-visible capability>
    sources:
      - {source: src-1, unit: <page/slide/heading>, lines: <optional text lines>}
    families: [family-1]
    prerequisites: []
    risk: <optional unresolved issue>
    needs: ['block:p', 'question:single']
lessons:
  - id: s1-1
    objectives: [obj-1]
    families: [family-1] # lesson-local, not all families of a broad objective
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
families:
  - id: family-1
    disposition: teach # teach | prerequisite | moved | excluded
    reason: <needed for the requested goal, or why not>
    source_loci: [src-1/<unit id>]
    teaching: [obj-1]
    questions: [obj-1]
```

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
family coverage, and difficult judgment. It may leave an explicit open choice
for the writer, with the condition that resolves it. It does not draft course
prose or normalize source wording. The writer may choose examples, sentence
shape, HTML, and block arrangement inside the approved scope. A single role
keeps the same artifacts and writes directly; paired mode hands the packet to a
writer and then a reviewer.

Assign lesson-local families and sources even when lessons share an objective.
