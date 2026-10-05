# Course data shape

The current course shape is positional: `sections/NN-slug/_section.yaml` and
one subsection YAML file per reader-facing subsection. `course.yaml` holds
identity and state; `categorize/{objectives,families,concepts}.yaml` owns new
curriculum definitions. `questions/`, `categories/`, `practice/`, `materials/`, and `assets/`
hold their named artifacts. Legacy `concepts/`, `q/a`, and `drills/` remain
supported; new work uses typed `response:` and the current publish contract.

Run `node tools/author.mjs index <course>` after drafting. It assigns missing
`authorId` values to blocks, quiz items and practice items. Metadata must already
have named `id` values for planning references; the index reuses those names and
gives the plan the reserved review handle `author-plan`. IDs must be unique
across the course; use distinct objective/family/concept names. Existing IDs
are preserved through edits. Do not invent positional IDs. Indexing serializes
only files missing IDs, so YAML presentation/comments in those files may be
normalized once; it never asks a model to reformat the course.

```yaml
# subsection
title: <title>
blocks:
  - t: def
    term: <term>
    source: <exact source or unverified/generated>
    sourceReview: sourced # only after checking the named origin; otherwise disclosed
    core: <one opening claim>
    h: <development>
quiz:
  - type: <skill identity>
    concept: <concept key>
    objectives: [obj-1]
    family: family-1
    q: <prompt>
    response: {kind: self, model: <checked answer>}
    verified: true # only after independently working out the answer
```

`core:` stores the block's own opening claim. `gist:` is a deliberate second
copy shown when a block is closed and must state the claim, not merely name its
topic. A `def`, `key`, or `trap` has exactly one of them and has `source:`.
Define a term once where first needed; a subsection need not repeat a `def`.
Every quiz has `type`, `q`,
`response`, and a resolvable `concept`. Teaching blocks and questions carry
their approved `objectives:` and `family:` (or `families: [...]` for genuinely
shared assessment) tags when the packet supplies them;
these tags make source-family coverage auditable without duplicating prose.
Record checked source origins and answer verification while writing; leaving
their publish fields absent creates avoidable repair work. Markers never replace
the actual checks or the reviewer's independent checks.

Prefer checked responses when the learning outcome permits: `single` for one
choice, `multi` for select-all-that-apply, `number` for a numeric input, and
`formula` for a scalar expression or an equation with an isolated answer variable.
Reserve `self` for reasoning, proofs, or answers outside the supported checker.
`self.model` displays a direct answer with any reasoning needed for self-check;
the card supplies the comparison framing. `formula.answer` is a checked key.
Formula keys give `answer` and `variables`; equations also give `solveFor`.
Prime equations can use `solveFor: "y'"`; `independentVariable` defaults to `x`.
See `formats/questions.md` for bounded derivative/integral support.
For `self`, independent boolean fields `formulaParsing` (inline math editor) and
`mathSymbols` (insertion toolbar) default to false; neither enables grading.
`multi.correct` lists
the 1-based numbers of every correct choice. A numeric response gives `value`
and may give a nonnegative absolute `tolerance`; omitted tolerance defaults to
`0` (exact apart from floating-point rounding). See `formats/questions.md` for
complete examples and choice explanations.

Use a `cat:` only for a declared category with a boundary and members; use
secondary lowercase hyphenated `tags:` sparingly. A `label` names one block.
Do not write interface words, positional IDs, or generated material fields by
hand when the reader derives them.

Use only blocks that serve the planned outcome, in dependency order. No fixed
opener/definition/rule/example/figure/trap sequence is required. A depth block
explains an already reached claim; an apply block builds fluency without
re-explaining. Test the first representative lesson with `author pilot` before
bulk writing; fix format/tag gaps once and carry that pattern forward.

Questions allow one try by default. To allow more, add `tries: 3` beside
`q:` and `response:` (not inside `response`). This means three total tries,
including the first; use a positive integer. The same field works in quiz,
practice, and legacy question items. See `formats/questions.md` for retry behavior.

Bank courses use ordered `quiz: [q-id]` references and inherited metadata.
Read `formats/question-bank.md` only for bank/type/assessment work; legacy
inline questions keep the shape above. The index assigns bank `id` once and
reuses it as its review handle.

For an inline-to-bank migration only, run `node tools/migrate-question-ids.mjs`
with the unchanged legacy snapshot and migrated course as directed by its
usage. Unique prompt/response/tries/stimulus matches create stable aliases once
in `questions/aliases.yaml`; resolve ambiguous matches explicitly. Do not
regenerate aliases during routine author startup or rewrite learner history.
Unknown first-try legacy evidence remains unknown.
