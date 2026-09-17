# Writing the sentence

`create_course.md` §14 catalogues defects in *what* a subsection contains; this
file is about the sentence carrying it. A reader decides inside the first
paragraph whether a person wrote this, and prose that reads as generated is prose
they discount — a reader who is discounting is not encoding. Read this once
before the first `p` block; §12b gates four of the counts below.

## 1. Three findings

**Address the reader.** Conversational, second-person instructional text improves
retention at d = 0.30 and **transfer at d = 0.54** (Ginns, Martin & Marsh 2013).
Transfer is what D4 and D5 already spend budget on; second person is free.

**Address is not instruction.** Second person names the reader's situation and
what they hold: "the group you are standing in". It does not turn a fact into an
order. "It is written P(A | B)" is a fact; "Write it P(A | B)" commands an action
the reader has no reason to perform. Both contain "you", which is why the drift
is invisible while you write, and a course that drifts reads as a worksheet.

**Cut the clause that adds nothing.** Sentence-level coherence measures g = 0.63,
the largest layout effect, and it is subtractive [T11]. Strunk's Rule 13:
"Vigorous writing is concise."

**The machine tell is a habit, not a vocabulary.** Of the excess style words in
2024 biomedical abstracts, 66% were verbs and 14% adjectives; vocabulary from a
genuine change of subject runs 79.2% nouns (Kobak et al. 2025). What marks
generated prose is a preference for one sentence *shape*, so avoiding "delve"
fixes nothing.

## 2. The four numbers

Counted over a course's prose fields, code and maths excluded.

| | typical model output | target |
|---|---|---|
| em dashes per 1000 words | 6–15 | **≤ 3** |
| sentences ending in a hung tail | 15–24% | **≤ 5%** |
| "you" per 1000 words | 1.8–20.6 | **≥ 6** |
| sentences under 10 words | — | **≥ 19%** |

## 3. The hung tail

One defect dominates. A sentence states its point, then hangs a second clause off
the end that glosses or draws a moral:

> …never to physical wire order **— a bus can be routed in any order.**
>
> A weaker invariant than a BST **— only parent against child — which is exactly
> why a heap can be built in linear time.**

Any one is a good sentence; one in five being that sentence is a cadence, and a
cadence is what a reader hears as a machine. The end of a sentence is the
**stress position** (Gopen & Swan 1990), where the reader puts what they will
remember. Spend it on a gloss and the sentence had no other slot.

**The test.** Delete everything after the dash or comma. If the sentence still
teaches, the tail was commentary: leave it out. If it lost something the reader
will be asked for, the tail was a claim wearing an appositive's clothes: give it
its own subject and verb.

**The budget is one hung tail per subsection**, not per block. `which is why`,
`that is why`, and the participials `, ensuring …`, `, allowing …`,
`, making it …`, `, enabling …` are the same construction and share it.

## 4. Rhythm

Generated prose is metrically flat: every sentence about the same length, so
nothing is emphasised. A four-word sentence after two long ones is how a writer
points. A sentence doing two jobs is usually a long one — split it and you have
the short sentence you were missing.

**The test.** Read the block aloud. Three sentences in a row landing within three
words of each other means one is two sentences, or two are one. Every `key` or
`def` of four sentences or more carries one under ten words.

## 4a. Punctuation the engine does not want

**The em dash.** Almost every one is a colon, a full stop, a comma or brackets
that has not been chosen. A colon promises the second half explains the first; a
full stop says they are two facts; brackets say the second is skippable. An em
dash says only that something else is coming.

| instead of | write |
|---|---|
| `the encoding is signed — the leading bit is a weight` | `the encoding is signed: the leading bit is a weight` |
| `it fails at zero — the derivative is undefined there` | `it fails at zero. The derivative is undefined there.` |
| `the residue — a single complex number — is what the integral returns` | `the residue (a single complex number) is what the integral returns` |

**One trap, which this rule creates.** In YAML a plain scalar containing `": "`
is a *mapping*:

```yaml
items:
  - the <b>index</b>: every idea the course reuses     # WRONG
```

That parses to `{"the <b>index</b>": "every idea the course reuses"}`, loads
without complaint, and renders as **`[object Object]`**. Quote the whole item:

```yaml
items:
  - 'the <b>index</b>: every idea the course reuses'   # right
```

A single-line `key: value` with a second colon fails the parse outright, so the
silent case is list items and table cells. `validate.mjs` fails the build on them
and names this as the cause.

**The interpunct.** `A · B` is a rule drawn as a glyph; prose takes commas. Where
the engine divides metadata it draws a hairline instead, because a glyph inherits
the ink and weight of what it divides. A dot doing real typographic work — a
decimal point, a scalar product, a units separator — is not this rule's business.

## 5. Verbs, and who is doing what

A nominalisation buries the verb in a noun, then props it up with a weak one.
`the <X>ion/ment/ance of` is where to look; not all are defects, since "the
impedance of" is the name of a quantity.

| instead of | write |
|---|---|
| the definition of a full tree is | a full tree is |
| performs a comparison of | compares |
| is responsible for handling | handles |
| there is a requirement that | must |
| serves as / acts as / functions as | is |

"Readers interpret any information between the grammatical subject of a sentence
and its verb as an unimportant interruption" (Gopen & Swan). Subject first, verb
next, new information last.

## 6. Words to distrust

Not a blacklist: each is a prompt to check the sentence's *shape*.

`crucial` · `essential` · `vital` · `pivotal` · `paramount` · `robust` ·
`seamless` · `leverage` · `utilise` · `delve` · `realm` · `landscape` ·
`tapestry` · `testament` · `showcase` · `underscore` · `intricate` ·
`meticulous` · `it is important to note` · `it is worth noting` ·
`serves as` · `the fact that` · `in order to`

`crucial`, `essential` and `vital` are one error three ways: asserting importance
instead of demonstrating it. **The error is wider.** Any adjective handing the
reader a judgement they were about to reach — "the test is good", "a surprising
result", "the obvious choice" — spends a clause on what they have not read yet.
Give the number first and let them conclude. A hedge is a defect in the claim
instead, caught at §14.9.

## 7. Read a human first

One page, for the cadence, not the subject.

- **Feynman**, *Lectures on Physics* I.1 — one long sentence that is all content,
  then a short one that is all instruction.
- **Julia Evans**, "Patterns in confusing explanations" — short declaratives,
  second person, willing to say a thing is confusing.
- **Halmos**, "How to Write Mathematics" — *Say something. Speak to someone.
  Organize first. Write in spirals. Resist symbols. Stop.*
- **Gopen & Swan**, "The Science of Scientific Writing" (1990) — the mechanism
  behind §3 and §5, if you want it.
