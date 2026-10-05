# Question response schemas

Current questions have `type`, `q`, `concept`, optional `objectives` and
`family`, typed `response`, and optional `why`. The supported response kinds are
`single`, `multi`, `number`, `formula`, and `self`. Prefer a checked kind when
it fits the outcome; reserve `self` for reasoning or unsupported answer forms.

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
It works for subsection quizzes and practice banks, including legacy questions.
The button shows tries remaining. A wrong answer offers **Try again** until the
limit is reached; success, the last try, or **Skip** completes the question.
Correct answers and explanations stay hidden until completion, except `self`
which must reveal its model answer for comparison before the reader grades it.

- `single`: rejected choices stay disabled and marked **Incorrect** on retry.
- `multi`: all choices stay editable; a failed combination cannot be resubmitted.
  Individual choices are not marked, since a failed set may include correct ones.
- `number` and `formula`: keep the answer for editing; no answers are blocked.
- `self`: choose **Wrong**, then **Try again** to edit and compare another answer.

Formula syntax, loading, and timeout errors use no tries. Lesson reloads retain
the remaining tries and rejected choices. The final outcome is recorded once
for progress and review scheduling; intermediate wrong tries do not complete it.

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
response: {kind: self, model: 'The slope is positive because y increases as x increases.'}
```

`model` is reader-facing answer content and may include an explanation or worked
reasoning. Respond directly to the prompt; the card already establishes that
this is an answer for comparison. For open-ended questions, show the essential
ideas a correct response needs, allowing valid variations. Use `why` for further
transfer guidance or discussion of tempting mistakes.

```yaml
response:
  kind: formula
  answer: 'y = 2*x + 1'
  variables: [x, y]
  solveFor: y
```

`formula` provides a single-line typeset math editor, basic insertion
buttons, and a `…` symbol popup. Use plain math text: `2x`, `x^2`, `sqrt(x)`,
`pi`, `e^x`, and `*` for explicit multiplication. Typed function names such as
`sqrt` and `abs` automatically become math notation; the Greek-letter picker
displays glyphs while keeping their names accessible. Keys use plain math text,
not HTML or LaTeX. Expressions omit `solveFor`; constant answers use `variables: []`.
Equations must isolate `solveFor` on either side; general implicit equations
are unsupported. Variables are real scalars, with at most four declared names.
Supported functions are `sqrt`, `abs`, `sin`, `cos`, `tan`, `exp`, and `log`
(natural logarithm). Limits: 256 characters, 80 syntax nodes, 16 nesting levels,
and numeric powers from -12 to 12. Assignments, matrices, units, arbitrary
functions, and custom domain assumptions are unsupported.
Calculus supports `diff(expression,x)` (also `derivative`) and
`integral(polynomial,x)` or `integral(polynomial,x,lower,upper)` for single-variable
polynomials with numeric coefficients up to degree 11.
An indefinite integral denotes the primitive with zero integration constant;
add `+C` and declare `C` when the question expects that constant. General
nonpolynomial integration is unsupported; use an evaluated key or `self`.
`y'`, `y''`, and `y'''` match the corresponding formal derivatives of `y`;
declare both `y` and the independent variable, and use `solveFor: "y'"` for
derivative equations. `independentVariable` defaults to `x`; set it to a declared
variable for other prime notation. The editor's integral and differential
symbols use the same checker syntax. Valid extra variable names in learner
answers count as nonmatching, rather than producing a syntax error.
Reordering, factoring, and expansion can match, including `y=2(x+1/2)` for
`y=2x+1`. Valid formulas that do not match are marked incorrect by default;
there is no automatic self-check fallback. Syntax, loading, and timeout errors
allow editing or retrying without recording an attempt. Independently work
out every key; the checker does not validate the mathematics of the question.

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
authored HTML and existing `<m>` notation remain supported.

Choice `why` explains why the tempting wrong choice fails. Legacy `q/a` remains readable but new
work uses this shape. A question type identifies a skill surface; the concept
routes retention and review.

Questions can also carry `stimulus`: one attachment or an ordered list of prose,
diagrams, images, code, tables, math, and cards. Use it to keep the whole problem
available in Review and Mixed Practice. See [Question stimuli](stimulus.md) for
text before/between/after attachments and a complete example.
