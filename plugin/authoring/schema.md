# Course data shape

The current course shape is positional: `sections/NN-slug/_section.yaml` and
one subsection YAML file per reader-facing subsection. `course.yaml` holds
identity and state; `concepts/`, `categories/`, `practice/`, `materials/`, and
`assets/` hold their named artifacts. The CLI and reader retain compatibility
with legacy `q/a` and `drills/`; new work should use typed `response:` and the
current publish contract.

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

For checked questions, use `response.kind: single` for one choice, `multi` for
select-all-that-apply, or `number` for a numeric input. `multi.correct` lists
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
