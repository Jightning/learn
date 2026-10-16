# Writing a course

Write for the learner described in the reader profile and teach the promised
capability from that starting point. A lesson should read as one connected
explanation: establish what is known, introduce each new idea where it is
needed, show why the reasoning works, and connect examples and representations
back to the claim they support. Use transitions when the relationship between
blocks would otherwise be left for the learner to infer.

Keep essential reasoning in the default reading. Add `optional: true` to a
block only when a learner can understand and use the required material without
it. Put an optional explanation beside the passage it develops, and use
`follows: true` when it depends on the immediately preceding block. Optional
content may deepen or extend an explanation; it must not carry a prerequisite,
exam requirement, or missing step. Read the assembled subsection at full
resolution and check the argument end to end.

Use ordinary prose to carry the thread of the explanation. A callout is useful
when its role helps the reader recognize a definition, rule, common error, or
worked solution; avoid turning every paragraph into a card. Use examples to
make decisions and intermediate states visible, then fade guidance as the
learner gains the needed method. Revisit earlier ideas when a later step depends
on them, without repeating their entire introduction.

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
