# Review packet

Review the plan against raw sources, then the rendered course against the plan.
For each required objective/family, mark shared or distinct teaching/assessment
evidence, exact
source locator, answer check, and reader-visible subsection. The writer verifies every answer with explicit derivation/calculation. The
strong reviewer checks flagged uncertainty, high-risk claims and a representative
family sample using exact item/span packets; widen only when insufficient.
Rereading or a verified flag alone is not verification.

Check closure from the reader background, forward references, spine-only
coherence, definitions, claim fields, category boundaries, question routes,
figure captions and alt text, YAML scalar safety, math, and source dispositions.
Inspect the packed reader once, sampling supported depths and unusual shapes;
fully inspect changed or flagged content. Do not reread every lesson at every
depth merely to repeat the writer's checks. Coverage scores identify leads; they do not prove pedagogical or
mathematical completeness. Resolve each low-score lead as taught, bridged,
moved, skipped with a reason, or false-match with a reason.

If evidence is insufficient, report the smallest missing locator or source span
and escalate scope or truth judgment. Do not rewrite a writer's packet while
reviewing it. A reviewer may issue concise, actionable corrections with a
target and done condition.

Save directives as `items: [{target: "quiz:1", issue: "...", sourceRefs:
[{source: src, unit: page, lines: [3, 8]}], done: "..."}]`. Serialize with a YAML
library; do not handwrite unsafe scalars. Pass/fix judgments should carry only
the necessary reason and locator. Record clean outcomes together with reviewed
--all only after the actual review; it is an agent declaration.

Finish the entire assigned review before dispatching any correction. Save one
consolidated issue set per target. A correction repairs the defect; it should
not add a new example or unrelated material. If new content is necessary, mark
it as changed so only that content receives a fresh check.
