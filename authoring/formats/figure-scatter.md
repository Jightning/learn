# Scatter figure

```yaml
- t: figure
  kind: scatter
  cap: The measured variables have a positive relation
  spec:
    series: [{label: sample, points: [[1, 2], [2, 3], [3, 5]]}]
    trend: true
    xlabel: Input
    ylabel: Output
    xrange: [0, 4]
    yrange: [0, 6]
    ticks: 5
    xfmt: '{}'
    yfmt: '{}'
```

Points are numeric `[x,y]` pairs. `trend` adds the fitted trend line; format
fields are templates.
