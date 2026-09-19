# Architecture

The non-negotiables, with their evidence and an explicit split between proven
truths and defensible trade-offs, are in [`code_truth.md`](code_truth.md)
(engine) and [`material_truth.md`](material_truth.md) (content). This file
describes how the current system is built; those describe what any version of it
must satisfy.

A study-site system where **adding a subject requires no code**. One generated
page hosts every course; courses are folders of data.

> Supersedes `docs/superpowers/specs/2026-08-13-course-sites-design.md`
> (recoverable at commit `370a5bd` if any earlier rationale is needed).

## Two constraints

1. **Completeness** — assume no prior knowledge beyond the calibration in §6.
2. **Non-redundancy** — every piece of information appears exactly once.

They pull against each other; §1 is how they are reconciled.

## 1. Single-source rule

`index.html` is the sole home of explanatory knowledge. A course's
`materials/` holds only artefacts that are different in *kind*, each linking
into the site by anchor rather than restating it.

| File | Holds | Why it is not a duplicate |
|---|---|---|
| `syllabus.md` | Official topic sequence, credits, textbook | Course metadata |
| `expectations.md` | Grading, exam format, workload, failure modes | Meta |
| `schedule.md` | Week-by-week, deep-linked to anchors | Pure index |
| `checklist.md` | "Can I do this?" inventory, anchor-linked | Self-audit. **Generated** from the question types and the drill bank once a course has one |
| `problems.md` | Drill problems + worked solutions | Quizzes cover one item per *question type*; this is repetition for fluency. **Generated** from `drills/` |
| `reference.md` | Formula card, symbols only, deep-linked | Condensation |

## 2. Delivery — one shell, courses fetched

`npm run build` produces `dist/`: an ~840KB shell, plus one `courses/<id>.json`
per subject holding the files that course is written in. The engine is embedded
once; a course is fetched when it is opened and parsed in the browser.

| route | view |
|---|---|
| `#/` | library — pick a course (skipped when only one exists) |
| `#/<c>` | course contents |
| `#/<c>/s<n>[-<k>]` | one section, optionally scrolled to a subsection |
| `#/<c>/index` | the index: every idea and every kind the course declares. `concepts` and `cat` are kept as aliases of it, so links written before the two hubs merged still land |
| `#/<c>/c/<key>` | one concept's entry |
| `#/<c>/cat/<key>` | one category and its members |
| `#/<c>/explore[/tag/<t>]` | faceted search: kind, category, tag, depth |
| `#/<c>/s<n>-<k>~<i>` | one block, opened in place whatever the depth |
| `#/<c>/practice[/<cat>]`, `#/<c>/map[/<s>]` | mixed practice, optionally scoped to one category; dependency map — the optional section id rings the node you arrived from |
| `#/<c>/calibration` | confidence, model calibration, coverage against retention |
| `#/review` | cross-course review, its own chrome. `review` is a reserved course id |

**Why not a framework.** It would re-express existing renderers with a bundler
attached and no new capability — see §3b.

Only one section is ever in the document flow, so topics stay isolated.

## 2b. Nothing about a course is compiled

A course is a map of file path to text — the same YAML an author edits — and
`src/lib/parse.js` turns it into a course object in the browser. There is no
build step between what a model writes and what the app runs.

It used to be compiled: KaTeX ran at build time and the output was deduplicated
into a shared fragment table. For a single-user site that was right, since an
equation is data and data does not change between page loads. It stopped being
right when a course became something a reader imports, edits and syncs.

The trade, measured rather than argued:

| | compiled | source |
|---|---|---|
| ma26600 on disk | 7.3MB | **557KB** (152KB gzipped) |
| all eight courses | 9.3MB | **2.6MB** |
| shell | 551KB | 842KB (KaTeX and its fonts now ship) |
| readable / editable by a model | no | **yes** |

And the cost, on a CPU-throttled Pixel 7 profile:

| | mid-tier phone (4x) | low-tier phone (6x) |
|---|---|---|
| parse ma26600's 458KB across 105 files | 58ms | 87ms |
| render the heaviest subsection, cold cache | 54ms | 87ms |
| **next subsection, warm cache** | **25ms** | **39ms** |
| open course → first render | 309ms | 481ms |

So the compilation cost 13x in size, in a form nothing could read, to save
about a sixth of a second once per course open. Steady-state reading — the
number a reader actually lives with — is 25–39ms.

`src/lib/math.js` caches on the TeX source, which is what makes the warm number
small: ma26600 has 4034 formula occurrences and 2711 distinct ones.

**What went with it**: `tools/lib/mathtable.mjs`, the KaTeX face subsetting,
build-time image inlining, the `virtual:expand` module, the single-file build
and its 8MB budget. Images now travel as data URIs under their own path inside
the course's file map, so a course is still one self-contained thing.

**What was lost**: the self-contained `index.html` that opened by double-click
with no server (T23). Runtime course loading needs an origin, and `file://`
cannot fetch. That property served a single reader with a memory stick; it is
incompatible with courses being user data, and the app is now a static site that
any free host serves.

**`INDEX` is never lazy**: the library card, the accent, and the drill keys and
retention target, derived at build time for built-in courses and on import for
the reader's own. `lib/queue.js` decides what is due from drill *keys* alone,
never the items, so the cross-course due badge is right on first paint without
fetching a single course.

## 2c. Storage, sync, and offline

**Storage moved to IndexedDB** (`src/lib/store.js`). Web Storage caps at 10 MiB,
the outcome log alone reached ~4MB, and every writer swallowed its own failure
with `catch {}` — silent data loss on the device most likely to hit the cap.
Two things keep the change small: everything is loaded into memory once at boot
so reads stay synchronous and no call site became async, and the log gets its
own object store so appending costs one small put rather than rewriting the
whole array on every answer. Failures now surface instead of vanishing.

**Only the log syncs.** Loop A and Loop B state are folds over it, so they are
recomputed on arrival rather than transferred. This is what removes conflict
resolution from the design: two devices cannot merge divergent FSRS stabilities
without discarding a session, but log rows are immutable, timestamped, and owned
by exactly one device, so merging is a union.

**Collisions, specifically.** Two devices answering the same concept while both
offline is not a conflict: both rows survive the union and the fold applies them
in timestamp order, because the reader genuinely did answer twice. What *can* go
wrong is the cursor, and three things were wrong with the first version:

| | |
|---|---|
| **Clock skew** | The pull cursor was `max(row.ts)` and the server filtered on `ts`. A device running seconds fast advanced the other's cursor past rows it had never received, losing them permanently and silently. The cursor is now a server-assigned `seq` (the sync server's own files), so "what have I not seen" is a question about one server's arrival order rather than two clocks. |
| **Same-millisecond ties** | Both cursors used a strict `>` on a non-unique `ts`, so rows sharing a millisecond across a page or cursor boundary were skipped forever. Pull pages by `seq` and drains until `more` is false; push does not use a clock at all — rows carry a local `sent` flag, set only after the server has them. |
| **Stale display** | A sync that merged rows re-rendered the open course without refolding it, so the new schedule appeared only after navigating away and back. `app.jsx` now calls `rebuild` on `learn:synced`. |

`tools/test-sync.mjs` covers all three, including an assertion that the old
timestamp cursor *would* have dropped the rows — so the test fails if the fix is
ever reverted. Row ids are `<device>:<ts>:<n>`, and the server's `INSERT OR
IGNORE` on a unique `id` makes redelivery free, which is what lets push retry
without bookkeeping.

The one collision this does **not** survive is a cloned browser profile: two
devices sharing a `device:id` would exclude each other from pulls and could mint
colliding row ids. Clearing `device:id` on one of them is the fix.

The fold is exact because the transitions are pure and the scheduler takes `now`
as an argument. `retention.step` and `state.rateStep` are the same functions the
live path uses, fed logged timestamps instead of the clock;
`tools/test-replay.mjs` asserts that replaying a log reproduces the state that
living it produced, that resuming from a checkpoint equals one pass, and that
merge order does not matter.

A checkpoint per course keeps it cheap, and it is also what makes pruning safe:
the log is no longer capped, because dropping the oldest rows would silently
corrupt every interval that depended on them.

**The server is two Functions** (`functions/api/sync.js`, `functions/api/course.js`,
D1). They store rows and hand them back; they never merge. D1 rather than KV
because KV allows 1,000 writes a day across an entire Cloudflare account, and
because a course body needs somewhere to live — it is chunked across rows to
stay under D1's per-value ceiling.

**Two Functions, called as rarely as possible.** Pages serves the static assets
with unlimited requests and unlimited bandwidth, on a quota separate from
Workers; `functions/api/*` is the exception and draws on the account-wide
100,000 Workers requests/day. The hostname is published in Certificate
Transparency logs, so the endpoint is findable by anyone — which is why the
design spends requests as if they were scarce, and why the gate comes before
anything else runs.

| | |
|---|---|
| **One round trip per sync** | `/api/sync` carries this device's new rows up, the other devices' rows back, and the course listing in the same response. Only a course *body* costs a second call, and only when its content hash differs from the one held. |
| **Once a day** | An automatic sync runs at most every 24 hours, and not at all when there is nothing queued. Two devices cost two requests a day. A reader can force one from the panel; nothing else can. |
| **Never for a stranger** | A device with no secret makes no call at all — `configured()` is false and the client returns before `fetch`. Someone who finds the hostname can spend requests, but no reader of the public site does so by using it. |
| **Refuse before reading** | `guard()` compares the secret and returns; nothing touches D1 until it passes. No secret configured answers 404 rather than 401, so a bare deployment does not advertise that sync exists. `SYNC_OPEN_UNTIL` closes the window entirely when the owner wants it shut. |

**What the backend can see, and what it cannot.** Row bodies and course files are
AES-GCM ciphertext sealed in the browser (`src/lib/seal.js`) under a key derived
from the secret with PBKDF2. The columns beside them are what the server needs
to do its job and nothing more: a row id, a device id, a timestamp, a size. So
the account stores the log without being able to read it, and the secret is a
key as well as a password — lose it and the ciphertext is scrap, which is why
`courses/` on disk remains the real backup.

**Deleting a course is a tombstone, not a disappearance.** A removal on one
device has to reach the others, and a row that simply vanished would be
indistinguishable from one they had never seen. `deleted_at` marks it, every
device applies the removal on its next sync, and the body stays until the
tombstone is purged 30 days later — which is what makes "recently deleted" a
restore rather than a promise. Purging runs inside an authenticated request that
was already being made, because a scheduled trigger is a request too.

**Only one identity exists: the secret.** The site is public, so there is no
account and no login to check. Holding the secret is what makes a device the
owner's, and the UI follows: nothing about the backup renders until a secret is
set, and the place to set one is `#/sync`, a route nothing links to. A reader
who never goes there sees a site with no backend in it at all.

**Courses cannot be published.** A course reaches `dist/` only if the engine
names it in `PUBLIC` (`tools/lib/files.mjs`), which holds `demo` alone;
everything else is validated by the build and left on the author's disk. This
was a `publish: true` flag in `course.yaml` — private by default, but a
one-line opt-in living in the data, where an author or a model editing a course
could turn it on without ever touching the engine. A default is a weaker
guarantee than an absent mechanism, so the flag was removed rather than
tightened, and `build.mjs` reads `dist/courses/` back after the build to gate
the outcome rather than the intent. `npm run pack` writes one file per private
course, and the app installs it into IndexedDB — so a private course exists only
where its reader put it, and absence is the privacy mechanism rather than a
policy anyone has to enforce.

The service worker still refuses to cache anything redirected, not same-origin,
or of the wrong content type — cheap insurance against a login page or an error
being cached under a course's URL.

**Offline is the normal case.** The service worker caches the shell and each
fetched course; writes land in IndexedDB immediately and sync is opportunistic,
so a failed pull leaves the cursors untouched and the next attempt resumes.
Nothing is queued, because the log is the queue.

**Installing to the Home Screen is a correctness requirement on iOS**, not
polish. WebKit deletes all script-writable storage — IndexedDB included — for
any origin with no user interaction in seven days, and spaced repetition
schedules intervals well past that. Home-screen web apps are exempt. That is why
`src/public/manifest.webmanifest` and a registered service worker exist.

## 3. A course is data, not code

```
courses/<id>/
  course.yaml            metadata, theme, state, audit ceilings, valueStyles, styles, syntax, retention
  concepts/<key>.yaml    one file per recurring concept, plus confusable_with
  categories/<key>.yaml  one file per declared category: name, boundary, siblings
  drills/<key>.yaml      the retention pool: many items per concept
  sections/NN-slug/
    _section.yaml        title + blurb + primer prequestions
    N-slug.yaml          one subsection: blocks (each with a tier) + quiz
  materials/             study artefacts (§1); problems.md and checklist.md are generated
```

Ids are positional, derived from filename prefixes (`03-…` → `s3`, its second
file → `s3-2`), so authors never write them. Files are YAML or JSON.


**Subject-specific behaviour is configuration**: `valueStyles` (cell colouring),
`styles` (CSS), and `syntax` (comment marker, keywords, regex patterns) drive
highlighting for any language without code. `courses/<id>/blocks.js` remains
supported for a genuinely bespoke renderer; no course currently needs one, and
the build prints `no code` when a subject is pure data.

## 3a. Authoring is many small units, not one long conversation

`tools/author.mjs` plans and drives course generation. It exists because the
obvious approach is quadratic: authoring a course in a single conversation
resends every earlier answer with every new request, so ma26600's ~190 units
cost ~21M input tokens. The same work as independent per-unit calls costs
~1.0M — measured by `npm run author -- plan ma26600 --fresh`.

Three decisions get that factor of twenty:

| | |
|---|---|
| **One call per unit** | A unit is one subsection's spine, one concept file, one drill bank. Nothing carries over between units, so input is linear in the work rather than quadratic. |
| **The spec is sliced** | `tools/lib/spec.mjs` addresses `create_course.md`, `writing.md` and `material_truth.md` by heading. A phase names the headings it needs — writing a drill bank does not pay for §10's figure rules, and only the two phases that write prose carry `writing.md`. The three files are ~15k tokens together; the largest phase prefix is a fraction of that. |
| **Prior work arrives as a digest** | `tools/lib/digest.mjs` reduces a course to which term is defined where, which rules are stated, which concepts are cited. On ma26600 that is 857 tokens standing in for 85,552 of prose — and it is what non-redundancy (M2) actually asks, since M2 is a claim about *what* is covered, not how it was worded. |

Each phase's prefix is byte-identical across its units, so it is one cache
write and then cache reads for the rest of the phase.

**Interruption is free by construction.** The course folder is the state:
`digest()` recovers what exists by walking it, and `.author/<id>.json` records
only finished unit ids. Resuming costs one directory walk, not a replayed
transcript — which matters because a long conversation is cheap only while its
cache is warm, and an interruption is exactly what goes cold.

The phase table in `author.mjs` is the single place that says what a phase
needs; `create_course.md` §3 remains the description of what a phase *is*.

**Taxonomy is a phase, and it runs before the spine.** A block can only tag into
a taxonomy that already exists, and one derived after the fact fragments —
`invoke-labels` invented beside an existing `invocation-labels`. It is numbered
9 and ordered third, because a phase id is a ledger key and renumbering the five
phases below it would orphan every `.author/<id>.json` mid-course; the numbering
is historical for the same reason the truth files' is.

`digest.mjs` carries the declared categories and their boundaries for the same
reason it carries which term is defined where: it is what stops the next unit
inventing a near-duplicate. It also reports a subsection's unclaimed fraction,
so a later pass can see which blocks still state nothing when closed without
reading their prose back.

Adding §5a, §6.6 and material_truth §10 to the spine phase took its prefix from
9,895 to 12,600 tokens, which is one cache write per phase and cache reads after
it. The spine phase has been the largest for some time; the "~4.3k largest
prefix" figure above predates the prose and figure rules riding along with it.

## 3b. Code structure

Preact + Vite. `vite-plugin-singlefile` inlines the bundle into one
self-contained `index.html`, so the `file://` double-click property survives a
real toolchain.

| area | files |
|---|---|
| entry | `src/main.jsx` (storage init, then render), `src/app.jsx` (routing, layout, keyboard) |
| course intake | `src/lib/library.js` (the only way to reach a course), `parse.js` (files → course), `math.js` (TeX at read time), `courses.js` (imported courses), `order.js` (the shelf's order, the reader's), `prefs.js` (the three settings that follow the reader between devices), `purge.js` (erasing one, answers included) |
| components | one per UI element: Sidebar, Topbar, Library, CourseHome, Section, MarginNote, Quiz, Concepts, Practice, DepMap, SearchOverlay, ReturnPill, Icon, HueSelect, and for the two loops: LaneSelect, TierStub, Attempt, WhyField, Drill, DrillRun, Review, Calibration, StateStrip, ConceptState, Prequestion |
| logic | `src/lib/`: util, state, index, search, nav, place, refs, figures, concepts, and for Loop B: schedule, retention, queue, drills, tiers, log, why, calibrate, context — pure functions, no DOM, with `place.js` the second exception below since a reading position is a fact about the document; `theme.js` is the one exception, since applying a course's accent means writing `--hue` onto `document.documentElement` itself, and `PageContext.jsx` is the component that writes what `context.js` builds |
| blocks | `src/blocks/index.js` — registry plus generic types |
| figures | `src/figures/<kind>.js` |
| styles | `src/css/NN-<element>.css`, imported in order by `main.jsx` |

**Blocks and figures stay string renderers** rather than components. Course
content is authored as raw HTML in the data files, so a component renderer
would inject it unescaped anyway; keeping them as `data -> HTML` functions is
what makes the registry a trivial extension point for a new subject.

`renderBlock(b, env)` takes a small render environment alongside the block —
currently just `fignum`, the figure's section-scoped number from
`src/lib/figures.js`. A renderer cannot compute that number from its own data,
since it depends on the blocks around it, so `Section.jsx` looks it up once
from `buildIndex`'s `FIG.numOf` and passes it down rather than have every
figure walk its own section to find out where it sits.

Only one delegated listener remains, on the content container, because links
inside injected course HTML cannot carry component handlers. Everything else —
quiz prediction and grading, practice stepping, search, hover pairing — is
local component state.

## 3c. Two loops

The site runs two learning loops over the same material. They share nothing but
the content, and mixing them is the error the design exists to prevent.

| | **Loop A — comprehension** | **Loop B — retention** |
|---|---|---|
| Question | Can I derive this on the spot? | Do I still hold this in six weeks? |
| Pool | the subsection quiz | `drills/<key>.yaml` |
| Item rule | one per type, no repeats | many per concept, no type constraint |
| Unit of state | subsection, keyed by `type` | concept, keyed by `key` |
| Mastery | every type cleared once | 3 correct on 3 distinct items, then 3 relearn sessions on 3 days |
| Surface | inline at the end of a subsection | `#/review`, `#/<c>/practice` |
| Code | `src/lib/state.js` | `src/lib/retention.js`, `schedule.js`, `queue.js`, `drills.js` |

One seam joins them and it runs one way: a **confident miss** in Loop A recruits
that concept into Loop B at a short interval and drills it before the reader
leaves the section. A Loop B success never marks a Loop A type cleared.
Surfacing a confident error is diagnosis; re-testing after the correction is
treatment, and feedback alone lets the error come back.

**Everything degrades when a course has not migrated.** A block with no `tier:`
is spine. A course with no `drills/` folder has no Loop B at all: no review
pill, no due counts, no drill entry, and `problems.md` and `checklist.md` stay
hand-written. Without that rule the six existing courses would break the day the
scheduler landed, and the content migration would have to finish before anything
was usable.

**The scheduler** (`src/lib/schedule.js`) is difficulty–stability–retrievability,
wrapping `ts-fsrs`. It answers the one question an ease factor cannot: what is
the probability this reader recalls this concept right now. Target retention is
per course, and an exam date in `materials/expectations.md` front matter turns
the schedule around to aim at it — no interval steps over an exam, so "predicted
recall on the day" is a number the reader has actually been asked for.

## 3d. Tiers and the lane

Every block declares a tier, defaulting to `spine`.

| Tier | Holds | Test |
|---|---|---|
| `spine` | definition, rule, mechanism, one canonical instance | removing it breaks the argument |
| `depth` | derivations, caveats, why-it-is-true, rationale | it answers "why" or "what if", not "what" |
| `apply` | instance two, three, four | it teaches nothing new; it builds fluency |

**The spine alone is a complete course.** Depth and apply may lean on the spine;
the spine may never lean on them. `validate.mjs` enforces the half of that which
is mechanical: a spine block may not cite a figure that only a collapsed tier
declares — the first mechanical check the completeness constraint has ever had.

A lane selector at the head of the section picks `Spine`, `Spine + Apply` or
`All`, persists per course, and is bound to `1` `2` `3`. It defaults to
`Spine + Apply`, because a first read without worked instances is the wrong
trade for a novice and the fast pass is one key away. Collapsed runs leave a
one-line stub carrying a count, so a skipped tier is visible rather than an
invisible hole; consecutive hidden blocks merge into one stub, and the
references inside them demote to chips on the stub line, because a margin card
anchored to a one-line row is a hole by construction.

## 3e. What the browser's assistant is told

`docs/ai-integration.md` records the decision and the evidence. In short: no
on-device model ships, because the Prompt API is Chrome-only over three vendors'
objections and Safari exposes nothing to page script. What ships instead is a
per-view context record — `src/lib/context.js` builds it, `PageContext.jsx`
writes it into `<head>` as JSON-LD — so that an assistant invoked from the
right-click menu answers from the course's own words rather than its own memory
of the subject.

One rule decides its contents: **course content in, reader content and
unattempted answers out.** Three properties of the site already helped: only one
section is ever in the document, a collapsed tier is not rendered at all, and a
quiz body only mounts after the reader commits. Learner content carries
`data-nosnippet` wherever it renders, and the privacy fact is stated once on the
calibration page rather than as a banner — `.cal-priv` in `SyncPanel.jsx`, and
`tools/test-ui.mjs` asserts it is there.

Sync changed what that statement has to say. It used to be short, because
nothing left the device. Now the answer log does, so the note names what is in
it — item, time, confidence, outcome, latency — and what is not: written notes
and typed reasons stay local, and schedules are recomputed from the log rather
than transmitted.

## 3h. Depth is a second axis, orthogonal to the tier

The lane filters blocks *out* of the document by tier. Depth closes the prose
*inside* each block that survives. They answer different questions and neither
can stand in for the other, which a measurement settles rather than an argument:

| | blocks | spine | what `Spine` mode hides |
|---|---|---|---|
| resume | 867 | 860 | **0.8%** |
| ma26600 | 330 | 264 | 20.0% |
| demo | 97 | 72 | 25.8% |

A course whose blocks are 99% spine has nothing for the lane to remove, and the
prose the lane cannot touch is four fifths of the text. M25 is what closes the
obvious escape — nothing examinable may live in `depth` — so on an exam-facing
course the maximum legal compression by tiering is approximately zero. The
overview had to come from a different axis.

**Three depths, and none of them removes anything.** `full` is the block
entire; `notes` is its claim with the development closed; `index` is its name
with the claim closed too. Every closed block opens in place, so a depth is the
same course at a different resolution rather than a subset of it — which is
what keeps T12 satisfied, since a thing that expands where it stands has not
moved away from its mention.

**The claim is authored, not extracted.** Two fields, and a block declares one:
`core:` holds the block's opening claim with `h:` carrying only its development
(nothing duplicated), and `gist:` is a summary rendered only when closed, for
prose that must withhold its claim on the first read. The field name is the
declaration; a mode flag beside it would be a second record of one choice.

Extraction was tried first and measured. Running `pretrain.js`'s existing
first-sentence rule over every assertion block yields an unusable result — one
that ends on a colon or semicolon, or runs under eight words — on **55% of
resume's 716** and **33% of ma26600's 174**. The two courses fail differently
and the difference is the point: ma26600's definitional prose is claim-first by
nature ("An equation relating an unknown function to one or more of its
derivatives"), while resume's narrative prose buries the claim on purpose ("The
split trap" opens "The camera captures frames continuously"). A derived claim is
therefore a guess about prose shape, and the authored field costs nothing extra
in tokens — the same words, split at a declared point.

**`gist:` is measured because it is the easier one.** A summary needs no prose
discipline and a `core:` obliges the block to open with its claim, so a model
left to choose drifts to `gist:` and the duplication returns. `audit-content.mjs`
counts it as a fraction against a per-course ceiling, exactly as it counts
`unsourced`.

**What the depths are worth, honestly.** Instructor-provided outlining raises
memory (g = 0.61) and does not reliably raise comprehension (g = 0.34, n.s.;
Ponce, Mayer & Méndez 2023). So `full` is the default, the closed views state in
words how much they are holding back, and nothing in the interface suggests that
`notes` is a way to read a section for the first time.

Per-kind behaviour is a registry property beside `apart`, so a course's own
`blocks.js` declares how its renderer behaves at depth without the engine
knowing anything about it. A declarative `figure` and a `math` block stay open
at `notes` — a plot is already the compact form and flattening it to a caption
is the one summary that loses information — while `table` and `image` fall to
their caption and `p` disappears entirely, because a `p` carries no claim.

**Notes are grouped, not listed.** The first build of this rendered every block
as one row of name-then-sentence, which is precisely the note form the evidence
names as the weak baseline: students record "in a linear list-like fashion that
also obscures text relationships", and displays that position related ideas close
together beat both the running text and the outline on relational learning
(Robinson & Kiewra 1995; Kiewra et al. 1999, *Supplementing floundering text with
adjunct displays*). So a definition opens a topic, the rules and traps that
develop it sit indented under it against a hairline, and the grouping is derived
from the order M10 already fixes rather than authored. A `table` marked
`notes: open` stays whole for the same reason — a compare-and-contrast matrix
*is* the compact form, and flattening it to a caption throws away the only thing
it was for.

**A claim cannot stand in for a list.** The first version of the claim field
promoted every kind of block: write a `core:` and the block closed behind it.
That is right for prose, where what closes is the argument, and wrong for a
`list`, a `table` or a listing, where the items *are* the content and the claim
is a caption. The reader got "four places a course can take you" with the four
places closed — a title, presented as a note, which is worse than a title
presented as a title because they believe they have read it. Block kinds now
declare `holds: "prose" | "structure"`, and a claim on a structure opens it
rather than replacing it. The residual case — prose with a list buried in its
own body — is a judgement the engine cannot make, so `validate.mjs` warns and
names the two fixes.

**The chrome had eaten the page.** Measured on the rendered index view before the
pass: 27 elements at 9.3px in capitals (the engine's word for each block type),
26 more at 9.6px, 28 at 9.9px, and the block names — the actual content — at
13.1px, against a 17px body. Across the stylesheets the most-used font size was
`.66rem`, 10.6px, with roughly eighty declarations under 12px. A label nobody can
read is not a quieter label; the eye stops to decode it. There is now a three-step
scale with a floor (`--fs-micro` 12px, `--fs-meta` 13px, `--fs-small` 14px), 135
declarations were lifted onto it, the block-type column was deleted outright, and
the rendered minimum on that view went from 9.3px to 12px with capitalised
elements down from 66 to 4.

**Defaults that were printed on every block are gone.** A `def` with a `term:`
and a `key` with a `core:` no longer render the engine's own word above
themselves — "Definition" and "Key rule" repeated on every block of a course is
the density at which signalling stops signalling (T13), and the accent, the term
and the claim already carry it. The quiz's explanation of what a quiz is now
appears on the first subsection of a course instead of all fourteen.

**Blocks became addressable to make this reachable.** `s57-1~3`, positional like
every other id, with `~` rather than `#` because the router splits a hash on
`/`. That is what lets a search hit land on the thing rather than on the
thousand-word page holding it, and it is what the block-grain search entries
point at.

## 3i. Categories: grouping by membership

Every grouping the engine had was positional (a section), argumentative (a
tier) or referential (a concept mention). None of them is *membership*: nothing
could say "these six things are all X, and X is not Y". Position is also the
wrong index for recall — a reader remembers what kind of thing they are looking
for long after they have forgotten which subsection it sat in.

`cat:` is the principal tag, one per block or concept, and it must name a
`categories/<key>.yaml`. `tags:` are secondary, plural and free-form. They are
two fields because they serve two stages: a category answers "what kind is this,
and what is it not", carries a boundary and named siblings, and gets a page; a
tag answers "where else would I look for this" and gets a facet.

`boundary:` and `siblings:` are required rather than decorative. A category page
lays its members out together, which is a case comparison (d = 0.50 against
sequential or single cases; Alfieri, Nokes-Malach & Schunn 2013), and the
siblings are what make the boundary visible instead of merely asserted. They
must name each other for the reason `confusable_with` must.

Scope stops at blocks and concepts. A drill item's category is its concept's,
derived because the item already names the concept (M27) — which is what lets a
category page offer practice without a second authored field. A quiz item has
none: `type` is already its identity (M9).

**The visual key is text and position, never a hue.** A two-or-three character
monogram, the same everywhere the category appears, plus grouping on the
category's own page. A hue per category would multiply `audit-color.mjs`'s
sweep — every course, every view, three colour modes — to decorate what the name
already says. Chips render at `notes` and `index` and not at `full`, because
signalling is a contrast effect and a chip on every block during a reading pass
is wallpaper (T13).

**Tables joined the figures.** A `table` is now numbered and citable by `id:`,
so `<f k="…"/>` renders "Table 3.1". The justification was always general — a
caption that cannot be cited is one the prose has to describe again in words,
which is M1 violated by the engine rather than by the author — and `table` had
simply never been brought under it. Two counters rather than one, because
inserting a table above a figure should not renumber the figure.

## 3f. Search is an index, not a scan

`src/lib/search.js` holds an inverted index — token to the entries containing
it, with a count — built once per course and queried in time proportional to
how rare the query is rather than to how long the course is. It replaced a scan
of every entry's whole text with `indexOf`, once per query word, on every
keystroke: roughly a megabyte of string matching per character typed on the
62-section course, for a ranking that could not tell a subsection which says
"Laplace" forty times from one that says it once. A hit scored 4 and its
position scored at most 3; term frequency was never counted at all.

Ranking is BM25, because it answers the question the old scorer could not: how
much does this entry have to say about this word. It rewards repetition with
diminishing returns, discounts words that are everywhere, and normalises for
length so a long subsection cannot win by being long. Four decisions around it
are what make the answers right rather than merely ordered:

| | |
|---|---|
| **Two fields, one of them a name** | A title match is far stronger evidence than one word out of two thousand, so titles are scored separately and weighted up. And a title is *matched*, not approximated: the stem expansion below reaches the body only. Without that floor, "integrals" sitting in a title beat "integrating factor" said eighteen times in the text. A subsection's own title is part of its body text anyway, so a genuine relative is still found — at the weight a guess deserves. |
| **Prefix ranges, not a stemmer** | A course is a mix of English, symbols and notation, and a stemmer trained on none of it turns "series" into "seri". A binary search over the sorted vocabulary gives both directions for free: the query reaches every word it starts, and — through a shortened stem of its own — the words that start it, which is the "metastability finds metastable" case a prefix alone cannot reach. |
| **The best token wins, not the sum** | One query word is one piece of evidence, however many spellings of it an entry happens to hold. Adding the expansion up turned "integrating factor" into a contest nothing about integrating factors could win: an entry holding "integral", "integrals", "integrate" and "integration" collected four discounted scores and beat the one that says the phrase itself. |
| **Coverage before score** | Entries matching every query word are ranked among themselves; score alone would let one word of three outrank all three. When nothing matches everything, the best available coverage is shown rather than nothing. |

**Block entries index a name, not a body.** A hit should land on the rule or the
table rather than on the subsection holding it, so every named block is its own
entry with its label as the title field — which the existing 4.2x title weight
then ranks correctly with no tuning. What they do *not* carry is their prose:
the subsection entry above already holds every word of every block, so indexing
them twice would double the index to answer a question the first copy answers.
The split is the engine's own two-field logic lifted one level — a block entry
says what a thing is *called*, a subsection entry says where a subject is
*discussed*. A `table` is the exception and carries its cells, because a table
is looked up by what is inside it.

**Two search surfaces, deliberately.** The overlay is unchanged: one input, one
list, opening on `/`, answering "take me there". `#/<c>/explore` answers the
other question — "show me everything of this kind" — and needs facets, a URL
and the ability to return a category with no query at all. Facets are applied
inside `searchRun` rather than to the array handed in, because the index is
cached against that array's identity and filtering first would rebuild it on
every keystroke.

**Positions are not stored.** They are only needed to draw a snippet, and a
snippet is only drawn for the two dozen entries about to be shown — so keeping
them would multiply the index by the number of word occurrences in the course
to save one regex pass over 24 documents. Those positions also decide *which*
passage is quoted: the window carrying the most of the query at once, rather
than the first mention, because "does this word appear here" was already
answered by the row existing. The matches are returned as runs of
`{text, hit}` rather than as marked-up HTML, since the material is authored as
raw HTML and a highlighted string this module assembled would have to be
injected unescaped somewhere.

The index costs a course-sized pass over its text, so `app.jsx` builds it in an
idle callback while the reader reads rather than in front of the first
keystroke, and the entries keep the case they were written in — lowercasing for
the index used to reach the snippet too, quoting the course's own prose back in
a case it was never written in.

## 3g. A reading position is an anchor, not an offset

`src/lib/place.js`. Two failures had one cause.

**Coming back to the app.** iOS discards a home-screen web app's view when the
reader switches away and relaunches it at the manifest's `start_url`, which
carries no hash. A session three screens into §4 came back to the library, and
the browser's own scroll restoration cannot help — the route is gone, so there
is no document to restore a position within. The place is therefore written on
every pause in scrolling and forced to disk on `visibilitychange`, and adopted
with `replaceState` *before* the first render, so the router sees a route
rather than a redirect. It is only adopted when nothing was asked for: a reader
who typed a URL asked for that one. It is dropped if the course has since been
removed, which is also what keeps the two reserved routes out of it.

**Changing the width.** Rotating a phone, dragging a window narrower, tucking
the sidebar or changing the content zoom re-wraps every line above the reader.
The offset is untouched and therefore points somewhere else — measured at
2171px, most of three screens, on a deep scroll crossing the sidebar
breakpoint. Height-only resizes are ignored on purpose: those are the phone's
address bar and the on-screen keyboard, which the browser already handles and
which re-pinning would fight.

Both are answered by storing *which subsection* and *how far into it*, a pair
that is invariant under a reflow changing every height above it. The subsection
is the finest thing on the page carrying a stable id, and it is the same
granularity the return pill already lands on, for the same reason — so `land`
is now shared between them rather than living in `app.jsx`. It re-applies while
the layout arrives and stops the moment the reader takes hold of the page,
because correcting a page somebody is already scrolling is worse than landing a
little short.

## 4. Visual / UX

**Typography.** IBM Plex Serif for body, IBM Plex Mono for display, labels and
data. Plex was drawn for technical documentation; a serif body suits sustained
reading, and the pairing is the deliberate opposite of a system-sans stack.
Faces are bundled from `@fontsource` and inlined, so nothing is fetched at
runtime — the page still opens from `file://`. This costs ~230KB.

**Measure.** 600px at 17px is 66 characters per line, the researched optimum.
Changing the body face changes the measure, so it is re-measured after any type
change rather than assumed.

**Case.** Uppercase marks a label and nothing longer (T41). Six places were
setting sentences in it: figure and table captions, the quiz answer, the type
badge, the course `meta` line, and the `why_prompt` — the reader's own question,
which is the field carrying the largest transfer effect the site has. They keep
the mono face, the accent and the spacing that made them read as chrome; only
the shouting went. Buttons, block labels, eyebrows and tier badges are one or
two fixed words and keep their caps.

**No section mark.** The engine wrote `§` in front of every section number — in
the breadcrumb, margin keys, "builds on" chips, concept lists, the primer and
the generated checklist. It is a legal-citation mark that a reader has to learn
before it means anything, and the number alone is already unambiguous in every
one of those places: the sidebar rail has always shown `01 Title` with no
symbol, so the chrome now matches it. Where the number is read inside a sentence
rather than scanned as an identifier — "Before section 1", "Start section 1" —
it is the word, because a bare numeral mid-sentence reads as part of the title
next to it. Authored course prose still uses `§` in about two thousand places;
that is the author's writing, not the app's chrome, and "as shown in §4.2" is a
sentence rather than a label.

**Spacing.** Vertical rhythm runs on a four-step scale, `--sp-1`..`--sp-4`, in
rem so it tracks the reader's text size along with the measure. A uniform
margin made a definition, an aside and a table all read as the same beat,
which is the one thing spacing exists to signal, so the gap before a block is
what says how big a break it is.

**Rail.** The section number carries its own state — weight, colour and an edge
bar — and no glyph sits beside it. A 26x18px signal-pulse marker used to, and at
that size it read as a stray rectangle rather than as a signal: a device that is
only half legible is worse than none.

**Narrow screens are one mode, not several.** Below 64em the sidebar becomes a
drawer, and that same line is where the toolbar sheds its secondary controls
into it: reading needs the material, navigation and search, while a theme is
set once and a reset is rare and destructive — it has no business sitting a
thumb-width from `Menu`. `CourseActions` is defined once and mounted in both
places, and CSS shows exactly one, so only one is ever in the accessibility
tree. The bar went from 142px on a phone, 21% of the viewport and permanently
sticky, to 61px.

Two defects were underneath that. The toolbar declared that the breadcrumb
"yields first", and then set `flex-wrap:wrap` — a wrapping flex container wraps
*before* it shrinks, so the crumb never yielded and the bar was two rows on
every laptop below 1425px, 1280 and 1366 included. It is `nowrap` now, with the
crumb shrinking to an ellipsis, and nothing can be pushed off-screen because
the crumb absorbs the whole deficit before any control moves. And the offset a
scrolled-to heading uses to clear the bar was a bare `60px` in another
stylesheet while the bar was 142px tall, so every subsection arrived hidden
underneath it; it is `--scroll-clear`, declared beside the bar it has to clear.

**Touch targets are keyed to the pointer, not the width.** A phone in landscape
is wider than a small laptop window and a narrowed laptop window still has a
mouse on it, so `pointer:coarse` is the question actually being asked — and it
is what makes the desktop view untouched by construction, since a mouse never
matches. The confidence buttons were 44x21px, and there are sixty of them on a
section: every question starts by tapping one. Links that carry their underline
as a `border-bottom` are grown with a pseudo-element hit expander rather than a
`min-height`, which would leave the rule floating below its own text. Inline
links inside a sentence are left alone, as WCAG 2.5.8 exempts them.

**Collapsing navigation** (`\`, or the control on the sidebar's inner edge)
hides the sidebar and keeps the
margin cards. A slim tab at the sidebar's own edge brings it back. It was tried
in the toolbar, beside the control that hides it, and put back: in the bar's
flow it pushed the breadcrumb 108px off the reading column's left edge, and out
of the flow it floated unattached in the gutter, which read worse than the tab
it replaced. An earlier "read mode" hid both, which was wrong: the cards put a
reference beside the mention that needs it (spatial contiguity), so removing
them removes a benefit. The sidebar is navigation chrome and contributes
nothing while reading, so that is what collapses.

**Motion.** Route changes ease to the top rather than teleporting, and content
fades in over 220ms, so a new section reads as arriving rather than as the page
blinking. Both are disabled under `prefers-reduced-motion`.

**Zoom.** `Ctrl +`, `-` and `0` are intercepted and applied to the reading
column alone (`.wrap{zoom:var(--zoom)}`), because page zoom magnifies the
sidebar and the toolbar too and leaves the column no wider than it started. At
either end of the scale the key falls through to the browser, so page zoom is
still reachable rather than swallowed. The current level shows in the toolbar
only when it is off its default, and clicking it resets.

**Keyboard.** `\` collapses the sidebar, `[` and `]` page between sections,
`Ctrl +/-/0` zoom the reading column, `1` `2` `3` set the lane and `r` opens
review. A skip link, hidden until focused, jumps straight to the content
so a keyboard reader is not made to tab through the sidebar rail to reach the
material. The search overlay's results are a listbox (`role="listbox"`,
`aria-activedescendant`) driven by arrow keys and Enter from the input, for the
same reason: a hit should not require tabbing through every row above it.

**Colour.** The four accent tokens are OKLCH, parameterised by one angle,
`--hue`, plus a fixed base hue per token (`--h-hi`/`--h-lo`/`--h-dc`/`--h-hz`).
Lightness and chroma are fixed, so rotating `--hue` moves every accent around
the wheel together without moving a contrast ratio — that is what lets a
course declare `theme.hue` in `course.yaml` and get its own accent for free.
A custom property resolves its `var()` references where it is *declared*, not
where it is read, so setting `--hue` deeper in the tree cannot re-tint tokens
the palette declared on `:root`; the palette selector is therefore
`:root,[data-hue]`, so anything wanting its own rotation — a library card, a
swatch in the settings panel — re-declares the palette against its own angle.
Ground, ink and rule tokens stay global, so a rotation moves the accent and
nothing else. `theme.hue` is the course's colour and not the last word on it:
`src/lib/theme.js` keeps a per-course override (`hue:<cid>`) that
the reader sets from **Settings → Appearance**, and since every option is a
rotation of the one palette, no choice can produce a pair the contrast sweep
has not already covered. It is never written into the course, and it is purged
with it. It is one of the three settings that belong to the shelf rather than
to a device, so it travels with the backup where there is one —
`src/lib/prefs.js`, latest write wins per key.

A fifth accent, `--wn`, is the exception that proves the rule: it is warm, it is
what a `trap` block and a missed question wear, and it does **not** rotate.
The rotation exists to tell courses apart, and a warning is not an identity —
rotating it would make "common mistake" olive in one course and teal in the
next. It also stops short of a saturated red on purpose, since red in an
achievement context measurably depresses performance.

`--un` is the one place that red *is* spent, and it does not rotate either. It
marks a claim nobody grounded — the `unverified` and `generated` badges — which
is a warning about the page rather than about the subject, and the only mark on
a study page a reader must never skim past. It is the word alone: no rule, no
indent, no icon. Measured against all four grounds in both themes, its worst
ratio is 5.1:1.

Nothing relies on colour alone. Mastery is a shape as well as a fill on a quiz
row, and a stroke pattern as well as a stroke colour on the dependency map,
with the state named in text either way (WCAG 1.4.1). Every
accent still carries a small-text **ink** variant (`--hi-ink` and friends)
that clears WCAG AA on the page ground; the vivid accents are reserved for
borders, fills and graphics. `tools/audit-color.mjs` sweeps every course
(routes from `tools/lib/routes.mjs`) plus the library, in three modes — light,
in-page dark (`data-theme`), and OS dark (`prefers-color-scheme` emulation),
because the two dark paths are separate CSS blocks and had diverged — and
fails the build below AA. It reads colours by painting them into a 1×1 canvas
rather than regex-parsing the computed string, because `getComputedStyle` now
returns `oklch()` verbatim and an rgb-shaped regex misreads it.

**The library's two dialogs.** Installing a course is behind a plus beside the
shelf heading rather than a settings slab under the cards, and removing one is
on the card of the course it removes — the object is in front of the reader
instead of named in a list they have to match to a card. Removal confirms in the
app's own dialog rather than `confirm()`, which cannot say what removal *keeps*:
learner state is keyed on the course code, so re-installing restores the
history. Both controls are always visible rather than revealed on hover, since a
touch device has no hover, and only a course this device imported carries them —
the built-in course ships with the site.

**The way back to the library is the breadcrumb's root**, not a button beside
it. The sidebar's "All courses" link is inside a drawer on a phone and gone
entirely when the sidebar is collapsed, and the library is where courses are
installed and removed, so the route out of a course cannot depend on the one
piece of chrome the reader is allowed to hide. Inside the crumb it costs no
alignment: the crumb truncates from the right, so the root survives every width
the deeper labels do not.

**Learning modules.** Pre-training exists twice: as a "Before you start" panel
on each section, and as a stepped primer at `#/<course>/primer/<section>` that
withholds each meaning until the reader tries to recall it, making it retrieval
rather than reading. Learner notes are stored per subsection in localStorage
and styled unlike course content so they never read as something the material
said.

**Dependency map.** The raw citation graph is dense and mostly implied, so a
transitive reduction (`src/lib/graph.js`) removes every edge reachable by a
longer path — 36 edges down to 20 for ECE 27000 — leaving the skeleton of what
genuinely depends on what.

Two things in the layered layout only start to matter past about twenty
sections, and both were added when a 62-section course made the map a hairball.
Layering fixes the columns but leaves the order *within* a column arbitrary, so
long edges cross short ones for no reason; the nodes in each layer are now
ordered by the barycentre of their neighbours in the adjacent layer, swept both
ways. And a node with no edge either way has no position in a dependency flow at
all — left in the columns it lands in layer 0 and stretches the canvas for
everything else, which 24 of those 62 sections did. Those are packed into a band
underneath instead. They stay drawn, clickable and ringable, because arriving at
the map from a section and not finding it is the map failing at the only
question it was asked — which is what the suite caught when they were first
dropped altogether. Following a section's "Where this sits" link
(`#/<c>/map/<section>`) passes that section as `focus`; `DepMap` rings its node
— an outer ring drawn in `figures/graph.js`, not a thicker stroke, because the
node's own stroke colour is already set inline from its mastery accent, so a
class alone cannot override it — so the reader can find the one node they came
from inside the whole shape.

**The index.** Concepts and categories used to be two adjacent rows in the
rail opening onto two grids of identical cards, both counting their members.
The distinction between them is real and stated (§3i), but nothing on either
page carried it, so the only way to learn which was which was to open both.
They are two bands of one page now — `src/components/Index.jsx`, Ideas and
Kinds — each headed by the question it answers, on a page whose lede says that
neither is position.

Ideas are alphabetical. Grouping by the section that first needs a concept was
the course's own order, and the course already has a surface for its own order:
the rail down the left of every page. An index is what you reach for when
position has failed you, so it is sorted the way an index is sorted, with the
subsections each entry appears in printed against it.

**Maths.** KaTeX runs at **build time** (`tools/lib/math.mjs`), not in the
reader's browser, and its output is deduplicated into a fragment table before it
ships (see **Weight budget**). Two things follow: roughly 280KB of KaTeX JavaScript never
enters the artefact, and a formula that does not parse fails the build rather
than rendering as red error text on a page someone is revising from. Authors
write `<m>…</m>` inline and a `math` block for display equations; `validate.mjs`
compiles every one of them.

KaTeX ships the equation twice — MathML for assistive technology, spans for the
eye — so `strip()` removes the MathML twin before flattening, or every formula
would appear doubled in the search index and in margin previews. `<math>` does
not nest, which is what makes that safe to do with a regex.

**Fonts.** Font stylesheets list woff2, woff and sometimes truetype for every
face, and the bundler inlines whatever it finds. A `woff2Only` transform in
`vite.config.js` keeps one format per face — the browser is already required to
be new enough for `oklch()`. That is worth about a megabyte: the same build was
2232KB before it and 1057KB after.

**Weight budget.** `tools/build.mjs` warns above 8MB. A single self-contained
file is what lets this open from a memory stick with no server, and the price
is that every course, image and font is inside it; the number only goes one
way, so it gets a budget rather than a hope.

The ceiling is measured. Duplicating the courses to grow the bundle and timing
from navigation to the first rendered section, in Chromium from `file://`:
1.97MB → 178ms, 3.46MB → 242ms, 6.45MB → 304ms, 12.43MB → 489ms. There is no
knee, so weight is not what a reader feels in this range and the budget exists
to catch runaway growth, not to protect load time.

**The budget is never a reason to write less**, and the build now prints both
numbers so the two cannot be confused: 3.8MB of authored course folders becomes
a 9.4MB page. KaTeX renders roughly 1.6KB of markup per formula, so a
differential-equations course with thousands of them dominates the file while
its own words are a rounding error. Deleting content would trade writing for
derived markup at a terrible rate; every remedy is on the build side.

If it binds, in order: subset fonts by the glyphs actually used (~350KB today);
parse only the active course, on demand; then raise the budget, having re-run
the timing above to show there is still no knee at the new size.

Two moves that looked attractive and were measured instead. Shipping the
payload as one JSON string parsed at boot was the first entry on this list until
it was tried: `JSON.stringify` escapes every quote in the KaTeX markup, so the
same data came out **10% larger** (12.30MB against 11.23MB) and **2.6x slower
to boot** (103ms against 40ms). The claim that JSON parses faster is true of
data-shaped payloads and false of this one. And dropping KaTeX's MathML twin
buys about 19% at the cost of making every equation opaque to a screen reader —
deduplicating fragments saved as much for nothing (below).

One file per course is not on the list: it would make adding a subject a
question about the build rather than about the material, which is the property
T19 exists to protect.

**One copy of each rendered formula.** `tools/lib/mathtable.mjs` replaces every
occurrence of a rendered fragment with a reference into a table of the distinct
ones, and the emitted module splices them back before it exports anything, so
nothing downstream — the app, the search index, the context record — ever sees
a reference. Across the eight courses that is 5771 occurrences against 3533
distinct: the bundle went from 11.23MB to 9.31MB and boot from 40ms to 38ms,
smaller *and* marginally faster, because the engine parses two megabytes less
source than the expansion costs it. Both halves live in one file because they
must agree on one marker forever, and `dedupe` expands every string it rewrites
back and compares, so a drift cannot reach a build.

**Per-course code.** A course may ship `blocks.js` to register a renderer the
built-ins cannot express, and `styles` in its `course.yaml` to style it. ECE
20001 uses both for a `schematic` block: every built-in figure kind is about
data — plots, grids, graphs — and a schematic is about topology and symbols,
which no amount of table configuration produces. Only one course's styles are
in the document at a time; they used to be appended and never removed.

**Figures that are not drawings.** A `flow` figure is an `<ol>` with the
connectors drawn in CSS — a numbered spine down the page, or, where the figure
has room for it, a row of stages with an arrow in each gap. Arrow characters
used to be emitted between the steps, and an arrow centred in the figure could
never line up with boxes sized by their own text. Whether the row layout
engages is a **container** query on the figure, not a viewport one: how much
room a figure has depends on the sidebar and the reader's content zoom, neither
of which a viewport breakpoint can see.

**The toolbar aligns with the column beneath it.** The bar spans the full width
for its ground and its rule, but its contents are inset to the reading column's
own left edge, so the breadcrumb starts where the heading starts. They were
71px apart, which is most visible on the pages where the crumb and the `h1` are
the same word. `--wrap-max` and `--wrap-pad` are named once and used by both.

**Collapsing the sidebar centres the reading column, not the wrap.** Hiding it
frees 308px, and centring the whole wrap spent all of it on outer gutter: the
text slid 130px left of where it had just been and the page carried 225px of
nothing on each side. The measure cannot absorb the difference — 37.5rem
measures 63 characters per line and 42rem reaches 70, which is further from the
66 T7 targets, not closer — so the column is centred in the viewport and the
rail hangs in the margin beside it, which lands the text within a few pixels of
where it was before the tuck. The tuck is also now ignored below the drawer
breakpoint: it removes the sidebar from the document, and there the sidebar
*is* the navigation, so the preference used to leave a Menu button that opened
nothing and no way back.

**A figure that scrolls says so.** A wide figure is a scroll container, and it
used to be cut off at its border mid-arrow with only the caption to say why.
Two `background-attachment:local` layers ride the content and slide away as it
scrolls, uncovering fixed shading underneath — so the shadow appears on exactly
the edge that is hiding something, on neither edge when nothing is, and no
script measures anything.

**A chart's left margin is derived from its tick labels.** It was a fixed 56px,
which fits a short label and nothing else: on any chart reaching four figures
the ticks format as `2.0e+4` and the rotated axis title was drawn straight
through them. Tick labels are monospaced, the one case where a text width
follows from a character count rather than needing to be measured, so the
margin is computed instead of guessed and a chart with short labels keeps its
plotting area. The same pass brought `plot` onto the same margin as the other
kinds, 4px apart for no reason, and gave `scatter` the x-axis values it was the
only kind to draw an axis rule without.

**Margin card size is a layout constraint, not a style.** A reading row is as
tall as the taller of the block and the card beside it — that is what keeps a
card level with what it annotates, and the cost is that an oversized card
leaves a hole in the reading column. Previews are therefore clipped to about
two lines, at most two references render as cards (the rest become a compact
chip list, still adjacent, still satisfying T12), and "used later in" caps its
list. Measured across the six courses this took the worst hole from 966px to
308px and the average from 114px to 93px, across 7% of rows.

**Which row a card is anchored to is part of that constraint.** A card can only
be absorbed by a block at least as tall as itself, so a card anchored to a
one-line row is a hole by construction. "Used later in" is subsection metadata
rather than a mention, so it rides the subsection's first block instead of its
heading, and where that block already carries reference cards it renders as
chips — reference cards are required to sit beside their mention and this one is
not, so it yields the height rather than the row. Together those took the void
from 5627px across 63 rows to 3995px across 49. The residual is inherent: exact
alignment and a gapless column cannot both hold.

**Reading rows.** A row owns its leading gap; the block inside it owns none.
The margin card and the block it annotates only line up if they start at the
same y, and a block carrying its own top margin pushes its own text down while
the card beside it stays put. The row's gap is chosen by what the row contains
(`:has`), which is what keeps the spacing rhythm while making the alignment
exact.

Sidebar nav, a reading column of `--measure` (37.5rem) and a **margin rail** of
`--margin-rail` (16.375rem) carrying references. Both are rem, so the geometry
holds at whatever text size the reader has set. Content sits in typed blocks.

A concept mention is an anchor, not decorated text: `decorate` rewrites
`<c k="…">` into a link to that concept's entry, so the dashed underline and
the pointer cursor lead somewhere. The return stack builds its entry from the
**origin**, never by chopping the target hash — a two-segment target like
`c/<key>` lost its prefix that way and produced a route that resolved to
nothing.

**References are spatially contiguous** — every cross-reference and concept
mention renders a card in the margin beside the block that mentions it. This
follows the spatial contiguity principle: learners integrate related material
better when it sits adjacent, which a list at the end of a section is not.

Each section opens with **"Builds on"**; each subsection carries a **"used
later in"** card beside its first block. Below 1215px the rail collapses and
cards wrap.

## 5. Visual representations

One block type, `figure`, with a declarative spec per kind: `graph` (auto-layout
circle/row/layered/manual), `plot`, `flow`, `grid` (labelled grids with
highlighted groups), `timing`, `matrix`, `svg` (escape hatch). Colours come from
CSS tokens, so figures follow light/dark automatically.

Figures and images are numbered per section by `src/lib/figures.js`
(`numberFigures`), scoped to the section rather than the whole course so
inserting one figure renumbers a section, not the book. A figure earns a
citable key by declaring `id:`; prose then writes `<f k="that-id"/>` and
`refs.js`'s `decorate` substitutes the number and a link, the same mechanism
`<a href="#s4-2">` and `<c k="…">` already use for cross-links and concepts.
`validate.mjs` checks that every `<f k="…">` resolves to a declared id and
that ids are unique within a course.

KaTeX remains planned for MA 26600, ECE 20001 and ECE 20007, inlined only where
it earns its weight.

## 6. Accuracy policy

`syllabus.md` and `expectations.md` are grounded against the institution's official
catalog and course pages, not memory. Anything unverifiable is flagged in-file.
Grading percentages vary by term and are left blank for the student to fill in.

## 7. Verification

- `tools/validate.mjs` reads the **source folder**, so failures name a file:
  concept references resolve, cross-links resolve, figure references resolve
  to a declared `id` and those ids are unique within a course, every
  subsection has a quiz, no repeated question types, every block type and
  figure kind is renderable, and every `plot` series function compiles and
  yields a finite point. Two cross-course collisions are checked here because
  the filesystem does not prevent them the way it prevents duplicate folder
  names: a shared `code` fails the build, since learner state is keyed on it
  and a duplicate silently merges two courses' quiz history; a shared
  `theme.hue` warns, since it makes two courses indistinguishable in the
  library. `tools/new-course.mjs` picks the angle furthest from the ones
  already taken, so a scaffolded course never starts out colliding.

  The review set is checked in both directions, because it is one decision kept
  in two places and two records of one decision drift. A concept marked
  `review: true` with no `drills/<key>.yaml` fails; a drill file whose concept is
  not marked warns; a non-empty review set whose `expectations.md` states no
  `review.basis` fails. A reviewed concept the exam can test whose every `<c k>`
  mention sits in a collapsed tier warns — the citation graph is as close to
  M25's "spine coverage" as the data gets, since a concept's definition site is
  prose rather than an id.
- `tools/test-ui.mjs` runs the built page in **Chromium via Playwright**, every
  check against every course it can install: view isolation, return stack,
  hover pairing, search including arrow-key navigation, ranking and body
  mentions, practice, the map including its focus ring, concept grouping,
  figure numbering, the skip link, library width and card accents, theme
  repaint, and that every figure draws a non-empty body. Three assert what a
  reader loses silently rather than visibly: that a change of width holds the
  anchor while the offset moves under it, that reopening with no route resumes
  the one the app was closed on and at the place it was closed at, and that a
  graded question stops taking answers — pressing "Got it" five times used to
  write five rows into the log and multiply the interval by the ease factor
  each time. `--shots` writes
  screenshots to `.shots/`.
- `tools/check-template.mjs` scaffolds a throwaway course, builds, validates and
  tests it, then deletes it — so "no code required" is proven each run.
- `tools/test-schedule.mjs` checks the parts a browser cannot reach without
  waiting three days: a success never shortens an interval and a miss never
  lengthens one, recall on the scheduled day sits at target, deadline mode never
  steps over an exam, three correct answers to one item do not meet the
  criterion, and durable is unreachable in under three calendar days.
- `tools/gen-materials.mjs --check` regenerates `problems.md` and
  `checklist.md` from the data and fails if either has been edited by hand.
- `tools/audit-content.mjs` reports what the structural gates cannot see: four
  fractions per course — claims with no `source:` (or one that is `unverified`
  or `generated`, which are confessions rather than origins), answers with no
  `verified:` date, questions with no `why_prompt`, and questions that resolve
  to no concept. Structure is checked everywhere; a confident, well-formatted,
  wrong explanation fails no other gate, and the reader cannot tell because
  everything else on the page has been verified to a high standard.

  Each fraction is failed against a ceiling the course declares in its own
  `course.yaml`, defaulting to 1, meaning reported and ungated. A global ceiling
  could only ever be the worst course's; a declared one is a ratchet, so a
  course that finishes a sourcing pass can never regress past what it reached.
- `tools/lint-css.mjs` fails a stylesheet that declares the same top-level
  selector twice. Four defects here came from that one shape — a correction
  appended below an existing rule, silently winning while the original became
  dead code: a sticky sidebar turned relative, a rail number that only took its
  layout on hover, a figure number that lost its centring, and a `.bmain > div`
  selector that flattened the gaps between questions.
- `tools/lib/routes.mjs` derives a course's hash routes from the course data
  itself — three sections spread across the course, a concept, practice, the
  map, a primer — rather than a hard-coded list, so the contrast sweep cannot
  silently stop covering a view the course grew since. It sweeps every course,
  because each carries its own accent rotation and a single-course sweep would
  leave five palettes ungated.

Visual layout is now verified: Chromium runs here, the suite drives a real
browser, and screenshots are reviewed. Three defects were found this way that
no headless-DOM test could have caught — tofu glyphs in the sidebar, underlined
rail links, and colliding node captions on the dependency map.
