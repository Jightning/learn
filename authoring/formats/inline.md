# Inline markup and links

Supported inline tags in authored text, labels, prompts, choices, and answers:
`<strong>`, `<b>`, `<em>`, `<i>`, `<mark>`, `<u>`, `<s>`, `<sub>`, `<sup>`, `<code>`,
`<span class="ink-accent|ink-info|ink-note|ink-caution">`, `<m>…</m>`,
`<c k="concept">…</c>`, `<f k="figure-id"/>`, `<n k="aside-key">phrase</n>` with a matching same-block `asides:`, and safe `<a href>` links.
Close tags, escape bare `<` and `&`, and quote YAML containing `: ` or `#`.
Cross-course links use `#/other-course/s6-1`; figure links use section-scoped IDs.
Sanitization removes scripts, event attributes, active embeds, unsafe URL schemes,
and unapproved CSS.

All reader-facing text should use the supported inline renderer, including
math, emphasis, highlights, color, links, and code-like text. Keep bare TeX in a
math block's `tex:` only; wrap inline formulas in `<m>...</m>`.
