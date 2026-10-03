# Concepts, categories, and variants

```yaml
# concepts/<key>.yaml
term: Initial-value problem
body: '<p>A differential equation coupled with an initial value.</p>'
src: Defined in §4.1

# categories/<key>.yaml
name: Precipitation reactions
short: PPT
boundary: '<p>Dissolved substances form one or more solid products.</p>'
siblings: [acid-base-reactions, redox-reactions]

# practice/<key>.yaml
concept: initial-value-problem
items:
  - q: Solve the changed surface.
    response: {kind: number, value: 4, tolerance: 0}
    verified: '2026-10-02'
```

Promote an idea used in three or more places to a concept. Categories need a
boundary, declared siblings, and members; `cat` is one principal kind and tags
are secondary slugs. Variants hold the concept and response kind while changing
surface, context, or difficulty.
