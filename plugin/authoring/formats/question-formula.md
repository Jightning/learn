# Checked formula responses

```yaml
response:
  kind: formula
  answer: '2*x + 1'
  variables: [x]
```

Prefer expression-only keys when the prompt names the quantity: omit the
left-hand side and `solveFor`, and request only the expression. Require an
equation only when the relation matters; isolate `solveFor` on either side,
declare it in `variables`, and show the required form in the prompt.
Declare only used variables: at most four declared names, all real scalars.
Constants use `variables: []`.

Keys use plain math text (`2x`, `x^2`, `sqrt(x)`, `pi`, `e^x`, explicit `*`),
not markup. Adjacent ordinary letters multiply: `vC` means `v*C`, requiring
separate `v` and `C` declarations. Subscripts use `_`: `v_C` and `v_c` are
distinct; preserve case and spelling across prompt and key. Greek names such
as `theta` denote single symbols. Show exact input spelling where notation is
ambiguous. Function labels such as `y(t)` cannot replace scalar `y`.

The typeset editor includes insertion buttons and a symbol popup. Supported
functions: `sqrt`, `abs`, `sin`, `cos`, `tan`, `exp`, `log` (natural logarithm).
Limits: 256 characters, 80 syntax nodes, 16 nesting levels, numeric powers
from −12 to 12. Implicit equations, assignments, matrices, units, arbitrary
functions, and custom domain assumptions are unsupported.

Calculus: `diff(expression,x)` (alias `derivative`),
`integral(polynomial,x)`, or `integral(polynomial,x,lower,upper)`; integration
supports single-variable polynomials with numeric coefficients through degree
11. Indefinite integrals use zero integration constant; add `+C` and declare
`C` when required. For unsupported integration, use an evaluated key or `self`.
`y'`, `y''`, and `y'''` match formal derivatives; declare `y` and the independent
variable, with `solveFor: "y'"` for derivative equations. `independentVariable`
defaults to `x`; set it for other prime notation. Editor calculus symbols use
this same syntax.

Reordering, factoring, and expansion can match (`y=2(x+1/2)` matches `y=2x+1`).
Valid nonmatches, including extra variables, are incorrect; no automatic
self-check fallback. Syntax, loading, and timeout errors consume no attempt.
Independently verify every key; matching does not establish mathematical correctness.
