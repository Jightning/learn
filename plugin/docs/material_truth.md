# Material truth

Invariants for anything written into `courses/<id>/`. They hold for every
subject, author and level: content that breaks one is wrong. For the engine, see
[`code_truth.md`](code_truth.md); for *how* to write files, see
[`create_course.md`](create_course.md).

Numbering is historical, not positional, so references stay valid. Effect sizes
name their control condition and come from meta-analyses where one exists.

---

## 1. The two rules everything else serves

**M1. Every piece of information appears exactly once.** If two subsections need
an idea, one defines it and the other references it. A second copy drifts.

M1 governs *explanation*. A second application is a different reader activity on
the same idea, and repetition for fluency lives in the drill bank, where M26
requires it.

**A `core:` is not a second copy; a `gist:` is.** `core:` holds a block's opening
claim in its own field and `h:` holds only what develops it — one paragraph split
at a declared point. `gist:` summarises a block whose prose stays whole, so it is
a genuine second copy: permitted under M34 and counted against a ceiling. One of
them can fall out of agreement with the prose; the other cannot.

**M2. Nothing is assumed beyond the stated calibration.** Completeness is
measured against a written record of what the reader knows, not the author's
sense of what is obvious — and, where a course uses tiers, against the **spine**
(M23). M1 and M2 pull against each other; references are how they coexist.

**M3. The calibration is written down.** `materials/expectations.md` records what
is assumed, bridged, taught and skipped, the exam format and dates, and the basis
for the review set (M31). Whether a worked example helps or *hurts* depends on
the reader's expertise (Trade-offs), so a course that has not stated its reader
cannot know whether its scaffolding is correct. The build reads its front matter.

---

## 2. Every subsection

**M4. At least one question.** A subsection without retrieval is a document.
Practice testing beats restudy at g = 0.51 and no activity at g = 0.93 (Adesope
et al. 2017, 272 effects). M4 guarantees retrieval exists, not that it recurs;
spacing is where the size comes from (g = 0.74, Latimier et al. 2021), and
recurrence is guaranteed only by M26 for the review set.

**M5. One question per distinct question type, and no type repeats.** The target
is coverage of the question *surface*, not volume. This governs the subsection
quiz only; the drill bank (M26) has no type-uniqueness constraint. That is the
Loop A / Loop B boundary in `code_truth.md` §3b.

**M6. Every question carries `type`, `q`, `a`, `why`, `why_prompt`, and a
resolvable concept.** An answer without reasoning teaches recognition of that
answer. `why_prompt` is the specific question asked before the reveal: elaborated
retrieval adds d = 0.23 to transfer over plain retrieval (Pan & Rickard 2018).
The concept may be inferred where the subsection cites exactly one reviewed
concept, but it must resolve — it is the identity a confident miss uses to pull
the concept into Loop B (T18).

**M7. The `why` explains why the wrong answer is tempting**, not only why the
right one is right. A misconception survives an explanation that never names it.

**M8. Every subsection names at least one term with a `def` block.** The panel,
primer and index are built from named terms, and a term introduced inside prose
is invisible to all three. Structural, not an effect-size claim: pre-training
itself measured g = 0.28, not significant.

**M9. `type` names a skill, not a number.** `type` is the identity for
*coverage*; the concept key is the identity for *retention*. Neither substitutes
for the other.

---

## 3. Order within a subsection

**M10. Nothing that qualifies a rule precedes it, and at most one move precedes
the definition.** Body order is definition, rule, example, exception: meeting an
exception first makes the reader hold an unresolved contradiction.

One move may precede the definition, as the first block, and the definition must
retire it explicitly — an **`attempt`** (a problem they cannot yet solve) or a
**concrete anchor** (one instance in terms they hold). Concreteness fading beat
alternative sequences at d = 0.76–0.83 with **concrete-only last** (McNeil & Fyfe
2012), so an unretired anchor leaves the reader in the condition that performed
worst: it violates M10 rather than satisfying it. Using both forms is two moves.

**M11. Worked examples are fully stepped.** A step the reader cannot reconstruct
is an assertion with numbers in it.

**M12. Anything examinable is in the body, not in a note** — nor in a `depth`
block (M25).

---

## 4. Across a course

**M13. An idea used in three or more places becomes a concept.** Promotion is
cheap (one file and a link) and carries no cost ceiling. It creates no scheduling
obligation: that is M31, paid for by M26.

**M14. No forward reference without a link.** Move the idea earlier, or make it a
concept.

**M15. The sequence follows the institution's own order** where one exists. The
reader sits that institution's exams; an order that desynchronises from lectures
costs more than it gains.

**M16. Prerequisites are links, never prose reminders.** "Recall from earlier…"
plus a restatement is M1 violated. A link renders a margin card, feeds the
prerequisite list and draws a map edge.

---

## 5. Figures and images

**M17. A figure must carry information the prose does not.** Removing decoration
improves learning: coherence is subtractive and the largest layout effect
(g = 0.37–0.41, Sundararajan & Adesope 2020).

**M18. Prefer a declarative figure to a supplied image** where the content is
describable as data: it stays sharp, follows the theme, and is corrected by
editing numbers.

**M19. Every image has alt text describing what it *shows*.** "Diagram" is not
alt text.

---

## 6. Accuracy

**M20. Facts are grounded in the institution's own sources**, not memory.

**M21. Anything unverifiable is flagged in place, never guessed.** A confidently
wrong grading weight is worse than a blank with a note. Grading percentages vary
by term and instructor.

**M22. A worked answer that is wrong is worse than no answer.** Content is
checked by re-deriving, not re-reading: two errors in this project's history
survived re-reading and were caught only by working the problem again.
Re-derivation is recorded — every answer and drill item carries the date.

---

## 7. Tiers

**M23. Every block declares a tier: `spine`, `depth` or `apply`.** The spine
alone satisfies M2; depth and apply may reference the spine, never the reverse.
An absent `tier:` declares `spine`, and it fails safe: the mistake it can produce
is a block shown to every reader, never one hidden.

**M24. An `apply` block instantiates; it never re-explains.** An application that
restates its concept's definition is an M1 defect, and the fix is a link.

**M25. Nothing examinable lives in `depth`.** A `depth` block promises that
collapsing it costs nothing examinable. Mechanically: no concept with an
exam-format drill item may have its only spine coverage inside a `depth` block.

---

## 8. The review set and the drill bank

**M31. The review set is declared, never inferred.** Every concept the course
intends to hold over months is marked `review: true`, and `expectations.md` says
on what basis. Checked both ways: marked with no drill file fails, a drill file
for an unmarked concept warns, a non-empty set with no basis fails. A course may
declare an empty review set and remain correct — it has no Loop B and must not
claim retention it does not schedule for.

**M26. A reviewed concept carries at least three drill items with fully stepped
solutions (M11), spanning at least two formats, one matching the declared exam
format.** Three is the criterion count: fewer degrades into memorising one
question (T31), and a higher floor washes out once relearning happens (Vaughn,
Dunlosky & Rawson 2016). Mixed-format practice produced the strongest effect in
the largest analysis (Adesope et al. 2017); the format *ranking* is contested,
the *match* is not.

**M27. Every drill item names the concept it exercises.**

**M32. At least one drill item per reviewed concept differs in surface from the
worked example, while asking for the same kind of response.** Varying the surface
stops item memorisation; holding the response preserves the effect — response
congruency moved transfer from d = 0.28 to d = 0.58 (Pan & Rickard 2018).

**M33. Every specific value stated in a `key` block has a matching drill item.**
A constant, threshold, sign convention, ordering or boundary that is stated and
never retrieved is a sentence, not a memory. The test: could the reader lose a
mark by forgetting this exact thing while understanding everything around it?

---

## 9. Trust

**M28. Every explanatory claim names its source, or is flagged unverified in
place.** `npm run audit` reports the fraction and fails above a per-course
ceiling.

**M30. Model-drafted content carries `source: generated`**, which counts as
unverified until a human replaces it. Generation is a drafting step, never a
publishing step, and a course written entirely by a model must not pass the M28
audit at zero percent unverified.

**M29. Each section's primer prequestions a relation, not only a term.** The
benefit does not generalise past what was asked: g = .66 on the prequestioned
content, g = .01 on everything else. The correction is immediate and not
optional — an uncorrected conceptual pretest error is *more* likely to be
repeated later than one never asked. Primers are section-level; `def` blocks are
subsection-level.

---

## 10. Claims and categories

**M34. A block states its claim once, and says which way it did it.** Every
`def`, `key` and `trap` declares exactly one of:

- **`core:`** — the block's own opening claim, stored apart from its development.
  Nothing is duplicated, so this is the default.
- **`gist:`** — a summary about the block, shown only when it is closed, with
  `h:` untouched. This *is* a second copy (M1), for prose that must withhold its
  claim on a first read: a `trap` works because the reader believed otherwise
  thirty words ago.

The field name is the declaration; a mode flag beside it would be a second record
of one choice. A provided outline raises memory (g = 0.61) without reliably
raising comprehension (g = 0.34, n.s.; Ponce, Mayer & Méndez 2023), so a closed
view is a lookup surface and must carry the claim itself rather than a topic:
"The split trap" tells a reader nothing; "random frame-level splits leak
near-duplicates across train and validation" does. `gist:` is the easier field to
write, so it is ceilinged in `course.yaml` like `unsourced`.

**M35. A category is declared, never inferred, and carries a boundary.** M31's
shape applied to classification. `cat:` is the principal tag — one per block or
concept, naming a `categories/<key>.yaml`; `tags:` are secondary, plural, slugs.
**A label names one block; a category names a set**: a category has an extension
(members from anywhere in the course) and a boundary (what falls outside, and
which sibling it falls into instead). Comparing cases beats meeting them one at a
time (d = 0.50; Alfieri, Nokes-Malach & Schunn 2013), and `siblings:` is what
turns a member list into a comparison, so siblings must name each other.

Scope is narrow: categories attach to **blocks and concepts only**. A drill
item's category is its concept's (M27), and a quiz item has none, because `type`
is already its identity (M9).

**M36. Every block can name itself.** A block with no `term:`, `label:`, `cap:`,
`title:` or registered default vanishes from the reader's index. The exception is
`p`, by definition: **a `p` block carries no claim**, so it has nothing to name.
A `p` that asserts something is a `key`.

---

## Trade-offs

Legitimate variation: editorial judgement, not defects.

**Whether to tier at all.** Spine-only is a valid course. The coherence evidence
covers material a learner cannot avoid; opt-in collapsed detail has not been
tested against a single-density alternative.

**How large the review set is.** Reviewing everything buys retention of what the
exam never asks; reviewing nothing gives up Loop B. The defensible middle is what
the exam can test plus what the author expects to be error-prone.

**Depth per course.** A one-credit seminar and a four-credit core course should
not have the same density. Padding violates M1 directly.

**How much scaffolding.** Worked examples reduce load for novices facing
unfamiliar material, but the benefit shrinks, disappears and **reverses** with
expertise (d = 0.45–2.99 between low and high prior-knowledge learners, Kalyuga
2007). Deliberately erroneous examples reverse the same way: they can foster far
transfer, more so for higher prior knowledge and when the error is not located
for the reader, but only if the correct version came first and the reader is
asked to detect, explain and correct (Große & Renkl 2007). This is calibration,
which is why M3 requires the reader to be written down.

**Whether a subsection opens with an `attempt`.** Problem solving before
instruction was favoured overall, strongest for conceptual and transfer outcomes
among older STEM learners, reversing for young learners and domain-general skills
(Sinha & Kapur 2021). M10 permits it; nothing requires it.

**Subsections per section.** Two to five is a band, not a rule.

**Concepts per course.** No cap: M13 follows from M1. The cost sits in the review
set — thirty concepts is a navigation question, thirty reviewed concepts is
ninety drill items.

**Question count beyond type coverage.** A second question of an existing type is
wrong in the quiz and right in the drill bank: a routing decision, not a
judgement about volume.

**Which `materials/` files to write.** `expectations.md` is required (M3);
`syllabus.md` and `reference.md` are optional and high value; `schedule.md` is
optional; `problems.md` and `checklist.md` are generated, and editing them fails
the build (T20, T21). A file restating what the site already says should not be
written.

**How much of a course is categorised.** Categorising everything makes the chip
a decoration (T13 degrades with density); categorising nothing gives up the one
grouping that is neither positional nor argumentative. The defensible middle is
the sets a reader would look up as a set.

**Tone and voice.** Register is the author's. What is not optional is that a
label labels, an example demonstrates, and nothing quietly does two jobs.

**Institution order versus pedagogical order.** M15 says follow the institution.
The exception is a genuine dependency violation: insert a bridge or promote the
idea, and say in the section blurb why the order differs.
