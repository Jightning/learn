# Submission format

Write only inside `submission/`. All JSON must be UTF-8 and valid JSON. Use
ordinary Markdown for lesson prose. Source IDs are `M1`–`M4` from
`source/math.md` and `S1`–`S4` from `source/gateway.md`.

## `plan.json`

```json
{
  "title": "A precise course title",
  "lessons": [
    {
      "id": "M1",
      "title": "A reader-facing title",
      "concept": "solution-verification",
      "prerequisites": [],
      "source_ids": ["M1"],
      "later_use": ["M2", "M3", "M4"]
    }
  ]
}
```

Include all eight lessons exactly once, in the order stated by the learner
packet. Every prerequisite must name an earlier lesson in the same strand.
`later_use` must name later lessons. Say where a definition lives instead of
copying its prose into every later lesson. The checker requires M2–M4 to cite
M1 as a prerequisite, S2–S4 to cite S1, S3 to cite S2, and S4 to cite S3.

## `lessons/M1.md` through `lessons/S4.md`

Write eight complete lessons. Each starts with `# M1: Title` (with its own ID)
and contains these exact second-level headings in this order:

1. `## Core explanation` — teach definitions and mechanism from the learner's
   background, with necessary derivations in math lessons.
2. `## Worked case` — work the given case step by step and verify it.
3. `## Visual reading` — refer to its figure by ID where required, say exactly
   what to inspect, and what a misleading depiction would imply. M2, M3, S2,
   and S3 have required figures. Other lessons may use a useful table or
   diagram. A claim that a figure is unnecessary needs a concrete reason.
4. `## Connections` — name the earlier concept used here and a later use;
   explain the relationship without reteaching the same definition.
5. `## Sources and limits` — cite the packet's source IDs for facts, label
   deductions as such, and flag what cannot be established.

Each lesson must have at least 450 prose words. This floor is a workload test;
repetition or filler fails human review. A lesson may exceed the floor when its
reasoning needs it. Do not paste the source packet or rely on a bare formula as
an explanation. Questions live in `questions.json`, not the lesson Markdown.

## `figures.json`

An object keyed by lesson ID. M2, M3, S2, and S3 are required. Every figure
has nonempty `alt` and `inference` strings that say what it shows and what the
learner should infer, not “diagram of topic.” Figure data must be sufficient to
draw or inspect the relationship without inventing values.

M2 uses `kind: "plot"`, `x_label`, `y_label`, and one series named `resonant`
with numeric `points: [[t,x],...]` at `t=0,0.5,1,1.5`. Its points depict the
solution of M2's resonant initial-value problem. Include at least 25 points
through `t>=6`, so the growing envelope is visible across several oscillations.

M3 uses `kind: "phase"`, `x_label`, `y_label`, and `points` objects with numeric
`t`, `x1`, and `x2` at `t=0,0.5,1,2`. Its points depict M3's initial-value
solution in the phase plane. Include at least 10 points to show the bend toward
the eigenline. Describe the eigenline and arrow direction in
`inference` or extra fields.

S2 and S3 use `kind: "flow"` with `nodes: [{"id":"...","label":"..."}]`
and `edges: [{"from":"...","to":"...","label":"..."}]`. S2 must show
nodes with IDs `client`, `gateway`, `policy`, `cache`, `router`, `provider`,
`validation`, and `telemetry`. Show both the cache-hit and provider paths
through response validation and telemetry. S3 must show nodes `tenant_a`, `tenant_b`, `key_a`, `key_b`, and
`cache`, with each tenant routed to its own scoped key before cache lookup.
Additional fields are allowed.

## `questions.json`

An array. Every lesson has at least two questions; M2, M3, S2, and S4 have at
least three. Each question has:

```json
{
  "id": "M2-q1",
  "lesson": "M2",
  "type": "derive",
  "concept": "resonance",
  "prompt": "A self-contained question with its own numbers and context",
  "answer": "A complete model answer or checkable result",
  "feedback": "Why a likely wrong answer is attractive and how to correct it",
  "source_ids": ["M2"]
}
```

Use distinct `type` values within a lesson. Mix computation, derivation,
method selection, error diagnosis, and transfer where relevant. A question
must make sense in Review without surrounding lesson text. For systems
questions, an answer that invents the candidate's history is wrong.

## `practice.json`

At least one practice variant for each of M2, M3, S2, and S4. Same fields as
questions plus `variant_of` (an ID in `questions.json`) and `changed_surface`
(a sentence naming what changed). Vary the context or numbers while testing
the same skill, rather than paraphrasing the original prompt.

## `checks.json`

Record independently calculated results in this shape. Use numbers, not strings
for numeric fields. Give the derivation and substitutions in the lessons.

```json
{
  "math": {
    "resonant_t_sin_coefficient": 0,
    "nonresonant_cos_t_coefficient": 0,
    "nonresonant_cos_2t_coefficient": 0,
    "defective_eigenvalue": 0,
    "defective_eigenspace_dimension": 0,
    "defective_x1_at_1": 0,
    "defective_x2_at_1": 0,
    "switched_y_at_2": 0
  },
  "systems": {
    "product_a_reduction_percent": 0,
    "product_b_reduction_percent": 0,
    "combined_reduction_percent": 0,
    "synthetic_replay_verifies_real_claim": false,
    "routing_same_tokens_reduces_token_count": false,
    "cache_key_requires_tenant_scope": false,
    "kv_attention_constant_in_context_length": false
  }
}
```

The zeroes in this example are placeholders, not answers. Do not copy them.

## `audit.json`

An object with keys D1–D11. Each value has `label` (`supported`, `false`, or
`unknown`) and a `reason` that cites source IDs or a derivation. Do not merely
repeat the statement.

```json
{"D1":{"label":"supported","reason":"Calculated from S1: ..."}}
```

## `self_audit.md`

For each lesson, state one concrete risk that survived drafting and the check
you performed. Include a short source-to-claim table for any claim about the
fictional candidate, and a list of owner questions needed before the S4 claim
could be asserted as a historical fact. Do not declare the work perfect.
