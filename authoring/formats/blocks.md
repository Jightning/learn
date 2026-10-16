# Block schemas

All blocks accept `t`, optional `optional`, `label`, `cat`, `tags`, `notes`,
`follows`, and `asides`. `def`, `key`, and `trap` additionally require
`source`; they may include `core` or `gist`, but not both. `table` and `image`
accept `id`.

```yaml
- {t: p, h: '<p>Ordinary prose.</p>'}
- {t: def, term: Term, source: 'Book §2', core: The term names this relation., h: '<p>Development.</p>'}
- {t: key, h: Rule lead-in, items: ['First step', 'Second step'], ordered: true}
- {t: trap, label: Common slip, h: The specific mistaken move.}
- {t: ex, title: Worked case, h: '<p>Derive the result.</p>'}
- {t: note, optional: true, h: '<p>Supplementary context.</p>'}
- {t: list, items: ['one', 'two'], ordered: false}
- {t: table, id: t1, cap: What the columns compare, head: [A, B], rows: [['x', 'y']]}
- {t: code, lang: js, src: 'const x = 1;'}
- {t: math, label: Equation, tex: 'ar^2 + br + c = 0', note: The solution depends on the discriminant.}
- {t: image, src: assets/example.png, alt: A labeled diagram, cap: The diagram shows the signal path.}
- {t: attempt, label: Try it, h: '<p>Try this when it serves the teaching.</p>'}
```

Place an `attempt` where its prerequisites and teaching purpose support it.
Steps belong in string `items`, never run-in prose. The default reading path
contains all required teaching. Use `optional: true` only for a block that can
be skipped without losing a required idea or reasoning step. Put it beside the
passage it extends, and use `follows: true` when it depends on the preceding
block. See `../core.md` for the common teaching contract.

Every reader-facing text field should pass through the shared safe inline
renderer, including headings, block prose, labels, question prompts and answers,
captions, and table headers and cells. Supported markup includes inline math,
bold/italic, highlight, color classes, links, and code formatting. Use `<m>…</m>`
for inline TeX; reserve bare TeX for a math block's `tex:`. Table content keeps
the same markup in every reading mode.
