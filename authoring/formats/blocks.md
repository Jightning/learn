# Block schemas

All blocks accept `t`, optional `optional`, `label`, `cat`, `tags`, `notes`,
`follows`, and `asides`. `def`, `key`, and `trap` additionally require
`source`; they may include `core` or `gist`, but not both. `table` and `image`
accept `id`.

```yaml
- {t: p, h: 'Ordinary prose.'}
- {t: def, term: Term, source: 'Book §2', core: The term names this relation., h: 'Development.'}
- {t: key, h: Rule lead-in, items: ['First step', 'Second step'], ordered: true}
- {t: trap, label: Common slip, h: The specific mistaken move.}
- {t: ex, title: Worked case, h: 'Derive the result.'}
- {t: note, optional: true, h: 'Supplementary context.'}
- {t: list, items: ['one', 'two'], ordered: false}
- {t: table, id: t1, cap: What the columns compare, head: [A, B], rows: [['x', 'y']]}
- {t: code, lang: js, src: 'const x = 1;'}
- {t: math, label: Equation, tex: 'ar^2 + br + c = 0', note: The solution depends on the discriminant.}
- {t: image, src: assets/example.png, alt: A labeled diagram, cap: The diagram shows the signal path.}
- {t: attempt, label: Try it, h: 'Try this when it serves the teaching.'}
```

Capabilities: `optional` (reader can collapse/skip), `follows` (attached to previous
block), `asides` (phrase-linked margin help), `label`, `cat`, `tags`, `notes`
(depth override), `core` (opening claim), `gist` (Notes-only summary),
`authorComment` (author-only reasoning; stripped from exports).
Keep required teaching in the default path. Use string `items` for steps;
`ordered: true` numbers them. See `depth.md` for attachment syntax and
`inline.md` for text formatting.
