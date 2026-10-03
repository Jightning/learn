# Graph figure

```yaml
- t: figure
  kind: graph
  id: states
  cap: The graph shows the state transitions
  spec:
    layout: circle # circle | row | layered | manual
    r: 120
    w: 360
    h: 260
    nodes: [{id: idle, label: Idle, x: 0, y: 0, note: Waiting, title: Idle, accent: 0, state: true, here: true}]
    edges: [{from: idle, to: idle, label: wait, curve: 0, self: true}]
```

Node IDs must be unique; edges refer to existing nodes. Use `note` sparingly
and `title` when a graph has many nodes. Layout values are the listed enum only.
