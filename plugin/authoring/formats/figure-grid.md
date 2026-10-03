# Grid figure

```yaml
- t: figure
  kind: grid
  cap: Highlighted groups cover the adjacent cells
  spec:
    rowVars: [A, B]
    colVars: [C, D]
    rowLabels: ['00', '01', '11', '10']
    colLabels: ['00', '01', '11', '10']
    index: binary
    cells: [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 1, 1], [0, 0, 0, 0]]
    groups: [{label: G1, cells: [[0, 1], [0, 2]]}]
```

`cells` values may use the course's `valueStyles`; group cell coordinates are
`[row,column]` pairs. Keep row and column labels aligned with their variables.
