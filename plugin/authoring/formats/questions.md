# Question response schemas

Inline questions have `type`, `q`, `concept`, optional `objectives` and
`family`, typed `response`, and optional `why`. Bank items inherit curriculum
links through their skills; do not copy inline metadata onto them. Response kinds are
`single`, `multi`, `number`, `formula`, `text`, `blanks`, and `self`. Prefer a checked kind when
it fits the outcome; reserve `self` for reasoning or unsupported answer forms.

## Checked text, blanks, points and timing

```yaml
response: {kind: text, accepted: [NAND], normalization: {trim: true, caseSensitive: false}}
```

Text matches complete accepted answers; defaults preserve case and whitespace.
Use `number`/`formula` for mathematical equivalence. Open reasoning can remain
`self`; its grade is labeled self-reported rather than checked.

```yaml
response:
  kind: blanks
  fields:
    - {id: index, label: Selected output index, response: {kind: number, value: 5}}
    - {id: level, label: Asserted level, response: {kind: text, accepted: [low]}}
```

Blanks render labeled fields; IDs stay stable. Supported field kinds are text,
number, single and multi. Each field is checked separately; all must be correct
for whole-task success. Do not use independent fields for coupled alternatives.
Optional `response.scoring.criteria` entries have `id`, `match`, positive `points`,
optional `skills`, and `field` for blanks. Match kinds: `choice` (`value` or
`values`), `choice-set` (`values`), `number` (`value`, optional `tolerance`),
`text` (`accepted`, optional `normalization`). Points describe observed task
criteria; they do not certify skill mastery or override whole-answer checking.

Optional question `timing: {limitSeconds: 60, mode: strict}` enforces a limit;
`mode: pacing` only displays a target. Timers start explicitly and survive reload.
Assessment records may declare the same timing shape for a total check limit.
Timeouts are separate from misconceptions. No time limit is the default.

## Optional multiple tries

Omit `tries` for one try, or add one question-level field:

```yaml
type: Calculation
concept: area
q: 'What is the area of a rectangle with sides 3 cm and 4 cm?'
tries: 3 # three total tries, including the first
response: {kind: number, value: 12, unit: 'cm²'}
```

`tries` must be a positive integer and sits beside `response`, never inside it.
It works for inline lesson questions and bank questions.
The button shows tries remaining. A wrong answer stays editable until the
limit is reached; success, the last try, or **Skip** completes the question.
Correct answers and explanations stay hidden until completion, except `self`
which must reveal its model answer for comparison before the reader grades it.

- `single`: rejected choices stay disabled and marked **Incorrect** on retry.
- `multi`: all choices stay editable; a failed combination cannot be resubmitted.
  Individual choices are not marked, since a failed set may include correct ones.
- `number` and `formula`: keep the answer for editing; no answers are blocked.
- `self`: choose **Wrong** to edit and compare another answer while tries remain.

Formula syntax, loading, and timeout errors use no tries. Lesson reloads retain
the remaining tries and rejected choices. Each submitted try is retained; the final outcome completes the question once.
First-attempt evidence remains distinct from success after retrying.

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

```yaml
response: {kind: number, value: 0.3333333333333333, tolerance: 0.05, allowSymbols: false, unit: factor}
```

`number` renders a numeric input. The reader accepts a finite answer when its
absolute difference from `value` is at most `tolerance`, with a tiny allowance
for floating-point rounding. `tolerance` must be nonnegative and defaults to
`0` if omitted, except `unit: factor` defaults to `0.05`; choose an explicit
tolerance when rounding or measurement variation should count. `unit` is
optional display text; the reader enters only the number. Numeric fields
accept scientific notation and fractions; set `allowSymbols: false` to require
a plain signed decimal (no fractions, exponents, or named constants), including
on individual numeric fields in `blanks`.

```yaml
response: {kind: self, model: 'The slope is positive because y increases as x increases.'}
```

`model` is reader-facing answer content and may include an explanation or worked
reasoning. Respond directly to the prompt; the card already establishes that
this is an answer for comparison. For open-ended questions, show the essential
ideas a correct response needs, allowing valid variations. Use `why` for further
transfer guidance or discussion of tempting mistakes.

For checked formulas, load [Formula responses](question-formula.md); the writer
context selects that recipe for `question:formula`.

```yaml
response:
  kind: self
  model: 'Explain the exponential growth.'
  formulaParsing: true
  mathSymbols: false
```

On `self`, `formulaParsing` uses the inline math editor with automatic prose detection,
including powers/functions such as `e^x` and `sqrt(x)`. `mathSymbols`
independently adds the insertion toolbar and popup. Both default to false and
can be enabled separately or together; grading remains self-check. Math appears inside
the editable input; there is no separate learner preview. Formula responses include
both features automatically.
Model answers also honor `formulaParsing`, including inline math in prose;
Markdown and existing `<m>` notation remain supported.

Choice `why` explains why the tempting wrong choice fails. A question type identifies a skill surface; the concept
routes retention and review.

Questions can also carry `stimulus`: one attachment or an ordered list of prose,
diagrams, images, code, tables, math, and cards. Use it to keep the whole problem
available in Review and Mixed Practice. See [Question stimuli](stimulus.md) for
text before/between/after attachments and a complete example.
