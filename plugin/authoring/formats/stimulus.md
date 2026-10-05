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

For several attachments, `stimulus` is an ordered list. Mix ordinary prose (`p`),
figures (including circuits), images, code, tables, math, and cards (`note`, `key`,
`def`, `trap`, `ex`). These use the same content fields as lesson blocks; they
always display in full, without lesson depth toggles or saved-block controls.
Use `passage` for a quoted source; use `p` for question instructions.

```yaml
type: Trace
concept: traversal
q: '<p>What value does this function return?</p>'
stimulus:
  - {t: p, h: 'Start with <code>n = 3</code>.'}
  - t: code
    lang: c
    src: |
      int twice(int n) {
        return n * 2;
      }
  - {t: note, label: Assumption, h: '<p>Assume integer arithmetic.</p>'}
  - {t: p, h: 'Trace the expression before answering.'}
response: {kind: number, value: 6}
```

The list displays before `q`, in authored order. Put text between or after
visuals with `p` entries; `q` is the final answer instruction. A single existing
stimulus mapping still works. Figures and code occupy full-width bands in the
question, with no nested card frame. Wide drawings retain their size and scroll
horizontally instead of shrinking their labels; attached cards use flat callouts.
Image paths must name bundled `assets/` files and include meaningful `alt` text.
