# Questions

Use inline typed questions when a course is small and each check belongs to one
lesson. When questions need stable identities for repeated practice, reuse, or
shared history across lessons, define types in `questions/types.yaml`, store
each item once in `questions/bank.yaml`, and record sparse assessment criteria
in `questions/assessment.yaml`. Lesson quiz lists reference bank IDs. Keep type
metadata and assessment criteria in their owning files; do not copy them into
each question.

Every question has a distinct `type`, `q`, a resolvable `concept`, a typed
`response`, and an independently checked answer. The current response kinds
are `single`, `multi`, `number`, `formula`, and `self`. Prefer checked responses
when they fit; reserve `self` for reasoning, proofs, or answer forms without a
supported checker. `self.model` answers the prompt directly. Include `why`
when it helps explain a tempting error or supports transfer.

For `multi`, key the complete set of 1-based choice numbers. For `number`, set
the checked `value` and an absolute `tolerance` when needed; omitted tolerance
defaults to zero. Formula syntax and limits are in
[`formats/questions.md`](formats/questions.md). Questions may carry a positive
integer `tries` beside `q` and `response`; it counts total attempts including
the first and defaults to one.

When a question needs a passage, figure, code listing, table, equation, image,
or supporting card, attach it through `stimulus`. An ordered stimulus can put
prose before, between, or after attachments; `q` remains the final prompt. See
[`formats/stimulus.md`](formats/stimulus.md).

Question prompts, attachments, and answers are reader-facing content. Apply
the same source, math, HTML, and uncertainty rules as lesson prose. Work out
every answer independently; a source citation or `verified` marker records the
check but never substitutes for it. Questions should retrieve, distinguish,
apply, or connect capabilities already taught. When the goal combines methods,
ask for the decision and reasoning rather than changing only the numbers.

An explicitly assessment-required family needs an actual, non-diagnostic task
attached to its mapped type. Test the declared method or decision; a type name,
source tag, or family label without a usable prompt does not satisfy the
requirement.
