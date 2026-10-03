# Question examples

```yaml
quiz:
  - type: Classify the reaction
    concept: precipitation-reaction
    q: Which observation identifies a precipitate?
    response:
      kind: single
      correct: 1
      choices:
        - text: A solid forms from dissolved reactants.
          why: This is the defining observable change.
        - text: The solution warms slightly.
          why: Temperature change is not the classification criterion.
    why: The tempting temperature choice confuses an incidental signal with the reaction's defining product.

  - type: Derive the threshold
    concept: threshold
    q: Explain why the threshold is strict in this case.
    response:
      kind: self
      model: The boundary value is excluded by the stated inequality.
```

The exact response schema is validated by the CLI. Keep this file as a format
reference, not as a source of course facts.
