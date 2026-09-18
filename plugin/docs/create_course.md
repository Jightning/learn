# Creating a course

Fill in `courses/<id>/` so the site renders a complete study course. **You write
data only.** Rules in brackets — [M1], [T3] — cite the evidence in
[`material_truth.md`](material_truth.md) and [`code_truth.md`](code_truth.md):
follow them; read the entry only if one seems wrong.

```sh
npm run new -- <id> "Course Title"   # scaffold courses/<id>/
npm run check                        # build + validate + browser tests
npm run audit                        # sourcing, verification, routing, drills
npm run shots                        # render every page to .shots/
```

---

## 0. Operating rules

**0.1 A finished course.** A reader holding the §1 prerequisites, having read
the spine and cleared the drills, can (a) state every idea, (b) apply it to an
unseen problem, (c) say why each rule holds and where it stops, (d) construct
something the course never showed them. (d) separates a course from a reference
and is the one that gets dropped.

**0.2 Three rules.**

| Rule | | Source |
|---|---|---|
| **Non-redundancy** | Every piece of *explanation* appears exactly once. | [M1] |
| **Closure** | Nothing is used that is not a declared prerequisite or defined earlier. | [M2] |
| **Derivability** | Every rule is reached, not asserted. | §6.2, §6.3 |

References are how the first two coexist. Non-redundancy governs explanation,
not practice — a second application is not a second copy.

**0.3** Follow §3 in order: depth is a function of the reader, so anything
written before the calibration is calibrated to nobody.

**0.4** Every rule here has a yes/no test. Weighing a judgement means you missed
one; where a real judgement remains, §1 breaks the tie.

**0.5 Do not guess.** Unknown order, format or truth → `unverified` (a human
should look it up), `generated` (a model wrote it, unchecked), or an empty field
with a note. A flagged gap is a task; a guess is a defect nobody finds.
[M20, M21, M28, M30]

**0.6** Where this file gives a count, hit it; a range, land inside it.

**0.7** Run §12 before you emit.

**0.8** Your default voice is wrong for this: balanced, hedged, encyclopedic
prose covering a topic. §14 lists the shapes that produces; `writing.md` is the
sentence itself. Read both before your first `p` block.

---

## 1. The reader

Data, filled in for the person the course is for. The filled-in copy is
`courses/_reader.yaml` (gitignored, personal); this is the blank form. A course
written against `UNSET` is calibrated to nobody (0.5).

```yaml
reader:
  goal: UNSET            # "mastery" (default), or "exam: <what, when>" (§1.2)
  background: UNSET      # THE PREREQUISITE SET, enumerated, with how firmly
                         # each is held. Anything off it is taught in full (0.2)
  failures: UNSET        # which modes below actually go wrong for them
  not_failures: UNSET    # the rest, named: §1.1 reads absence as a switch
  onboarding: UNSET      # concrete anchor first, or formal statement first
  priorities: UNSET      # ranked; breaks ties no rule settles
  session_length: UNSET  # ask before assuming (0.5)
  audience: UNSET        # "this reader" or "median student in the class"
```

`failures` and `not_failures` partition these five: **transfer** (novel
problems), **execution** (slips inside a known procedure), **detail retention**
(forgetting a value), **schema acquisition** (never understood it),
**discrimination** (picking the wrong concept).

**`background` is a boundary, not a description.** "Comfortable with maths" is
not a prerequisite set; "single-variable derivatives and integrals; no linear
algebra" is. Experts misjudge which steps a novice holds, so check the list, not
your sense of what is obvious.

### 1.1 What the profile changes

Seven defaults. Where a switch is off, the entry inverts rather than disappears.

| | Switched on by | Default | Because |
|---|---|---|---|
| **D1** | schema acquisition **not** a failure | `apply` stays lean: one or two instances per concept | Worked-example support reverses with expertise [material_truth Trade-offs]. Off: more worked instances |
| **D2** | discrimination **not** a failure | `confusable_with` only where the confusion is real | Interleaving pays on confusable pairs, costs on unrelated ones [T16]. Off: declare and interleave every pair they mix up |
| **D3** | `onboarding` asks for a concrete anchor | Open concrete, then fade it | Concrete-first-and-stay-concrete is the worst sequence tested [M10]. Off: formal statement opens |
| **D4** | transfer is a failure | `attempt` blocks ON for conceptual subsections | Problem solving before instruction beats the reverse on transfer, d = 0.36 [material_truth] |
| **D5** | transfer is a failure | `why_prompt` on every quiz item | Prompted self-explanation returns g = 0.55 [M6, T32] |
| **D6** | execution is a failure | Every procedural subsection: an execution trap **and** an error-spotting item | Slips are a detection problem, not a comprehension one |
| **D7** | detail retention is a failure | Every specific value gets a drill item | Detail loss is a retention failure at item grain [M33] |

D4 decides how a subsection opens, D5 what every question asks after it.

### 1.2 Goal and priorities

Mastery is the default. Four things change when `goal` names an exam.

| | `goal: mastery` | `goal: exam: …` |
|---|---|---|
| Section order | Dependency order | The institution's order [M15]; deviate only on a real dependency violation, and say why in the blurb |
| `exam.format` (§11.1) | Formats a mastered reader must be fluent in; include `derivation` | The formats the exam uses |
| `exam.dates` | Empty | The real dates, so the schedule aims at them [T17] |
| `review.basis` (§5.1) | What later sections depend on, plus what is error-prone | That, plus everything the exam can test |

`priorities` breaks ties. For a ranking with retention first and read speed
last: `drills/` is required; `expectations.md` must carry `exam.format` and
`review.basis`; ambiguous spine-vs-depth → `depth`; spare effort goes to the
drill bank, not a fourth explanatory paragraph.

---

## 2. What you produce

```
courses/<id>/
  course.yaml              identity, theme, state, retention, audit, highlighting
  concepts/<key>.yaml      one per recurring idea (M13; no cap)
  categories/<key>.yaml    one per declared category (M35; optional)
  drills/<key>.yaml        one per *reviewed* concept (M31)
  sections/01-<slug>/
    _section.yaml          title, blurb, primer prequestions
    1-<slug>.yaml          one subsection: blocks + quiz
  assets/                  images (inlined at build)
  materials/               study artefacts (§11)
  blocks.js                optional; almost never (§15)
```

**Numbering is positional**: folder `03-…` → `s3`; its second file → `s3-2`. You
never write ids. One subsection per file; `.yaml`, `.yml`, `.json` all work.

### 2.1 What you write determines what appears

Nothing on the right is maintained by hand [T20]. This is the whole feature
surface: a reader-facing behaviour you want is here.

| What you write | What the reader gets |
|---|---|
| A folder under `sections/` | A section in the rail and the contents list |
| A file inside it | A subsection with its own heading and quiz |
| `blocks:` entries | The content, one reading row each, filtered by tier |
| `tier: depth` / `tier: apply` | A collapsed stub with a count, expandable in place |
| `core:` on a block | Its claim at Notes depth, and the block's opening line at Full depth |
| `gist:` on a block | Its claim at Notes depth only; the prose stays whole |
| `cat:` on a block or concept | A chip, a row on that category's page, a facet in **Explore** |
| `tags:` | A facet in Explore and a chip linking everything sharing the tag |
| `categories/<key>.yaml` | A line in the **Kinds** band of the index, and a page at `#/<id>/cat/<key>` |
| `siblings:` | A "not to be confused with" strip on both pages |
| `id:` on a `table` | A numbered, citable "Table 3.1", reachable by `<f k="…"/>` |
| A `def` with `term:` | An entry in the "Before you start" panel |
| `<a href="#s4-2">§4.2</a>` | A margin card, a return pill, a "Builds on" chip, a map edge, a "used later in" card on §4.2 |
| `<c k="key">phrase</c>` | A margin card, a line in the **Ideas** band, a line in that concept's "appears in" list |
| `<a href="#/other-course/s6-1">…</a>` | A plain link into another course |
| `<f k="fig-id"/>` | A numbered, section-scoped figure citation |
| `<m>…</m>` | Inline maths |
| A `quiz:` entry | A click-to-reveal question, a type badge, a coverage slot |
| A `drills/<key>.yaml` item | A slot in `#/review`, criterion tracking, mixed practice |
| `primer:` in `_section.yaml` | A relation prequestion with forced correction |
| `why_prompt:` + the reader's confidence | The calibration report: the confident-and-wrong list |
| `confusable_with:` | A cluster in mixed practice at `#/<id>/practice` |
| `review: true` | The concept enters Loop B: criterion tracking, spaced relearning |
| Any `<a href="#s…">` or `<c k>` | An edge on the dependency map at `#/<id>/map` |
| Every block's text | An entry in the search index |
| `t: figure` | A rendered diagram, plot, chart, grid or timing trace (§10.1) |
| `retention.target` | How hard the schedule holds the course (§4) |
| `state.enabled: false` | A stateless reference: no quiz history, no review loop |
| `cap:` on a `figure`/`table`/`image` | The caption, and the only part read aloud (§2.2) |
| *(nothing — automatic)* | "Before you start", the primer, the note field, the three reading modes (§6.7), read-aloud, `#/<id>/review` and `#/review`, `problems.md`, `checklist.md`, import/export, sync |

### 2.2 The page can be read aloud

**Settings → Listen** speaks the rendered column from wherever the reader
has scrolled: lane, depth and anything opened are honoured, and only text on
screen is spoken.

| Spoken | Not spoken |
|---|---|
| headings, prose, `core:`, list items, a `def`'s term | the figure itself, table cells, code |
| figure, table and image **captions** | formulas |
| a quiz question, if Questions is set to Ask | a quiz **answer**, ever |

So: **a figure with no `cap:` is silence** — the caption must say what the figure
shows, not name it. And **a claim carried only by a formula is lost** — state the
result in words and let the equation carry the form.

---

## 3. The procedure

In order; do not start a phase until the previous stop condition holds.

**1 — Calibrate.** `materials/expectations.md`, front matter first (§11.1):
what is assumed known (the `background` list, verbatim), bridged, taught, and
skipped. *Stop: every topic in exactly one of skip / bridge / teach, and
`review.basis` recorded.*

**2 — Sequence.** `sections/NN-slug/` with `_section.yaml` titles and blurbs
only; 2–5 subsections each; the blurb answers "why here?". *Stop: no forward
reference survives [M14]; every section rests only on sections above it and on
`background`.*

**3 — Concepts.** `concepts/<key>.yaml` for every idea used in 3+ places (§5),
then mark the review set. *Stop: every idea you would re-explain in three
sections has a file, and the review set matches its declared basis.*

**3a — Taxonomy.** `categories/<key>.yaml` for the kinds this course sorts
material into (§5a) — before the spine, since a block can only tag into a
taxonomy that exists, and one derived afterwards fragments. *Stop: every
category has a boundary, siblings name each other, and you can say which blocks
join it. Skip the phase where the material has no such kinds; an empty taxonomy
is a correct answer and an invented one is not.*

**4 — Spine.** Spine blocks only, across every subsection (so no `tier:` at
all). Every `def`, `key` and `trap` declares `core:` or `gist:` (§6.6) and joins
a category where it has one. *Stop: the spine alone teaches the whole course;
reading only its `core:` lines gives a correct, terse account.*

**5 — Quizzes.** One item per distinct question type per subsection (§7), plus
the section's synthesis item (§7.1). *Stop: full type coverage, an
error-spotting item in every procedural subsection, and every item carries
`why_prompt`, a resolvable `concept:` and `verified:`.*

**6 — Drills.** `drills/<key>.yaml` for every reviewed concept: three items, two
formats, one exam-format match (§8). *Stop: every specific value in a reviewed
concept's `key` blocks has an item (D7, M33).*

**7 — Depth and apply.** Now add `tier: depth` and `tier: apply`. Last,
deliberately: written earlier, spine material gets absorbed into digressions.
Every `key` whose derivation did not fit the spine gets it here (§6.3).
*Stop: `npm run check` passes the spine-only render.*

**8 — Verify.** Re-derive every worked answer and drill solution; re-reading is
not verifying [M22]. Set `verified:` dates, run §12, `npm run check`,
`npm run audit`.

---

## 4. `course.yaml`

```yaml
code: CALC II                    # short identifier, unique across courses
title: Introduction to Differential Equations
tagline: >-                      # `>-`: an unquoted ": " in a bare scalar makes
  First-order equations, the     # YAML read the line as a mapping (writing.md §4a)
  methods that solve most of them.
meta: OpenStax Calculus Volume 2 # provenance line under the title

theme:
  hue: 200                       # optional: accent rotation, 0-359, unique
state:
  enabled: true                  # false = stateless reference, no review loop
retention:
  target: 0.9                    # optional: recall probability the schedule holds
audit:                           # optional: fail ceilings for `npm run audit`
  unsourced: 0.1                 # absent means 1, meaning report only
  unverified: 0
valueStyles:                     # optional: colour cell values in mono tables
  "1": b1                        # and in `grid` figures
styles: |                        # optional: CSS for the classes above
  .b1{color:var(--hi-ink);font-weight:700}
syntax:                          # optional: highlighting for `code` blocks
  comment: "//"
  keywords: [def, class, return]
  strings: true
  patterns:
    - {re: "\\b0x[0-9a-fA-F]+", cls: tok-n}
```

Only the first four fields are required. `theme.hue` rotates the accents with
lightness and chroma fixed, so contrast holds [T1, T3]; `npm run new` picks a
free angle. It is the course's colour, not the last word on it: a reader can
pick another under **Settings → Appearance**, per course and per device, and
that choice is never written back into the course. `code` keys learner state, so two courses sharing one share a
reader's history silently. `retention.target` defaults to 0.9; lower it where
the material is background rather than load-bearing. **`audit:` is a ratchet** —
lower a key as its pass lands and the course can never regress.

---

## 5. Concepts — `concepts/<key>.yaml`

```yaml
term: Initial-value problem
body: |-
  <p>A differential equation coupled with an initial value.</p>
src: Defined in §4.1
review: true                             # in the review set; owes a drill file
confusable_with: [general-solution]      # only where readers actually confuse them
```

One sentence: a concept card is met in the margin of somebody else's paragraph.
The filename is the key (`initial-value-problem.yaml` →
`<c k="initial-value-problem">`).

**Test:** would a reader who forgot this need it re-explained in three different
sections? Yes → concept. No → `def` [M13].

A mention wraps words the sentence already uses — `the
<c k="impedance">impedance</c> of the branch` — never a bare term dropped in for
the link. **Never write "recall from §3 that…" followed by a restatement**: the
link renders a margin card, feeds the prerequisite list and draws a dependency
edge [M16].

### 5.1 Promotion and review are two decisions

| Decision | Rule | Cost | Cap |
|---|---|---|---|
| Promote to a concept | used in 3+ places [M13] | one file, one link | none |
| Mark `review: true` | declared, not inferred [M31] | three drill items [M26] | your judgement |

Promotion is forced by non-redundancy; review is a scope choice. Choose the
review set from `review.basis` (§1.2) and record that basis in
`expectations.md`. The build enforces both halves: `review: true` with no drill
file fails, a drill file for an unmarked concept warns, a non-empty review set
with no basis fails, and `confusable_with` must be declared both ways (D2).

---

## 5a. Categories — `categories/<key>.yaml`

A category answers *what kind of thing is this, and what is it not* — the
grouping a reader still has after forgetting where they read something. Concepts
and categories share the **index** at `#/<id>/index`: ideas in the first band,
kinds in the second.

| | An idea (`concepts/`) | A kind (`categories/`) |
|---|---|---|
| answers | *what is this?* | *what is this one of?* |
| cardinality | one entry, many mentions | one set, many members |
| carries | a `body:` that explains | a `boundary:` that excludes |
| earns its place by | being re-explained in 3+ sections (M13) | having members worth listing together |
| a thing can have | as many mentions as the prose needs | exactly one `cat:`, any number of `tags:` |

Something can be both: a concept with a `cat:` appears in Ideas and on that
category's page.

```yaml
name: Precipitation reactions
short: PPT                   # 2-3 chars, optional
boundary: |-
  Reactions in which dissolved substances react to form one (or more) solid
  products. Not acid-base reactions, in which a hydrogen ion is transferred,
  and not redox, in which an oxidation number changes.
siblings: [acid-base-reactions, redox-reactions]   # must name each other
note: |-                     # optional; HTML, rendered above the members
  <p>One of the three categories OpenStax Chemistry 2e §4.2 sorts reactions into.</p>
```

The boundary is this category's definition then each sibling's, in the source's
own words — the sentence a reader is actually learning. It is required: without
it a category file is a label with a page.

Membership is declared on the thing:

```yaml
- t: table
  id: solubility-rules
  cap: Which ionic compounds dissolve, and which come out as a solid
  cat: precipitation-reactions  # the principal kind: one, and it must be declared
  tags: [solubility, aqueous]   # secondary, plural, slugs
```

**A label is not a category.** `label:` names one block; `cat:` names a set,
course-wide. A category that would only ever have one member is a label.
**`cat:` versus `tags:`**: the category is the single kind a thing most is, and
gets a page, a boundary and siblings; tags are other shelves it could sit on and
get a facet in Explore.

- Every `cat:` must name a `categories/` file; a category is declared, never
  inferred (M35).
- Every category needs at least one member, and `siblings:` must name each other.
- Tags are slugs: lowercase, digits, single hyphens.
- Categories go on **blocks and concepts only**. A drill inherits its concept's;
  a quiz item has none, because `type` is its identity (M9).
- Do not categorise everything: a chip on every block signals nothing (T13).

---

## 6. Sections and subsections

```yaml
# _section.yaml
title: Separable Equations
blurb: >-
  Two or three sentences: what this section is for, and why it comes here.
primer:                          # §9
  - ask: …
    answer: …
    why: |-
      <p>…</p>
```

```yaml
# N-<slug>.yaml
title: Separable equations
blocks:
  - t: p
    h: |-
      Prose. Write HTML directly; inside a literal block nothing is escaped.
quiz:
  - type: Solve a separable equation
    q: |-
      …                           # §7 has the whole shape
```

Both accept `id:`/`num:` overrides. Do not write them: positional numbering is
what keeps ids stable.

### 6.1 Block types

| `t:` | Use for | Key fields |
|---|---|---|
| `p` | Ordinary prose | `h` |
| `def` | A term being defined | `term`, `h`, `items` |
| `key` | A rule to remember, or a procedure | `h`, `items`, `ordered` |
| `trap` | The mistake people actually make | `h`, `items` |
| `ex` | A worked example, usually `<ol>` steps | `title`, `h` |
| `note` | A non-examinable digression (always `depth`) | `h`, `items` |
| `list` | A bare list | `items`, `ordered` |
| `table` | Any table | `cap`, `head`, `rows`, `split`, `mono`, `map` |
| `code` | Source listings, highlighted per `syntax` | `lang`, `src` |
| `math` | A standalone equation | `tex`, `label`, `note` |
| `figure` | Anything describable as data (§10.1) | `kind`, `cap`, `spec`, `id` |
| `image` | A photograph, scan or supplied diagram | `src`, `alt`, `cap`, `credit`, `width`, `id` |
| `attempt` | A problem the reader cannot yet solve, **first block only** | `h`, `label` |

Every block also takes `tier:`, `label:`, `cat:`, `tags:`, `notes:` (§6.6),
`follows:` and `asides:` (§6.3). `def`, `key` and `trap` take `source:` and one
of `core:`/`gist:` (§6.6). `table` and `image` take `id:`, which numbers and
cites them exactly as a `figure`.

**Steps go in `items:`, never in a sentence.** `def`, `key`, `trap` and `note`
take `items:` as a `list` does; `ordered: true` numbers them; `h:` renders above
as the lead-in. The build fails "(1) … (2) …" run into a paragraph.

```yaml
- t: key
  label: Building the potential
  source: Edwards & Penney §1.6
  ordered: true
  items:
    - >-
      Confirm <m>M_y = N_x</m>.
    - >-
      Set <m>F = \int M\,dx</m> with <m>y</m> held constant, plus an unknown <m>g(y)</m>.
    - >-
      Differentiate in <m>y</m>, set it equal to <m>N</m>, and solve for <m>g'(y)</m>.
```

Write items as `>-` scalars: TeX backslashes survive and an unquoted `": "`
cannot turn the item into a mapping. Commentary *about* the steps is a follow-up
(§6.3), not a tail on the same block.

On `table`: `mono: true` gives fixed-width centred cells and applies
`valueStyles`; `map:` does the same with an inline `{value: css-class}`;
`split: N` rules off after column N.

**A `label:` names the block; it does not explain it** — a word or a short
phrase ("Common slip", "The cut property"). A label that is a sentence belongs in
`h` or `core:`. **An `ex` block's `title:` names what is worked**, not how you
worked it: "Overflow in a 4-bit sum", never "step by step" or "revisited".

**Two fields default**: `tier:` to `spine` (an absent tier *is* the declaration
[M23]) and `label:` to the callout's own name. Write either only to override it.

**Never write the interface's own words.** A callout prints its label, a figure
its number, a collapsed tier its count, an `attempt` its box and buttons.
Repeating any of it is redundancy no gate catches. Check §2.1 before telling a
reader what to do on the page.

**`source:` belongs on every `def`, `key` and `trap`** — the three that carry
conclusions a reader cannot catch by reading around them, and the population
`npm run audit` measures. Three legal shapes: a real origin (`"Griffiths §2.3"`,
counts as verified), `unverified`, or `generated` (you wrote it unsourced [M30]).
An absent `source:` counts against the fraction like an ungrounded one.

**Use `def` for every term you name.** It is the only block feeding the
pre-training panel [M8, T14], and it is how closure is checked: a term with no
`def` and no line in `background` is assumed knowledge.

### 6.2 Order inside a subsection

```
<opener>   exactly one, first block only — or none
def        the abstract statement, retiring the opener explicitly
key        the rule that makes it usable, and where it comes from
ex         one worked example, fully stepped
figure     the artefact that makes it concrete
trap       what goes wrong, named as a specific slip
```

Definition before example before exception; never lead with a qualification
[M10].

**One block may precede the `def`**: a concrete anchor (`p`, the D3 default) *or*
an `attempt` (D4), never both. Second person, one concrete act, the general term
arriving only after an instance of it.

**The `def` states the term and nothing else** — it has to read cold in week six
and in a margin card far from here. No numbers borrowed from the anchor, no "as
we saw above".

**The block after it retires the opener**: one or two sentences generalising the
anchor, or saying what the `attempt` was reaching for. An unretired anchor leaves
the reader holding an instance where they need a schema. **The anchor also names
where it breaks**: "this stops being a good picture once X."

**Every `key` rule is derived, not announced** (0.2), in order of preference:
(1) one or two sentences inside the `key`; (2) the `ex` that follows walks the
general case before the numeric one; (3) a `depth` block with `follows: true`
directly under it (§6.3).

The exception is a rule that is *given* — an axiom, convention, defined unit,
measured constant, institutional fact. Say so in the block, because a reader who
tries to derive a convention concludes they missed something.

### 6.3 Tiers

| `tier:` | Holds | Test |
|---|---|---|
| `spine` | Definition, rule, mechanism, one canonical instance | Removing it breaks the argument |
| `depth` | Derivations, proofs, edge cases, caveats, rationale | It answers "why" or "what if", not "what" |
| `apply` | Instance two, three | It teaches nothing new; it builds fluency |

- **The spine alone is the whole course** [M23, T33]. Depth may point at the
  spine; the spine may never need depth. The build fails a spine block citing a
  figure only a collapsed tier declares.
- **Nothing examinable is `depth`** [M25]: the test is examinability, not length.
- **An `apply` block never re-explains** [M24]; the fix is a link.
- Budget: one or two `apply` blocks per concept across the course (D1).

**Every `def` and `key` owes the reader its why.** If the block cannot say why in
a sentence of its own, write it as a `depth` follow-up. A subsection whose depth
blocks are all caveats and no reasons has skipped this pass.

#### Follow-ups: `follows: true`

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

On the page a follow-up hangs off its parent, and when its tier is hidden it
becomes a stub naming it — "In depth: The mixed-partials argument". So **place a
follow-up directly after its parent** and label a `depth` follow-up with what the
argument *is*. The build holds three rules: a follow-up needs a block above it; a
spine block may not follow a collapsible tier; a follow-up shares its parent's
tier. Use it for a real dependency, not for the next idea along.

#### Asides: a note on one phrase

Where the why belongs to one step or symbol, mark the phrase `<n k="…">` and
write the note in the same block's `asides:`. The phrase is underlined and the
note is a margin card.

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

One or two sentences; the build warns past 320 characters, where it is a `depth`
follow-up instead. Every anchor needs its aside and every aside its anchor, in
the same block; anchors work in `h`, `core` and `items`, not in questions. The
card shows only at Study depth, so **the block must read correctly with every
aside ignored** — nothing examinable goes in one [M25].

### 6.4 Traps

**One or two per subsection**; a procedural subsection needs at least one
*execution* trap (D6). Five traps is zero traps: signalling degrades with
density [T13].

| Kind | Names | Shape |
|---|---|---|
| Conceptual | A wrong belief | "People read the leading 1 of `1010` as a minus sign, giving −2. The leading bit is a *weight*, −8, so `1010` is −6." |
| Execution | A slip in a known procedure | "The carry *into* the sign bit and the carry *out of* it are different bits. Reading the wrong one flips your overflow answer." |

An execution trap names the keystroke-level error: which sign, index, unit,
order. "Be careful with signs" is a mood, not a trap.

### 6.5 The deliberate mistake goes in the quiz

**There is no `err` block.** An erroneous example only works if the reader is
asked to detect, explain and correct it, and the quiz already has a reveal gate,
a `why`, a `why_prompt` and a badge. Route it through an error-spotting item in
the subsection that taught the procedure, plus an execution trap naming the slip:

```yaml
- type: Spot the error
  concept: separable-equation
  q: |-
    <p>A student solves <m>y' = y(1-y)</m> by separating and integrating, and
    reports the family as the general solution. Which solutions has the method
    dropped, and at which step should they have been caught?</p>
  a: <m>y = 0</m> and <m>y = 1</m>. At step 1, before dividing.
  why: |-
    <p>Dividing by <m>g(y)</m> is what makes separation work and what discards
    the roots of <m>g</m>, which is why the check comes before the division.</p>
  why_prompt: What does dividing by <m>g(y)</m> assume about <m>g(y)</m>?
  verified: 2026-09-13
```

One such item per procedural subsection: a desirable difficulty, and those work
in small numbers.

### 6.6 The claim: `core:` and `gist:`

Every `def`, `key` and `trap` declares one, never both; the field name *is* the
declaration.

**`core:` is the block's own opening claim**, lifted out rather than paraphrased.
`h:` then holds **only what develops it**, never the claim again: at Full depth
the claim renders as the block's opening paragraph and `h:` as the next one, so
the sentence exists once and nothing can drift. The build fails a `core:` that
reopens its own `h:`.

```yaml
- t: def
  term: Separable differential equation
  source: OpenStax Calculus Volume 2 §4.3
  core: |-
    Any equation that can be written in the form <m>y' = f(x)g(y)</m>.
  h: |-
    <p>The form is the whole of the method's availability: with the variables
    apart, each side integrates against its own. Step 4 of the strategy is where
    that stops — <m>y</m> is not always obtainable explicitly.</p>
```

**Write it so it stands alone**: a reader meets it cold in week six. No "the
following", no "as above", no forward reference to the example underneath. Hoist
the term to the front — *"A combination is a list of expressions inside
parentheses"*, not "Expressions formed by … are called combinations" — and leave
the original machinery to `h:`. **A `core:` may itself be a list** where the
claim is several parallel facts; flattening them to fit a field deforms the
content.

**A claim on a structure block does not close it.** A `list`, `table`, `code`,
`math`, `figure` or `image` is `holds: structure`, so its `core:` renders *above*
the structure at every depth. You cannot hide a table behind a sentence about it.

**`gist:` is a summary *about* the block**, for prose that must not lead with its
claim — nearly always a `trap`, whose mechanism is letting the reader believe the
wrong thing for a sentence. `h:` is untouched and the gist shows only when the
block is closed.

```yaml
- t: trap
  label: The leading bit is a weight
  gist: In two's complement the leading bit is worth −8, not a sign flag.
  h: |-
    <p>People read the leading 1 of <code>1010</code> as a minus sign and the
    rest as a magnitude, giving −2. The leading bit is a <i>weight</i>, −8.</p>
```

**`gist:` is a second copy and is counted**: `npm run audit` reports the fraction
against `audit.repeat`. Reach for `core:` unless the order is doing pedagogical
work.

**What the other kinds show when closed** (nothing to write): `figure` and `math`
render in full; `table` and `image` show their `cap:`; `ex` its `title:`; `note`,
`code` and `list` a one-line stub from `label:`; **a `p` block is not shown at
all**, because it carries no claim — a `p` that asserts something wants to be a
`key` (M36).

**`notes:` overrides per block** — `open | lead | caption | closed | hidden`:

```yaml
- t: table
  notes: open        # a compare-and-contrast matrix is already the compact form
  cap: The two controls, and what each one does to a block
```

Use `closed` where a claim is real but not worth a scanning line, and `hidden`
almost never: it is the one value that removes a block with no sign it was there.

### 6.7 The two depths

Blocks are read at three settings, and one set of sentences has to work at all
three.

| Mode | Shows | For |
|---|---|---|
| **Study** | every block, every word (`core:` + `h:`) | the first pass |
| **Review** | claims and structure, development closed (`core:`) | the week before an exam |
| **Names** | spine blocks, names only (`label:`) | lookup |

**At Notes depth a reader must never open a block to find out what it says.**
Opening is for *more* detail, not the *first* detail; a row showing only its label
has told them nothing, and `npm run audit` counts those as `nameonly`. The test
for a claim: does it give the *content*, or only a *count* or *topic*? "Criterion
met in four sessions across three days" is content; "Four places a course can
take you" is a count, and closing the list behind it hands the reader a title.
Three fixes, in order: write a `core:` (works on any block), set `notes: open`
for the judgement calls, or accept the label only where it genuinely is the whole
content. `npm run check` warns about a list buried in a prose block's `h:` — move
it into `items:`, which the engine can see. A worked example is exempt: its
`<ol>` is the working [M11].

**Write claims telegraphically**: drop what the reader can supply, keep the
assertion, target one line.

| Instead of | Write |
|---|---|
| "It is worth noting that a course you install exists only in this browser." | "Nothing is uploaded: a course lives in this browser and nowhere else." |
| "This example walks through what happens when you answer one question confidently and get it wrong." | "One confident miss records a failed type, enrols the concept, and drills it." |
| "Some notes about the other layouts a graph block will accept." | "A graph also takes `row` and `manual`; layered is the default past five nodes." |

A `label:` shows as a run-in with the claim after it — "▌ Common slip. Dividing
by g(y) discards every constant solution where g(y) = 0." — so write the label as
the takeaway and the `core:` as the rule, or write only the claim.

**Full depth is where the first read happens**, and prose optimised only for
compression becomes a deck of assertions. Each sentence survives two readings:
the `core:` alone (complete, grammatical, no "as above"), then `core:` then `h:`
in order, the second continuing without restating the first. `h:` starts a new
paragraph, so it cannot finish a sentence `core:` started: write "The method
works because…", not "…which is why the method works". **Transitions are `p`
blocks** — a `def` ending "now we turn to the second method" strands a signpost
inside a definition.

**Read the subsection at both depths before calling it done.** Study catches what
Notes cannot: a claim that reads as a stub, two blocks colliding with no
transition, an `h:` that only makes sense after the label. It is also the spoken
reading (§2.2).

## 7. Questions

**One question per distinct question type. Never repeat a type** [M5]. The target
is coverage of the question *surface*; volume belongs in the drill bank. Ask what
can be asked about this subsection: apply forwards, apply backwards, identify the
case, compute, **spot the error** (required for procedural subsections, D6),
explain why the rule holds, judge a boundary case.

```yaml
- type: Recognise a separable equation    # names a skill, never a number
  concept: separable-equation             # the retention identity
  q: Is <m>y' = x + y</m> separable? Say why or why not.
  a: No                                   # the bare answer, no reasoning
  why: |-
    <p>Separable means writable as <m>y' = f(x)g(y)</m>, a product. A sum does
    not factor into one…</p>
  why_prompt: What would <m>f</m> and <m>g</m> have to be for a sum to factor?
  verified: 2026-09-08
```

Every field is required [M6]:

- **`type`** is the identity used for coverage [M9]: a skill name, not a number.
- **`concept:`** is the identity used for retention — what lets a confident miss
  pull the concept into review [T18]. Inferred where the subsection cites exactly
  one concept with a drill file; declare it wherever there is a choice. One
  naming no concept file fails the build; one resolving to nothing is counted as
  `unrouted`.
- **`why_prompt:`** is the specific question the reader answers before the
  reveal, on every item (D5). It turns retrieval into elaborated retrieval.
- **`why`** explains the reasoning **and why the wrong path is tempting** [M7].
- **`verified:`** is the date you last **re-derived** the answer [M22].

### 7.1 The synthesis item

Coverage proves the reader can answer, not that they can *construct* — goal
0.1(d). **One per section**, in its last subsection, where the material
**composes**: two rules bearing on one situation, or a rule with a domain a
reader could probe. A section teaching one procedure with one correct output has
nothing to compose; exempting it is a judgement, so name the exemption in the
section blurb.

```yaml
- type: Synthesis
  concept: separable-equation
  q: |-
    <p>Two's complement has exactly one zero, and one negative value with no
    positive counterpart. Both follow from the same asymmetry. Describe a
    fixed-width signed encoding that removes the second anomaly, and say what it
    costs.</p>
  a: |-
    <p>A good answer names the asymmetry (2ⁿ patterns cannot split evenly around
    a single zero), proposes one coherent alternative, and prices it.</p>
  why: |-
    <p>There is no single right answer. What is tested is whether the reader sees
    the encoding as a set of trade-offs rather than a rule…</p>
  why_prompt: How many patterns does n bits give, and how many values must a
    symmetric signed range contain?
  verified: 2026-09-08
```

`a` states **the criteria a good answer meets**, not an answer.

---

## 8. The drill bank — `drills/<concept-key>.yaml`

One file per reviewed concept. The quiz covers the surface once per type; the
bank runs the same procedure until it is fast, and it is the pool `#/review`
draws from. Loop A is the quiz, keyed by `type`; Loop B is the bank, keyed by
concept. A confident miss in A recruits B; a B success never marks a type covered
[code_truth §3b].

```yaml
concept: separable-equation       # must match a concepts/<key>.yaml
items:
  - format: short-answer          # multiple-choice | short-answer | cued-recall
                                  # | derivation | numeric
    stem: Solve <m>y' = y(1-y)</m>, giving every solution.
    answer: The logistic family, plus the constants <m>y = 0</m> and <m>y = 1</m>
    steps:
      - "g(y) = y(1-y) is zero at y = 0 and y = 1, so both are constant solutions."
      - "Away from those, separate and integrate."
    why: |-
      <p>Reporting only the family is the tempting wrong answer: the solutions it
      drops are the ones the division removed.</p>
    verified: 2026-09-13
```

The build checks **three** items minimum (three different items is what stops
memorising one), **two** formats with **one** matching `exam.format`, no shared
answers, no stem containing its answer, and `steps` on every item [M11, M26]. A
higher criterion is not better [T31]: three items, then spend the rest on §8.2.

### 8.1 Surface variation, fixed answer

At least one item per reviewed concept has a surface **unlike** the worked
example [M32] — but **vary the surface, hold the response**. Wrong: the example
computes a delay in nanoseconds and the drill asks for a qualitative comparison.
Right: the example computes a delay through a 3-gate chain, the drill through a
mixed chain given a datasheet.

### 8.2 Every specific value gets an item

Scan every `key` block: a constant, threshold, sign convention, ordering,
boundary or named condition belonging to a reviewed concept needs a
`cued-recall` item [M33, D7].

```yaml
  - format: cued-recall
    stem: In n-bit two's complement, what is the most negative representable value?
    answer: −2^(n−1)
    steps: ["The range is asymmetric: one more negative value than positive."]
```

The test: could the reader lose a mark by forgetting this exact thing while
understanding everything around it?

---

## 9. The primer's prequestions

`_section.yaml` may end with one or two questions about a **relation** the
section is about to establish, not a term — the primer's own run covers terms
[M29].

```yaml
primer:
  - ask: Separating <m>y' = f(x)g(y)</m> puts a <m>dy</m> under <m>g(y)</m>.
      What has that step assumed about <m>g(y)</m>?
    answer: That it is not zero
    why: |-
      <p>Which is why the constant solutions have to be collected before the
      division, not recovered after it.</p>
```

The correction is enforced: an uncorrected pretest error is *more* likely to be
repeated later. Ask only about what you want retained; the benefit does not
generalise to the rest of the section.

---

## 10. Figures, maths, images, colour, cross-course links

### 10.1 Figures

`{t: figure, kind, cap, id, spec}`. Nine kinds, with their `spec` fields in full.

| `kind` | For | `spec` |
|---|---|---|
| `graph` | State machines, block diagrams | `nodes:[{id, label, x, y, note, title, accent, state, here}]`, `edges:[{from, to, label, curve, self}]`, `layout: circle \| row \| layered \| manual`, `r`, `w`, `h` |
| `plot` | Functions or measured series | `series:[{label, fn \| points, from, to, dash, samples}]`, `xlabel`, `ylabel`, `xrange`, `yrange`, `ticks`, `legend`, `xfmt`, `yfmt`, `w`, `h` |
| `flow` | Processes and pipelines | `steps:[{label, note}]`, `dir: row \| col` |
| `grid` | Labelled 2-D grids with highlighted groups | `rowVars`, `colVars`, `rowLabels`, `colLabels`, `cells`, `index: binary`, `groups:[{label, cells:[[r,c],…]}]` |
| `timing` | Digital waveforms | `signals:[{name, wave:"0101"}]`, `unit` |
| `bar` | Magnitudes across labelled categories | `bars:[{label, value, accent}]`, `xlabel`, `ylabel`, `max`, `baseline`, `ticks`, `valueFmt`, `w`, `h` |
| `scatter` | How two measured quantities relate | `series:[{label, points}]`, `trend: true`, `xlabel`, `ylabel`, `xrange`, `yrange`, `ticks`, `xfmt`, `yfmt`, `w`, `h` |
| `matrix` | Bracketed matrices | `rows`, `label` |
| `svg` | Anything the others cannot express | `body`, `viewBox` |

`grid` cells take the course's `valueStyles`; `groups` draw in three rotating
colours. A `plot` series' `fn` is JavaScript in `x`, compiled and sampled by
`validate.mjs`, so one that will not parse or has no finite value fails the build.

**A `spec` may only contain keys the engine reads** (`src/figures/schema.js`);
anything else fails the build, because a renderer silently ignores what it does
not know. Two ways in, both of which have shipped:

1. **Quote any value containing a comma.** In a flow mapping a comma ends the
   *pair*: `{label: resolve, note: path, credential, query}` is four keys. Write
   `{label: resolve, note: "path, credential, query"}`. The commonest defect.
2. **`dir` and `layout` take the values in the table and nothing else.**

**A `valueFmt`, `xfmt` or `yfmt` is a template string**, not a function; `{}`
stands for the formatted value, and a format with no `{}` fails the build.

```yaml
- t: figure
  kind: bar
  cap: Recall after a week
  spec:
    valueFmt: "{}%"          # 40 → "40%";  "{} ms" → "40 ms"
    bars:
      - {label: restudy, value: 40}
```

**A figure must carry information the prose does not** [M17]. Use `note` on graph
nodes only where there are few; past about eight prefer `title`. Cite with `id:`
and `<f k="that-id"/>`; numbering is automatic and section-scoped.

### 10.2 Maths

Write TeX, not HTML; it is checked at build time [T30].

```yaml
- t: math
  label: The characteristic equation
  tex: ar^2 + br + c = 0
  note: The solution form depends only on the discriminant.
```

1. **Never put TeX in a double-quoted YAML scalar** — `"\alpha"` is a YAML
   escape. Use `|-` or single quotes (a literal `'` inside is written `''`).
2. **No `<m>` in a table with `mono:` or `map:`**: those cells are escaped.
3. **Words inside maths go in `\text{...}`**, or stay outside the `<m>`.

Use `math` when the equation *is* the paragraph's point; inline `<m>` when it is
mentioned in passing.

### 10.3 Images

```yaml
- t: image
  src: assets/slope-field.png
  alt: Slope field for y' = y(1-y) with three solution curves drawn through it
  cap: Solution curves are the curves the slope field is tangent to everywhere
  credit: Redrawn from OpenStax Calculus Volume 2 §4.2
  width: 460
```

Embedded at build. PNG, JPEG, GIF, WebP, SVG; the build fails on a missing path
or a total over 8MB. **`alt` is required** [M19]; prefer a `figure` wherever the
content can be described as data [M18].

### 10.4 Colour

Ink variants (`--hi-ink` `--lo-ink` `--dc-ink` `--hz-ink`) for text, vivid
accents (`--hi` `--lo` `--dc` `--hz`) for borders, fills and graphics [T3].
`npm run contrast` fails below AA in three colour modes. **Colour never carries
meaning alone** [T26].

### 10.5 Linking to another course

```yaml
h: |-
  The theory is <a href="#/other-course/s6-1">first-order transients</a> in the
  lecture course.
```

Non-redundancy applies across courses. The target is a full route, resolved
against every course on disk; it renders as a plain link.

---

## 11. `materials/`

The site holds all *explanatory* content; `materials/` holds artefacts different
in **kind**, each linking in by anchor rather than restating.

| File | Holds | Status |
|---|---|---|
| `expectations.md` | Calibration, prerequisites, exam format and dates, review basis | **required** (M3) |
| `syllabus.md` | Official topic sequence, textbook, prerequisites | optional; high value |
| `schedule.md` | Week-by-week, deep-linked to section anchors | optional |
| `reference.md` | Formula card: symbols only, no prose | optional; high value |
| `problems.md` | Drill problems | **generated** |
| `checklist.md` | "Can I do this?" self-audit | **generated** |

`npm run materials` writes the generated two; editing them by hand fails the
build [T20, T21].

### 11.1 `expectations.md` front matter

```yaml
---
exam:
  format: [short-answer, derivation]
  dates: []      # empty under goal: mastery; real dates under an exam overlay
review:
  basis: >-
    Everything later sections depend on, plus the sign conventions, which are
    error-prone under time pressure.
---
```

`format` drives the drill-format check and is required under either goal.
`dates` turn the scheduler around to aim at a deadline [T17]; leave them blank
rather than guessing. `review.basis` records why the review set is what it is
[M31], and the build fails without it once anything is marked for review.

### 11.2 Calibrating depth

A partition of every topic, recorded in `expectations.md` in Phase 1: **skip**
what the reader demonstrably knows (and say so), **bridge** what they know
informally, **teach fully** everything else.

**Copy `background` from §1 verbatim**: it is the closure boundary and has to be
readable in the course folder. The common failure is teaching to the median
student instead of this reader; the quieter, worse one is using something off the
list because it was the natural tool.

---

## 12. Self-check before you emit

### 12a. Gated — a build failure catches these

**Per subsection**

- [ ] Every `<c k="…">`, `#s…` and `<f k>` resolves
- [ ] At least one quiz item, no repeated `type`, every item has `type`, `q`,
      `a`, `why`, and any `concept:` resolves
- [ ] `attempt` only as the first block (M10)
- [ ] No "(1) … (2) …" run into prose; steps are in `items:` (§6.1)
- [ ] Every `follows:` has a block above it, and no spine block follows a
      collapsible tier (§6.3)
- [ ] Every `<n k>` has its aside in the same block, and every aside its anchor
- [ ] Every `def` names a term; every subsection names at least one
- [ ] Every block declares a tier the lane selector knows
- [ ] Every list item, table heading, table cell and `steps` entry is a
      **string**, not a mapping an unquoted `": "` created (writing.md §4a)
- [ ] Every `figure`, `table` and `image` has a `cap:` saying what it shows (§2.2)
- [ ] Every `<m>` and `math` compiles; no `<m>` in a `mono`/`map` table
- [ ] Every authored HTML field escapes a bare `<` or `&`
- [ ] Every `image` has `alt`; every `plot` `fn` parses and is finite

**Per reviewed concept**

- [ ] `drills/<key>.yaml` with ≥3 items, ≥2 formats, ≥1 exam-format
- [ ] No two items share an answer; no stem contains its answer; every item has
      `steps`; `confusable_with` is declared both ways

**Per course**

- [ ] `expectations.md` has `exam.format` and `review.basis`
- [ ] `code` and `theme.hue` are not shared with another course
- [ ] Spine-only reading resolves every reference (M23, T33)
- [ ] `npm run audit` is inside every ceiling `course.yaml` declares

**The claim and the taxonomy (§5a, §6.6)**

- [ ] No block declares both `core:` and `gist:`; no `core:` reopens its own `h:`
- [ ] Every `cat:` names a file; every category has a `boundary:` and a member;
      `siblings:` name each other; every tag is a slug

### 12b. Author judgement — ungated

No script decides any of these.

- [ ] **Closure holds** (0.2): walk the course with `background` beside you. The
      check most likely to fail, and the one no build will run.
- [ ] **Every `def` and `key` has its why**, in the block or a `depth` follow-up
      directly under it (§6.3) — never at the foot of the subsection.
- [ ] **Every `key` is derived or declared given** (§6.2).
- [ ] **The opener is retired**, and the anchor names where it breaks (§6.2).
- [ ] **The traps are traps**, one or two, with an execution trap and an
      error-spotting item in every procedural subsection (§6.4, §6.5).
- [ ] **The quiz types are distinct**: could a reader answer one and fail
      another? If not, they are one type in two labels (14.6).
- [ ] **Every composing section has a synthesis item**; every exempt one says
      why in its blurb (§7.1).
- [ ] **Recurring ideas are concepts** (M13); sections run 2–5 subsections.
- [ ] **One drill item varies the surface** while asking the same response (§8.1).
- [ ] **Every specific value in a reviewed concept's `key` blocks has a
      cued-recall item** (§8.2) — the audit warns on numerals, but a sign
      convention or an ordering no script catches.
- [ ] **`confusable_with` pairs are real confusions** (D2); **no `apply` block
      re-explains** (M24).
- [ ] **Nothing marked `source:` with an origin was written from memory**;
      **every `verified:` date is a re-derivation**, not a re-reading (M22).
- [ ] **The prose does not read as generated**: no em dashes or interpuncts,
      hung tails ≤ 5% of sentences, "you" ≥ 6 per 1000 words, and no `key` or
      `def` of four sentences without one under ten words (writing.md).

```sh
npm run check      # must be clean
npm run audit      # the fractions and the M33 warnings
npm run shots      # look at it
```

**Read the section at both depths before calling it done** (§6.7).

**Quality bar.** A finished subsection lets a reader (1) say what the thing is,
from `def`; (2) use it, from `key` + `ex`; (3) see why it holds, from the
derivation; (4) recognise where it goes wrong, from `trap` + the error-spotting
item; (5) answer every distinct question type; and (6) still do it in six weeks,
from `drills/`. A finished *section* also lets them build something the course
never showed them (§7.1). The last two get skipped.

---

## 13. The sentence

Prose craft has its own file: **[`writing.md`](writing.md)**. Read it once before
your first `p` block. It holds the second person, concision and signposting
rules; the four counts §12b gates; the stress position; the punctuation the
engine does not want, including the YAML mapping trap; and the words to distrust.

## 14. Failure modes

The shapes a capable model produces by default.

| | Failure | Fix |
|---|---|---|
| **14.1** | **Assumed knowledge.** Reaching for a tool `background` never granted. | Check the list, not your instinct (0.2). |
| **14.2** | **The asserted rule.** A `key` states a rule and moves on. | Derive it, or declare it given (§6.2). |
| **14.3** | **Imperative drift.** "Write this down", "click to reveal". | Second person names the reader's situation, not their next action. Check §2.1. |
| **14.4** | **Encyclopedic drift.** Balanced survey prose. | If a paragraph would sit unchanged in a Wikipedia article, it is wrong here. |
| **14.5** | **The example that re-explains.** | The example starts at the first step of the work. |
| **14.6** | **Fake variety in the quiz.** One question three times with different numbers. | Could a reader answer one and fail another? If not, merge. |
| **14.7** | **Trap inflation.** | One or two per subsection (§6.4). |
| **14.8** | **Depth as a dumping ground.** | The test is examinability, not length (§6.3). |
| **14.9** | **Hedged claims.** "Generally", "typically". | Name the condition, or write `unverified`. |
| **14.10** | **Confident fabrication of institutional fact.** | Do not (0.5). |
| **14.11** | **Manufactured confusability.** | Only pairs readers actually mix up (D2). |
| **14.12** | **The four-example subsection.** | One example, three drill items (D1). |
| **14.13** | **Skipping Phase 6.** | A course that stops after Phase 5 has no retention loop. |
| **14.14** | **Marking everything for review.** | The cap is judgement, which is why you overshoot it (§5.1). |
| **14.15** | **Coverage mistaken for mastery.** | The synthesis item (§7.1). |
| **14.16** | **Density drift.** By the fortieth subsection the `key` blocks are half again as long. | Two to four sentences; three or four blocks of a kind, not five. Calibrate against what shipped. |
| **14.17** | **The run-in procedure.** | `items:` with `ordered: true` (§6.1). |
| **14.18** | **The missing or detached why.** | A `depth` follow-up directly under the block, or an aside on the phrase (§6.3). |

---

## 15. When data is not enough — `blocks.js`

Almost never: first check that a `figure` kind, a `table` with `map:`, or a
`def`/`key`/`ex` cannot express it. The exception is a renderer about *shape*
rather than data — circuit schematics are topology and symbols.

```js
export default function (Blocks, U) {
  Blocks.register("schematic", {
    apart: true,                                  // set apart from the prose
    render: b => `<div class="figure">…svg…</div>`
  });
}
```

Style it from that course's own `styles:`. `validate.mjs` reads the registered
names, so a typo in a block type is still caught. `U` gives `esc`, `strip`,
`clip`, `box(cls, label, inner)`, `cell(v, map)`, `src(b)` and
`caption(num, text)`.
