# Math blocks

```yaml
- t: math
  label: Characteristic equation
  tex: 'ar^2 + br + c = 0'
  note: The solution form depends on the discriminant.
```

Write TeX, not HTML. Use a literal block or single-quoted YAML scalar; double
quoted `\alpha` is a YAML escape. Inline `<m>` is for a phrase, while `math`
is for an equation that carries the paragraph's point. State spoken results in
prose because formulas are not read aloud.

HTML prose fields (`core`, `h`, prompts and answer models) need `<m>...</m>`
around TeX: `<m>e^{2x}</m>` renders, while bare TeX prints literally. Only a
math block's `tex:` contains bare TeX. Validation rejects raw math in prose.
Use a math block for a central equation; passing mentions remain inline.
Use separate `<p>` elements for separate thoughts. A literal YAML `|-` keeps
source newlines, and each becomes a visible break in the reader. Keep
consecutive prose in one logical line so it wraps naturally on mobile. Folded
YAML `>` turns source newlines into spaces, making it convenient to wrap long
source lines without reader breaks. Use hard breaks only when pedagogically
intentional. In a double-quoted scalar, `"\n"` also creates a visible break;
typing backslash followed by `n` in an ordinary scalar does not.
