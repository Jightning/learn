# Question response schemas

Current questions have `type`, `q`, `concept`, optional `objectives` and
`family`, typed `response`, and optional `why`. The supported response kinds are
`single`, `multi`, `number`, and `self`.

```yaml
response: {kind: single, correct: 1, choices: [{text: 'A', why: 'It matches the rule.'}, {text: 'B', why: 'It confuses the boundary.'}]}
```

```yaml
response: {kind: multi, correct: [1, 2], choices: [{text: 'A', why: 'Required.'}, {text: 'B', why: 'Required.'}, {text: 'C', why: 'Not implied.'}]}
```

`multi` renders checkboxes. Choice numbers start at 1; the reader must select
the complete correct set, with no extra choices. Use this when more than one
answer is correct and say "Select all that apply" in the prompt. There is no
fixed number of choices; every `correct` number must refer to a listed choice.

```yaml
response: {kind: number, value: 12, tolerance: 0.2, unit: cm}
```

```yaml
response: {kind: number, value: 12} # omitted tolerance defaults to 0
```

`number` renders a numeric input. The reader accepts a finite answer when its
absolute difference from `value` is at most `tolerance`, with a tiny allowance
for floating-point rounding. `tolerance` must be nonnegative and defaults to
`0` if omitted; choose an explicit tolerance when rounding or measurement
variation should count. `unit` is optional display text; the reader enters
only the number.

```yaml
response: {kind: self, model: 'The model answer the reader compares after attempting.'}
```

Choice `why` explains why the tempting wrong choice fails. Legacy `q/a` remains readable but new
work uses this shape. A question type identifies a skill surface; the concept
routes retention and review.
