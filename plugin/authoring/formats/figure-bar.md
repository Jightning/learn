# Bar figure

```yaml
- t: figure
  kind: bar
  cap: Recall after one week
  spec:
    bars: [{label: restudy, value: 40, accent: 0}, {label: retrieval, value: 65, accent: 1}]
    xlabel: Method
    ylabel: Recall percent
    max: 100
    baseline: 0
    ticks: 5
    valueFmt: '{}%'
    w: 420
    h: 240
```

`valueFmt` must contain `{}`. Values are finite numbers and labels are strings.
