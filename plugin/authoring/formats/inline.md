# Text formatting

Use Markdown in prose, headings, labels, choices, answers, captions and table cells.
HTML can fulfill what Markdown cannot: highlights, sub/superscripts, color
(`ink-accent|ink-info|ink-note|ink-caution`) and custom references.

Inline TeX: `<m>…</m>`; display TeX: a math block's `tex`.
Concept: `<c k="concept">phrase</c>`; figure: `<f k="figure-id"/>`;
aside: `<n k="aside-key">phrase</n>` plus same-block `asides`.
Links: `[label](#/other-course/s6-1)`; figure IDs are section-scoped.
Code spans/fences preserve literal content. Unsafe markup and links are sanitized.
Quote YAML containing `: ` or `#`; use `|-` for paragraphs separated by blank lines.
