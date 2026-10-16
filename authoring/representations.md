# Representation selection

Choose the representation's job while planning; load only the chosen format.
The jobs below are examples, not subject requirements or a visual quota.

| Job | Start with | Rule need |
| --- | --- | --- |
| Compare cases or evidence | Table with labeled rows and columns | `block:table` |
| Inspect connections or dependencies | Graph with named nodes and edges | `figure:graph` |
| Follow decisions | Flow diagram | `figure:flow` |
| Track changing state | Labeled slide frames or a state table | `block:slides` or `block:table` |
| Inspect spatial structure | Drawing or grid | `figure:drawing` or `figure:grid` |
| Relate magnitude or variation | Plot or bar figure | `figure:plot` or `figure:bar` |

Record `representation: {job: <what the reader should infer>, needs: [...]}`
in the lesson's teaching brief. Use the format's minimal valid example before
custom code. Label unfamiliar parts and place their explanation nearby. Keep
the essential conclusion in accessible prose. Prefer a static representation
when it exposes the relationship clearly; add interaction only when it helps
the task. Existing format modules contain the executable recipes.
