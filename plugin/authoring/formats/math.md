# Math blocks

```yaml
- t: math
  label: Characteristic equation
  tex: 'ar^2 + br + c = 0'
  note: The solution form depends on the discriminant.
```

Use bare TeX in `tex`. Use a literal block or single-quoted YAML scalar; double
quoted `\alpha` is a YAML escape. Inline `<m>` is for a phrase, while `math`
is for an equation that carries the paragraph's point. State spoken results in
prose because formulas are not read aloud.

Single-quoted YAML preserves backslashes: use `tex: '\text{error}'`,
not doubled backslashes before commands. Put multiword labels inside
`\text{...}` and inspect the displayed formula; syntactically valid TeX can
still print unintended letters or lose word spacing.

Text fields (`core`, `h`, prompts and answer models) need `<m>...</m>`
around TeX: `<m>e^{2x}</m>` renders, while bare TeX prints literally.
Validation rejects raw math in prose. Use a math block for a central equation.
Use blank lines for paragraphs; single newlines preserve intentional breaks.
Folded YAML `>` joins source lines so prose wraps naturally on mobile.
