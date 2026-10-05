# Concepts, categories, and variants

Planning references are declared in `categorize/` as three YAML
lists: `objectives.yaml`, `families.yaml`, and `concepts.yaml`. Each entry has a
stable `id`; lessons and questions reference those IDs. Keep these planning
definitions out of `plan.yaml`. The writer supplies reader-facing concept
bodies in `concepts/<key>.yaml` after scope is approved.

```yaml
# categorize/objectives.yaml
- id: obj-1
  outcome: Classify an initial-value problem
  sources: [{source: src-1, unit: section-4}]
  prerequisites: [obj-0]
  needs: [teaching, question]
  risk: null

# categorize/families.yaml
- id: family-1
  disposition: teach
  reason: Required to meet the requested goal
  source_loci: [src-1/section-4]
  teaching: [obj-1]
  questions: [obj-1]

# categorize/concepts.yaml
- id: initial-value-problem
  reuse: 3
  objectives: [obj-1]
```

```yaml
# concepts/<key>.yaml
term: Initial-value problem
body: '<p>A differential equation coupled with an initial value.</p>'
src: Defined in §4.1

# categories/<key>.yaml
name: Precipitation reactions
short: PPT
boundary: '<p>Dissolved substances form one or more solid products.</p>'
siblings: [acid-base-reactions, redox-reactions]

# practice/<key>.yaml
concept: initial-value-problem
items:
  - q: Solve the changed surface.
    response: {kind: number, value: 4, tolerance: 0}
    verified: '2026-10-02'
```

Promote an idea used in three or more places to a concept. Categories need a
boundary, declared siblings, and members; `cat` is one principal kind and tags
are secondary slugs. Variants hold the concept and response kind while changing
surface, context, or difficulty.
