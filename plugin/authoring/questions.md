# Questions

Each subsection question represents a distinct skill surface. Give it one
`type`, a resolvable `concept`, a typed `response`, and a checked answer. The
question should make the reader retrieve or discriminate something taught in
the subsection. Include a `why` when it helps transfer; explain why the
tempting wrong answer looks plausible, not only why the key is right.

Prefer a checked answer whenever it fits the skill: `single`/`multi` for selection,
`number` for numeric results, and `formula` for supported symbolic results.
Use `self` for explanations, proofs, and unsupported answer forms rather than
as the default. See `formats/questions.md` for formula syntax and limits.
`self.model` is the displayed answer, including the reasoning needed to judge
an attempt; `formula.answer` is the automatically checked key. Write model
answers as direct responses to the prompt. The card supplies comparison framing
and controls, so answer content should focus on the result and its justification.
For open-ended prompts, make the essential ideas clear while allowing other
valid wording or examples.
For `multi`, key the complete set
of 1-based choice numbers. For `number`, set the checked `value` and an
absolute `tolerance` when needed; omitted tolerance defaults to `0`.

Use a section synthesis item when the section composes several ideas. A
subsection's question count is a floor for coverage, not a target to pad. A
second application belongs in practice when it adds a useful surface,
context, or difficulty. Do not create three numerical copies of one question
type and call them variety.

Question prompts and answers are reader-facing content. Apply the same closure,
source, math, HTML, and uncertainty rules as prose. Work every answer out
independently before writing it; a source citation or `verified:` marker records
the check and never substitutes for it.

For a diagram, code listing, image, table, equation, or supporting card, attach
`stimulus` to the question. An ordered list lets prose appear before, between,
and after attachments; `q` remains the final question. See `formats/stimulus.md`.

Questions allow one try by default. To allow more, add `tries: 3` beside
`q:` and `response:` (not inside `response`). This means three total tries,
including the first; use a positive integer. The same field works in quiz,
practice, and legacy question items. See `formats/questions.md` for retry behavior.
