# Questions

Use inline typed questions when a course is small and each check belongs to one
lesson. When questions need stable identities for repeated practice, reuse, or
shared history across lessons, define types in `questions/skills.yaml` (legacy `types.yaml` remains readable), store
each item once in `questions/bank.yaml`, and record sparse assessment criteria
in `questions/assessment.yaml`. Lesson quiz lists reference bank IDs. Keep type
metadata and assessment criteria in their owning files; do not copy them into
each question.

Every bank question has `skills` (or legacy `typeId`), `q`, inherited curriculum links, a typed
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
check but never substitutes for it. Section-end questions must support the
promised capability even when there is no separate Practice area. Assess
whether learners can discover the needed decision on an unfamiliar in-scope
task, then retrieve, distinguish, apply, or connect what the reading taught.
When methods combine, ask for the decision and reasoning rather than changing
only numbers. Explain why the answer follows and address likely errors in
feedback. Supply working representations when construction is not the target.

An explicitly assessment-required family needs an actual, non-diagnostic task
attached to its mapped type. Test the declared method or decision; a type name,
source tag, or family label without a usable prompt does not satisfy the
requirement.
