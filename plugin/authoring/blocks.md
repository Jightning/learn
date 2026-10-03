# Blocks and reader behavior

Use the smallest block that carries one job: `p` prose, `def` term, `key` rule
or procedure, `trap` concrete error, `ex` worked example, `note` non-examinable
depth, `list`, `table`, `code`, `math`, `figure`, `image`, `slides`, or
`attempt`. Put procedural steps in `items:` with `ordered: true`; do not hide
numbered work in a paragraph.

Every `figure`, `table`, and `image` has a caption saying what it shows. Every
image has useful `alt`; prefer a data figure when the content can be described
as data. A figure must add information the prose does not. Place a visual at
the first spine explanation of spatial structure, connections, motion, or a
signal path. Use `<f k="id"/>` for a cited figure and `<m>…</m>` for inline
maths; standalone equations use `math` with TeX. Never put TeX in a double
quoted YAML scalar.

Use inline `<strong>`, `<em>`, `<mark>`, `<u>`, `<s>`, `<sub>`, `<sup>`, and
the palette spans only to expose a relation, distinction, or step. Quote YAML
scalars containing `: ` or `#`; an unquoted list item can silently become a
mapping. Imported markup is untrusted and is sanitized by the reader. Course
CSS is scoped to declared classes and the allowed property list.

The reader hears headings, prose, list items, definitions, and captions. It does
not hear figure bodies, table cells, code, formulas, or quiz answers. State the
spoken result in prose and make captions explanatory. Cross-course links use a
full `#/course/section` route; non-redundancy still applies across courses.
