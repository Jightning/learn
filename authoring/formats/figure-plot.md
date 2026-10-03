# Plot figure

```yaml
- t: figure
  kind: plot
  cap: The curves cross at the threshold
  spec:
    series: [{label: f, fn: 'Math.sin(x)', from: -3.14, to: 3.14, samples: 80, dash: false}]
    xlabel: x
    ylabel: f(x)
    xrange: [-3.14, 3.14]
    yrange: [-1, 1]
    ticks: 5
    legend: true
    xfmt: '{}'
    yfmt: '{}'
    w: 420
    h: 260
```

`fn` is a bounded arithmetic expression in `x`: numbers, operators,
parentheses, `pi`, `e`, and approved `Math` functions. Use `points` for
measured data. Format fields are templates containing `{}`; they are not
functions. The validator samples expressions and rejects non-finite output.
