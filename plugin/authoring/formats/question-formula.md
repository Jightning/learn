# Checked formula responses

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
not presentation markup. Expressions omit `solveFor`; constant answers use `variables: []`.
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

