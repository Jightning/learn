# Question stimuli

Review and practice prompts can carry a self-contained stimulus so they survive
Review and Mixed Practice outside subsection context. Use one of these shapes:

```yaml
stimulus: {t: passage, text: '<p>The short source passage the question needs.</p>', source: 'Book p. 4'}
```

```yaml
stimulus: {t: image, src: assets/diagram.png, alt: 'The labeled circuit', cap: 'The circuit routes current through R.'}
```

```yaml
stimulus: {t: figure, kind: graph, spec: {layout: row, nodes: [{id: a, label: A}, {id: b, label: B}], edges: [{from: a, to: b}]}, cap: 'The graph shows the transition.'}
```

Keep the stimulus complete and bounded. Cite its raw source locator and preserve
visual uncertainty; do not assume the surrounding subsection will be present.
