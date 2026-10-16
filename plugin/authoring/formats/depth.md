# Optional explanations and local notes

Teach the complete required lesson in its default reading path. Add no, one, or
several optional blocks as the passage warrants; there is no content quota.
Each block should offer worthwhile context or an extension that can be
skipped without losing a prerequisite, examinable idea, or reasoning step.
Place it directly beside the passage it extends. Review the assembled lesson to
check that the required path is complete and the optional material adds value
without repeating it.

## Follow-ups: `follows: true`

Use a follow-up when another block depends on the immediately preceding block.
It stays adjacent to its parent and is presented as an expansion of that
passage:

```yaml
- t: key
  h: <p>The mixed-partial condition is <m>M_y = N_x</m>.</p>

- t: note
  optional: true
  follows: true
  h: |-
    <p>If a potential exists, then
    <m>M_y = F_{xy} = F_{yx} = N_x</m>.</p>
```

Use `follows: true` only for a real dependency on the immediately preceding
block. It does not replace prose that connects separate parts of the required
reading.

## Asides: a note on one phrase

Where the explanation belongs to one step or symbol, mark the exact phrase with
`<n k="…">` and write the note in the same block's `asides:`. The note appears
beside its block and wraps below it on narrow screens:

```yaml
- t: key
  items:
    - >-
      Differentiate <m>F</m> in <m>y</m>, set it equal to <m>N</m>, and
      <n k="only-y">solve for <m>g'(y)</m></n>.
  asides:
    only-y: |-
      <p>Only <m>y</m> may survive here. <m>M_y = N_x</m> cancels the
      <m>x</m>-terms.</p>
```

The phrase carries no mark at rest; the card and phrase highlight each other on
hover or focus. Every anchor needs its aside and every aside its anchor, in the
same block. Anchors work in `h`, `core`, and `items`, not in questions. An aside
is local help; keep required reasoning in the reading path.
