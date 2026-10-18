# Creating a course

Create the course folder with:

```sh
npm run new -- <id> "Course title"
```

The command copies `courses/_template/` into `courses/<id>/`, chooses an unused
accent hue, and creates the machine-local reader profile if needed. Course
content belongs in `courses/<id>/`; `.author/` is generated review state.

Start or resume the authoring workflow with:

```sh
node tools/author.mjs begin <id> --mode single|paired --handoff manual|auto [--source PATH]...
node tools/author.mjs status <id>
```

Single mode keeps planning, writing, and review in one context. Paired manual
mode uses one planner, writer, and reviewer handoff; paired auto uses bounded
writer batches. The saved course status determines the next step. Read
[`../authoring/entrypoint.md`](../authoring/entrypoint.md) and
[`../authoring/orchestration.md`](../authoring/orchestration.md) for the
workflow contract.

Write lessons as a complete, connected reading. The default lesson body is
required teaching; mark a genuinely optional expansion with `optional: true`
and place it directly after the passage it extends. Use `follows: true` when
that expansion depends on the preceding block. Required or examinable reasoning
stays in the default reading. Review the assembled passage with
`node tools/author.mjs preview <id> --sub <subsection-id>` and judge it as a
whole for missing links, repeated explanation, and misplaced emphasis.

Calibrate the teaching against actual source questions and solutions, including
their figures and combined methods. Required reading and section-end questions
must support unfamiliar in-scope applications without separate Practice.
Learner research belongs only where consulting evidence is needed and useful,
in a bounded question with a starting source and a way to assess the findings.

The reader's References control previews existing lesson figures, tables, slides,
and concepts without leaving the question. Captions and figure IDs make these
findable; no separate reference inventory is needed. Keep first explanations
and essential task diagrams local rather than relying on the panel.

For a small course whose checks are local to their lessons, write typed
questions inline in each subsection's `quiz` list. For repeated practice,
cross-lesson reuse, or shared question history, use `questions/skills.yaml` (legacy `types.yaml` remains readable),
`questions/bank.yaml`, and `questions/assessment.yaml`; store each question
once and reference its stable ID from lessons. Do not duplicate type metadata,
assessment rules, or question content across those files. Both forms use the
current typed `response` schema. See
[`../authoring/formats/question-bank.md`](../authoring/formats/question-bank.md)
and [`../authoring/formats/questions.md`](../authoring/formats/questions.md).
Learner Learn by goals use the existing subsection scopes, type weights,
prerequisites, and question variants. Authors do not set study minutes or
deadlines. A range with no mapped types or practice variants cannot establish
full readiness.

Useful checks during authoring:

```sh
node tools/author.mjs index <id>
node tools/author.mjs preview <id> --sub <subsection-id>
node tools/validate.mjs --isolated --strict-current <id>
node tools/audit-content.mjs --profile draft <id>
```

Complete the review and publish checks using the saved workflow status. The
reviewer evaluates sources, answers, assembled reading, and reader-visible
coverage; passing mechanical checks alone does not establish correctness.
