# Flow figure

```yaml
- t: figure
  kind: flow
  cap: The process moves from input to checked output
  spec:
    dir: row # row | col
    steps:
      - {label: Input, note: Read the source}
      - {label: Transform, note: Apply the rule}
      - {label: Check, note: Verify the result}
```

Use `flow` for processes and pipelines. Keep labels short and put explanatory
content in `note` or adjacent prose.
