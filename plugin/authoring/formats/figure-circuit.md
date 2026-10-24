# Circuit figure

```yaml
- t: figure
  kind: circuit
  cap: The resistor limits current from the battery
  spec:
    layout: rectangle
    sides:
      top: [{type: resistor, label: R, value: '1 kΩ'}]
      left: [{type: battery, label: B, value: '9 V'}]

- t: figure
  kind: circuit
  cap: The branch splits at the marked junction
  spec:
    layout: manual
    w: 12
    h: 8
    wires: [{from: [1, 2], to: [5, 2]}, {from: [5, 2], to: [9, 2]}, {from: [5, 2], to: [5, 6]}]
    parts: [{type: resistor, x: 3, y: 2, dir: h, label: R}]
    junctions: [[5, 2]]
```

Rectangle sides are travel order. Manual wires join grid points; supported parts
are `resistor`, `capacitor`, `battery`, `switch`, `diode`, `lamp`, and `source`.
Split wires at branches, mark junctions, and remember crossing wires without a
dot do not connect. `dir: v` rotates a part.
Manual wires stop at the terminals of collinear parts automatically; leave
perpendicular crossings clear of component bodies. Check the actual connections,
polarity and current references in the rendered diagram.

Native nMOS/pMOS symbols and control-dependent switch states are not supported.
For those, use a labeled idealized drawing or a sourced/redrawn image; identify
the model. Do not silently replace device connections with prose alone.
