# Course-local question bank

Keep definitions in `questions/types.yaml`, items in `questions/bank.yaml`
(or additional bank files), sparse requirements in `questions/assessment.yaml`.
Each file is a sequence. Existing inline quizzes/practice remain readable.

```yaml
# types.yaml
- id: normalize
  task: Normalize an equation before solving.
  concept: example-concept
  objectives: [obj-normalize]
  families: [family-linear]
  teach: [s1-1]
```

```yaml
# bank.yaml
- id: q-normalize-1
  typeId: normalize
  q: '<p>Divide <m>3y\prime+6y=9</m> by 3. What coefficient multiplies <m>y</m>?</p>'
  response: {kind: number, value: 2}
  why: '<p>Every term is divided by 3.</p>'
  verified: true # record only after checking
```

```yaml
# subsection: ordered placement only
quiz: [q-normalize-1]
```

```yaml
# assessment.yaml
- scope: course
  criteria: Normalize and independently choose an appropriate solution method.
```

A type requires `id`, `task`, `concept`, `objectives`, `families`. Reuse approved
curriculum IDs. `teach` links to subsection/category help; omitted help derives
from lesson references in course order. `requires` is a DAG for diagnosis,
never a prerequisite gate. `scope` adds section/course membership without
inserting questions beneath lessons. `assess: false` marks supporting types.
Several objective links require one `scoreFor`; coverage links confer no extra
score. `diagnose` names useful discriminating items only when needed.

Items require `id`, `typeId`, `q`, valid `response`, useful checked feedback and
verification at publish. Type metadata is inherited once; do not repeat it.
`use` defaults to practice; `diagnostic` and `check` cannot appear in lesson
quizzes. `group` defaults to the conservative default group. Different group
names claim different reasoning/representation, requiring reviewer judgment.
`demonstrates` lists only reviewed unavoidable observable skills; never copy
prerequisite closure. See the selected response-format rules for answers.

The index assigns missing item IDs once, adopting an existing `authorId` alias;
never renumber on reordering. Keep a single canonical bank identity. Existing
inline author IDs remain unchanged. Write concise answer-check evidence in the
private authoring state; compare sibling derivations together.

Assessment records require `scope` and reviewed `criteria`. Default target is
0.90, outcome floors 0.80, with equal outcome then within-outcome weights.
These are provisional criteria, not a predicted exam percentage. Optional
`outcomes` overrides `weight`, `essential`, `floor`, `criteria`; `typeWeights`
changes relative weights inside one scoring outcome. Omitted outcome entries
retain defaults. Never reproduce the derived inventory. Review expanded scope,
scoring ownership, representative tasks and independence. Self-checked work
stays self-assessed; no machine rubric or probabilistic claim is invented.
