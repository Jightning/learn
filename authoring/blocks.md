# Blocks and reader behavior

Use `p` for the running explanation: context, motivation, a useful analogy,
development, transitions and interpretation can precede or follow a callout.
Use `def` for a term's introduction, `key` for a reusable rule or procedure,
`trap` for a concrete error and `ex` for a worked case. `note` is supplementary
only when marked optional; other shapes include `list`, `table`, `code`,
`math`, `figure`, `image`, `slides` and `attempt`.

Choose boundaries by the reader's task, not length. Start a new block when the
teaching role changes or a new concept/subtopic needs its own introduction
and development. Keep paragraphs or steps together when they develop the same
idea or worked case. Minor terminology can be explained inline without its
own card. A comparison can bring established concepts together;
sharing an objective or topic does not justify teaching several unfamiliar
concepts inside one definition card. A contextual paragraph can orient several
later introductions without belonging to any of their definition cards.
Do not turn every sentence into a card or compress material to save blocks.
Give cards specific, truthful titles. Use labels or headings at subtopic
boundaries, not on every paragraph. Put procedural steps in `items:` with
`ordered: true`.

Every `figure`, `table`, and `image` has a caption saying what it shows. Every
image has useful `alt`; prefer a data figure when the content can be described
as data. Use a figure when it makes a relevant relationship or process easier
to inspect, and connect it to the nearby explanation. Give an unfamiliar
representation a reading guide: establish its situation, labels and assumptions, then walk
through a meaningful case and explain the result. A caption naming the subject
is not that interpretation. Use `<f k="id"/>` for a
cited figure and `<m>…</m>` for inline maths; standalone equations use `math`
with TeX. Never put TeX in a double quoted YAML scalar.

Use the semantic emphasis convention in prose.md and the supported markup in
formats/inline.md. Quote YAML scalars containing `: ` or `#`; an unquoted list
item can silently become a mapping. Imported markup is sanitized; course CSS
is scoped to declared classes and allowed properties.

The reader hears headings, prose, list items, definitions, and captions. It does
not hear figure bodies, table cells, code, formulas, or quiz answers. State the
spoken result in prose and make captions explanatory. Cross-course links use a
full `#/course/section` route; non-redundancy still applies across courses.
