## Judging a passage: what help, if any, is needed

Evaluate the passage against the reader's stated prerequisites and what has
already been taught. Look for unfamiliar notation, omitted reasoning steps,
abstract claims without a concrete referent, or multiple interacting choices.
These are prompts to inspect comprehension, not a complexity score that
requires more content. A difficult passage may already explain itself well.

- **Unfamiliar word, symbol, sentence or step:** attach an aside to that text.
- **Missing rationale or optional elaboration:** put a depth follow-up at the
  point where the question arises, using prose, a diagram, or another suitable
  block type.
- **A reader cannot apply the idea or distinguish cases:** provide a worked
  example showing the relevant decisions. Examples can explain concepts as
  well as procedures. Use `spine` when needed for the learning objective,
  `depth` for optional explanation, and `apply` for further practice instances.

Use none, one, or several of these when each addresses a distinct gap. Do not
assume that an aside replaces an example or that a complex topic always needs
one. Add further examples when they expose a new decision or useful contrast;
do not withhold them to meet a quota. For a textbook excerpt, preserve the
quoted wording and attach explanations to the particular phrases that need
clarification, with worked examples or diagrams nearby when useful.

## Follow-ups: `follows: true`

Attaches a block to the nearest non-follow-up above it, without nesting:

```yaml
- t: def
  term: Exact equation
  source: Edwards & Penney §1.6
  h: |-
    <p>…exact when <m>M_y = N_x</m>…</p>

- t: note                  # the why, attached to the def
  tier: depth
  follows: true
  label: The mixed-partials argument
  source: Edwards & Penney §1.6 (Theorem 1)
  h: |-
    <p>If a potential exists, <m>M_y = F_{xy} = F_{yx} = N_x</m>…</p>
```

Place a follow-up directly after its parent. When its tier is collapsed,
a subtle **In depth** rail tab opens and closes the full content in Study or
Review, including examples, figures and all other block types. Labels belong
to the expanded content; the tab needs no description.

The build checks that a follow-up has a preceding parent, that a spine block
does not depend on a collapsible parent, and that a follow-up of a non-spine
parent shares that parent's tier. Use `follows: true` for a real dependency.

**Depth belongs where the question arises.** Insert it throughout a subsection
beside the material it explains, rather than collecting explanations at the
end. Keep essential or examinable material in the spine.

## Asides: a note on one phrase

Where the why belongs to one step or symbol, mark the phrase `<n k="…">` and
write the note in the same block's `asides:`. Wrap the exact phrase, sentence,
or step that needs clarification. The note appears beside that block, wrapping
below it on narrow screens. This uses the existing markup; no line-number
metadata is needed, and the reference survives changes in screen width.

```yaml
- t: key
  label: Building the potential
  source: Edwards & Penney §1.6
  ordered: true
  items:
    - >-
      Differentiate <m>F</m> in <m>y</m>, set it equal to <m>N</m>, and
      <n k="only-y">solve for <m>g'(y)</m></n>.
  asides:
    only-y: |-
      <p>Only <m>y</m> may survive here. <m>M_y = N_x</m> is exactly what
      cancels the <m>x</m>-terms.</p>
```

Keep notes focused. The build offers layout advice past 320 characters, not
a length limit; retain a longer note when appropriate or use a depth follow-up
when it needs its own figures or worked steps. Every anchor needs its aside and every aside its anchor, in
the same block; anchors work in `h`, `core` and `items`, not in questions.

**The phrase carries no mark at rest.** A reader who does not need the note sees
an ordinary sentence; hovering the card in the margin lights the phrase it is
about, and hovering the phrase lights the card. So an anchor costs the prose
nothing, and there is no reason to ration them within a block beyond keeping
each one about one thing.

The card is in the margin in **every** reading mode. Where a closed depth has
shut the block the phrase lives in, the card says so and offers the way to it.
**The block must still read correctly with every aside ignored** — an aside is
help with a passage, never a step of the argument, and nothing examinable goes
in one [M25].

