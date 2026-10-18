# Course-local question bank

New banks use `questions/skills.yaml`; legacy `types.yaml` remains readable.
Use one catalog only. Keep items in `questions/bank.yaml` or additional bank
files, and sparse standards in `questions/assessment.yaml`. Files are lists.
Stable skill and item IDs survive reordering. Response format is `response.kind`.

```yaml
# skills.yaml
- id: normalize
  task: Normalize an equation before solving.
  standard: Independently divide every term by the leading coefficient.
  family: family-linear
```

The canonical family supplies teaching destinations and concept links. Its
unique owning objective supplies objective/scoring ownership. If a relationship
is absent or ambiguous, supply `concepts`, `objectives`, and (for multiple
objectives) one `scoreFor` explicitly. Equal names do not establish a link.
`families: [...]` replaces singular `family` when several are intentional.
Derived values and resulting assessment contributions appear in author packets.

```yaml
# bank.yaml
- id: q-normalize-1
  skills: [normalize]
  q: '<p>Divide <m>3y\prime+6y=9</m> by 3. What coefficient multiplies <m>y</m>?</p>'
  response: {kind: number, value: 2}
  why: '<p>Every term is divided by 3.</p>'
  verified: true # only after checking
```

A normal item needs its identity, skill references, prompt, valid answer and
checked feedback. Curriculum metadata is inherited, never copied onto items.
`quiz: [q-normalize-1]` places an ordinary item in a lesson. Placement supplies
practice membership; it does not certify that the lesson teaches the skill.
Legacy types retain their old placement-derived teaching behavior.

Skill exceptions: `teach` supplies explicit subsection/category anchors;
`membership` extends scope without inserting lesson content; `requires` forms a
prerequisite DAG, used for diagnosis rather than blocking access; `assess: false`
marks supporting skills; `diagnose` links diagnostic item IDs. Default relative
`importance` is 1. Objectives may declare their default outcome `importance`.
`representations: [graph, equation]` declares meaningful required variation.
A missing teaching route needs a reviewed external-teaching/assessment-only
exception before publication; an imported draft can still offer limited practice.

Item exceptions have separate meanings:

- `demand`: `foundation`, `standard` (default), or `extension`, relative to the
  skill's declared standard. This is an author judgment, not calibrated difficulty.
- `support`: a list containing `supplied-method`, `supplied-result`, or
  `worked-example`. Hints/reveals also record actual runtime assistance.
- `group`: related solution templates. Omission means unknown independence.
  Different labels alone do not prove independent transfer.
- `representation`: one meaningful variation ID, when relevant.
- `use`: `practice` (default), `diagnostic`, or `check`. Reserved items cannot be
  placed in lesson quizzes; diagnostic items need a skill's diagnostic link.
- `errors`: reviewed hypotheses `{id, description, match?}`. A match is a textual
  signature for optional analysis, never proof of a learner misconception.

Multiple `skills` mean one all-required joint task. A wrong final answer cannot
identify the failed component. Declare alternative valid methods with
`routes: [[skill-a], [skill-b, skill-c]]`; `skills` contains the union of these
routes. Unobserved routes remain ambiguous. Do not copy prerequisite closure
into assessed skills. Legacy `demonstrates` links remain provisional.

Use `steps` only when separately checked work reveals useful evidence:

```yaml
steps:
  - id: model
    skills: [mixing-model]
    q: Write the rate of salt entering in grams per minute.
    response: {kind: number, value: 12}
  - id: solve
    skills: [linear-first-order]
    q: Use the supplied rate equation to find the amount after ten minutes.
    support: [supplied-result]
    response: {kind: number, value: 40, tolerance: 0.1}
```

Steps retain ordering and parent identity. A supplied upstream answer is
assistance; a correct downstream step does not prove independent whole-task
performance. Each step requires a distinct stable ID, parent skill links, prompt,
and valid response. Parent tasks retain their own prompt/response.

```yaml
# assessment.yaml
- scope: course
  criteria: Independently choose and execute the required solution methods.
  skillWeights: {normalize: 2} # optional override within its outcome
  requirements:
    representations: {normalize: [equation]}
    integrations: [[mixing-model, linear-first-order]]
```

Default target is 0.90 and essential outcome floors are 0.80. These are product
criteria, not confidence levels. Outcome budgets default to objective importance;
skill importance divides its owner's budget. Splitting a skill cannot increase
its outcome's total contribution. Sparse `outcomes` overrides accept `weight`,
`essential`, `floor`, and `criteria`; `skillWeights` replaces defaults for that
assessment. Legacy `typeWeights` is an alias; do not supply both. Integrations
and representations are evidence gates, without extra copies of component weight.
Never reproduce the derived inventory in an assessment file.

Item versions distinguish semantic content/skill definitions, evidence metadata
(demand, assistance, groups, routes), and organization (help, membership). Moving
a lesson or changing importance does not invalidate valid answers. Materially
changed capability/task/answer definitions do. All proposals must be reviewed
against source-backed standards and siblings; generated metadata is a suggestion.
The compiler rejects unknown new fields, conflicting catalogs, invalid steps,
ambiguous scoring owners, and prerequisite cycles. It cannot prove that a skill
mapping, grouping, or demand classification is pedagogically correct.

Preview migration without changing course files:
`node tools/question-bank-preview.mjs <course ID or directory>`.
The report preserves IDs, lists derived links and scope contributions, and
marks legacy standards/demand/support/independence for review. It proposes no
automatic pedagogical acceptance and writes nothing.

Set `quarantined: true` on a reviewed defective item to exclude its current
results from learner evidence and adaptive selection. Retain its identity and
history for auditing; it cannot satisfy usable publication inventory. Repair
and re-review its content before clearing quarantine. Essential floors belong
to assessment outcomes; `essential` is not a supported skill property.
