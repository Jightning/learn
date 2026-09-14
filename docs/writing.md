# Writing the sentence

[`create_course.md`](create_course.md) §14 catalogues defects in *what* a
subsection contains. This file is about the sentence carrying it — which is
where a reader decides whether a person wrote this for them or a machine
produced it at them, and they decide inside the first paragraph, before any
structure has had a chance to work.

The cost is not aesthetic: prose that reads as generated is prose the reader
discounts, and a reader who is discounting is not encoding.

Read it once before the first `p` block of a course. `create_course.md` §12b
gates four of the counts below.

## 1. Three findings, and what each one licenses

**Address the reader.** Rewriting instructional text from formal to
conversational style — mainly by moving to second person and speaking to the
learner directly — improves retention at d = 0.30 and **transfer at d = 0.54**
(Ginns, Martin & Marsh 2013, *Educational Psychology Review* 25:445–472,
meta-analysis). Transfer is the larger of the two, and it is what §1's D4 and D5
already spend budget on. Second person is a lever on the same outcome, and it is
free.

**Address is not instruction.** Second person names the reader's situation and
what they hold: "the group you are standing in", "you were given the other
direction". It does not turn a fact into an order. "It is written P(A | B)" is a
fact about notation; "Write it P(A | B)" commands an action the reader has no
reason to perform. The difference is invisible while you write, because both
contain "you" and both feel direct. A course that drifts into the imperative
reads as a worksheet, and the reader starts skipping the instructions, which is
where the content went. §2's count is a floor on address, not a quota
imperatives can fill.

**Cut the clause that adds nothing.** Sentence-level coherence measures
g = 0.63, the largest of the layout effects, and it is subtractive [T11]. A
clause carrying nothing the reader will be asked for is not neutral. It is a
cost. Strunk put the same rule as Rule 13: "Vigorous writing is concise. A
sentence should contain no unnecessary words, a paragraph no unnecessary
sentences, for the same reason that a drawing should have no unnecessary lines
and a machine no unnecessary parts."

**The machine tell is a habit, not a vocabulary.** Of the 379 excess style words
that appeared in biomedical abstracts in 2024, 66% were verbs and 14% were
adjectives; excess vocabulary from a genuine change of subject matter runs 79.2%
nouns (Kobak et al. 2025, *Science Advances*, 15M abstracts). What marks
generated prose is a preference for certain verbs and modifiers. That is a
preference for one sentence shape. You cannot fix it by avoiding
"delve". You fix it by changing the shape.

## 2. The four numbers

Counted over the prose fields of a course, code and maths excluded.

| | typical model output | target |
|---|---|---|
| em dashes per 1000 words | 6–15 | **≤ 3** |
| sentences ending in a hung tail | 15–24% | **≤ 5%** |
| "you" per 1000 words | 1.8–20.6 | **≥ 6** |
| sentences under 10 words | — | **≥ 19%** |

These are targets for course prose, not for code comments. A comment is read
once, by someone who chose to open the file. A `key` block is read by someone
under load who is about to be tested on it.

## 3. The hung tail

One defect dominates, and it is why the prose reads as generated. A sentence
states its point, then hangs a second clause off the end that glosses,
editorialises or draws a moral:

> …never to physical wire order **— a bus can be routed in any order.**
>
> …removes most of the null checks **— which is why published implementations
> use one and student implementations that segfault usually do not.**
>
> A weaker invariant than a BST **— only parent against child — which is exactly
> why a heap can be built in linear time.**

Any one of those is a good sentence. One in five being that sentence is a
cadence, and a cadence is what a reader hears as a machine. Every sentence lands
the same way, so none of them lands.

The end of a sentence is the **stress position**: "Stress positions are at
points of syntactic closure, e.g. the ends of clauses, sentences, and sections"
(Gopen & Swan 1990, *American Scientist* 78:550–558). It is where the reader
puts what they will remember. Strunk's Rule 18 is the same instruction from the
other side: "The proper place in the sentence for the word, or group of words,
which the writer desires to make most prominent is usually the end." Spend it on
a gloss and you have spent the only slot that sentence had.

**The test.** Delete everything after the dash or the comma.

- The sentence still teaches. The tail was commentary. It is gone, and you do
  not reattach it.
- The sentence lost something the reader will be asked for. The tail was a claim
  wearing an appositive's clothes. Give it its own sentence, with its own
  subject and its own verb.

**The budget.** One hung tail per subsection. Not one per block.

`which is why`, `that is why`, `which is exactly why`, and the participial tails
`, ensuring …`, `, allowing …`, `, making it …`, `, enabling …` are all the same
construction. They share the one budget.

## 4. Rhythm

Generated prose is metrically flat. Every sentence arrives at about the same
length, so nothing is emphasised. Human explanatory prose varies, and the
variation is itself the emphasis. A four-word sentence after two long ones is
how a writer points.

Gopen & Swan again: "Readers expect each unit of discourse (sentence, paragraph,
section) to serve a single function." A sentence doing two jobs is usually a
long one. Split it and you have the short sentence you were missing.

**The test.** Read the block aloud. If three sentences in a row land within three
words of each other, then one of them is two sentences or two of them are one.
Every `key` or `def` block of four sentences or more carries at least one
sentence under ten words.

## 4a. Punctuation the engine does not want

Two marks are ruled out in course prose, and both for the same reason: they are
the punctuation a model reaches for when it has not decided what the relation
between two clauses is.

**The em dash.** Almost every one of them is a colon, a full stop, a comma or a
pair of brackets that has not been chosen. Decide which. A colon promises the
second half explains the first; a full stop says they are two facts; brackets
say the second is an aside you may skip. An em dash says only that something
else is coming, which the next word already said. There is no quota to hit
here: the mark is not banned so much as never the answer once you have picked
the relation you meant.

| instead of | write |
|---|---|
| `the encoding is signed — the leading bit is a weight` | `the encoding is signed: the leading bit is a weight` |
| `it fails at zero — the derivative is undefined there` | `it fails at zero. The derivative is undefined there.` |
| `the residue — a single complex number — is what the integral returns` | `the residue (a single complex number) is what the integral returns` |

**One trap, since this rule creates it.** A colon is the commonest replacement
for an em dash, and in YAML a plain scalar containing `": "` is a *mapping*.
This looks right and is not:

```yaml
items:
  - the <b>index</b>: every idea the course reuses     # WRONG
```

It parses to `{"the <b>index</b>": "every idea the course reuses"}`, which is
valid YAML, loads without complaint, and renders as **`[object Object]`** in
the middle of the reader's prose. Quote the whole item:

```yaml
items:
  - 'the <b>index</b>: every idea the course reuses'   # right
```

A single-line `key: value` with a second colon fails the parse outright, so the
silent case is list items and table cells specifically. `validate.mjs` now
fails the build on any of them, and names this as the cause.

**The interpunct.** `A · B` is a rule drawn as a glyph. Prose does not need it
at all; a list takes commas. Where the engine itself has to divide two pieces of
metadata on one line it draws a hairline (`<i class="sep">`, 00-tokens.css)
rather than typing a character, because a glyph inherits the ink and weight of
what it divides and its width differs between the three faces.

A dot that is doing real typographic work is not this rule's business: a decimal
point, a scalar product, a units separator. Write those as the notation
requires.

## 5. Verbs, and who is doing what

A nominalisation buries the verb inside a noun, then needs a weak verb to prop
it up. `the <X>ion/ment/ance of` is the reliable place to look. Not all are
defects: "the impedance of" is the name of a quantity.

| instead of | write |
|---|---|
| the definition of a full tree is | a full tree is |
| performs a comparison of | compares |
| is responsible for handling | handles |
| there is a requirement that | must |
| serves as / acts as / functions as | is |

"Readers interpret any information between the grammatical subject of a sentence
and its verb as an unimportant interruption" (Gopen & Swan). Put the thing the
sentence is about first. Put its verb next. Put the new information last. Strunk
Rule 12 covers the nouns: "Prefer the specific to the general, the definite to
the vague, the concrete to the abstract."

## 6. Words to distrust

Not a blacklist — §1 says why a blacklist is the wrong instrument. Each is a
prompt to check the *shape* of the sentence, not to reach for a synonym.

`crucial` · `essential` · `vital` · `pivotal` · `paramount` · `robust` ·
`seamless` · `leverage` · `utilise` · `delve` · `realm` · `landscape` ·
`tapestry` · `testament` · `showcase` · `underscore` · `intricate` ·
`meticulous` · `it is important to note` · `it is worth noting` ·
`serves as` · `the fact that` · `in order to`

`crucial`, `essential` and `vital` are one error committed three ways: the
sentence asserts importance instead of demonstrating it. If a thing matters, the
reason it matters is the sentence you should have written.

**The error is wider than importance.** Any adjective handing the reader a
judgement they were about to reach from the evidence in the same sentence does
it: "the test is good", "a surprising result", "a simple rule", "the obvious
choice". "The mammogram is good: it flags 80 of those 100" spends a clause
telling the reader what to think about a number they have not read yet, and it
arrives before anything has earned it. Give the number first and let the reader
conclude. If you cannot say what makes it good, surprising or simple, it is
not.

A hedge is a defect in the *claim* rather than in the sentence, and is caught at
14.9.

## 7. Read a human first

Before your first `p` block, read one page of one of these. Not for the
subject — for the cadence.

**Richard Feynman**, *Lectures on Physics* I.1,
[feynmanlectures.caltech.edu](https://www.feynmanlectures.caltech.edu/I_01.html).
The one sentence he would pass on carries the whole atomic hypothesis: "all
things are made of atoms—little particles that move around in perpetual motion,
attracting each other when they are a little distance apart, but repelling upon
being squeezed into one another." The next sentence is short and tells you what
to do with it. **Steal:** one long sentence that is all content, then a short one
that is all instruction.

**Julia Evans**, "Patterns in confusing explanations",
[jvns.ca](https://jvns.ca/blog/confusing-explanations/). Thirteen patterns,
several of them this repo's rules arrived at independently: *starting out
abstract* is M10 and D3, *unsupported statements* is M20 and M28, *"what"
without "why"* is M6 and M7. **Steal:** the register — short declaratives,
second person, and a willingness to say a thing is confusing.

**Paul Halmos**, "How to Write Mathematics", *L'Enseignement Mathématique* 16
(1970). The headings are most of the lesson: *Say something. Speak to someone.
Organize first. Write in spirals. Down with the irrelevant and trivial. Resist
symbols. Stop.* **Steal:** "Speak to someone" is §1 and §1\'s d = 0.54.
"Stop." is 13.3.

**Mechanism, if you want it.** Gopen & Swan, "The Science of Scientific
Writing", *American Scientist* 78 (1990): 550–558, at
[crowl.org](http://www.crowl.org/lawrence/writing/GopenSwan90.html), explains
why 13.3 and 13.5 work rather than asserting them.

---
