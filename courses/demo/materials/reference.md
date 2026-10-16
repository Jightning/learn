# Reference: feature map

Where each capability is shown, once.

## Block types

| type | shown in | notes |
|---|---|---|
| `p` | §1.1 | prose |
| `def` | §1.1, §1.2, §1.4, §5.2 | `term` feeds the "Before you start" panel |
| `key` | §1.1, §1.4, §3.1 | a rule to remember |
| `trap` | §1.2, §1.3, §4.3, §5.2 | the mistake people actually make |
| `note` | §1.1, §1.5, §2.1 | optional only when it is genuinely supplementary |
| `ex` | §1.2, §2.2, §3.2 | fully stepped |
| `attempt` | §1.2, §2.2 | first block only; feeds calibration |
| `list` | §1.1, §1.5, §2.2 | ordered and unordered |
| `table` | §1.3, §1.4, §5.1 | plain, `mono` (+ `split`), `map` |
| `code` | §5.1 | highlighted by course `syntax` |
| `math` | §3.1 | `label` + `note`; rendered at build time |
| `figure` | §4.1–§4.3 | nine kinds |
| `image` | §5.2 | with and without caption |
| `metric` | §3.1 | custom, from `blocks.js` |

## Figure kinds

`graph` (§4.1, circle + layered), `flow` (§4.1, row + col), `timing` (§4.1),
`plot` (§4.2, `fn` + `points` + `dash` + ranges), `bar` (§4.2, `baseline` +
`accent`), `scatter` (§4.2, `trend`), `grid` (§4.3, `index: binary` +
`groups`), `matrix` (§4.3), `svg` (§4.3, escape hatch).

## References

`<a href="#s2-2">` subsection, `<c k="tier">` concept, `<f k="loop-machine"/>`
figure, `<a href="#/<course-id>/">` cross-course.

## Reading modes and optional content

**Study**, **Review**, and **Names** present the complete required reading at
full text, notes, or index detail. A block marked `optional: true` is a
supplementary expansion that can be opened in place; it never carries a needed
premise, required reasoning, or examinable point. Read the learner guidance in
§1.4 and the evidence discussion in §3.2.

## Source badges

Real origin → plain badge. `unverified` → "not grounded in a named source"
(§5.2). `generated` → model-drafted, counts as unverified (§5.2). Blank →
not-yet-audited, counted separately.

## Course-level

`valueStyles`, `styles`, `syntax` (comment / keywords / patterns / strings),
`theme.hue`, `state.enabled`, `blocks.js`. The optional concept file keeps its
historical ID for existing links; §1.4 explains the current reading behavior.
