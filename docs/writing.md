# Writing a course

Write a connected explanation for the stated learner, with a clear context,
conceptual development and interpreted examples. The shared
[teaching contract](../authoring/core.md) owns these principles and rewrite
expectations. Use [block guidance](../authoring/blocks.md) to decide what belongs
in running prose or a separate definition, rule, or worked case; use the
[prose convention](../authoring/prose.md) for meaningful headings and emphasis.
These are editorial decisions, not block or word quotas.

Keep essential teaching in the default reading. Use `optional: true` only when
the required account remains understandable without the block. Place it beside
the passage it extends; `follows: true` marks dependence on the preceding block.
Inspect the assembled reading end to end, not just its fields.

Teach when and why to use a method, including its conditions and stopping
criteria. Required reading and section-end questions together support the
lesson outcome; questions should test decisions on unfamiliar in-scope tasks
and give explanatory feedback. Provide a working representation when
constructing it is not the target.

Write equations in the same flow as the surrounding explanation. Inline math
uses `<m>...</m>`. When an equation is important enough to pause the reading,
keep it in the same block and paragraph flow:

```html
<p class="equation"><m>\displaystyle ...</m></p>
```

Use a separate math block only when the equation itself is the teaching object
or needs its own explanation. A YAML line break does not create a visible
paragraph break; use paragraph markup for a new thought and `<br>` for a short
break within one paragraph.

Questions should ask the learner to retrieve, distinguish, apply, or connect a
capability already taught. Use the current typed response kinds (`single`,
`multi`, `number`, `formula`, or `self`) and verify every answer independently.
`tries` is a positive total-attempt count beside `q` and `response`; omit it for
the default single attempt. Attach ordered `stimulus` only when a question
needs a supporting passage, figure, table, image, equation, or other reading
material. An inline lesson question suits a small self-contained course. A
question bank suits repeated practice and reuse: define task metadata once,
store each item once, and reference its stable ID where it is used.

Choose the amount of explanation, practice, and visual support to meet the
learning goal. Inventories and coverage checks help reveal omissions; they are
not quotas. See [`../authoring/core.md`](../authoring/core.md) for the shared
teaching contract and the focused format guides under
[`../authoring/formats/`](../authoring/formats/).
