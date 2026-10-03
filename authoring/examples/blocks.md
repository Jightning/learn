# Block examples

```yaml
- t: key
  label: Building the potential
  source: Edwards & Penney §1.6
  core: The potential is built by integrating one component, then fitting the unknown function.
  ordered: true
  items:
    - 'Confirm <m>M_y = N_x</m>.'
    - 'Set <m>F = \int M\,dx</m> with <m>y</m> held constant, plus an unknown <m>g(y)</m>.'
    - 'Differentiate in <m>y</m>, set it equal to <m>N</m>, and solve for <m>g''(y)</m>.'

- t: table
  id: solubility-rules
  cap: Which ionic compounds dissolve, and which form a solid
  head: [Ion, Rule]
  rows:
    - ['Nitrate', 'Soluble']

- t: image
  src: assets/slope-field.png
  alt: Slope field with three solution curves
  cap: Solution curves are tangent to the slope field everywhere

- t: figure
  kind: bar
  id: recall-week
  cap: Recall after one week
  spec:
    valueFmt: '{}%'
    bars:
      - {label: restudy, value: 40}
```

Use the full block rules when adding a shape; this example module is loaded only
for format work.
