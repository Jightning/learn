# Human review: required after `MECHANICAL PASS`

The checker can verify structure, numeric results, figure samples, and claim
labels. A person must read the work to decide whether it teaches. Mark each
gate `true` only after inspecting the named files. Copy the JSON template below
to `validation/review.json` outside the candidate's submission, replace every `false` that is earned with `true`,
and put a specific file/heading or quoted error in the corresponding evidence
string. A blank or generic “looks good” evidence fails the checker. Pass that
file with `--review`; the candidate must not create it.

These are **binary gates**, not points to average:

1. `math_steps`: M2–M4 derive rather than assert results; differentiation and
   initial-value checks are shown, including the switch at `t=1`.
2. `math_transfer`: questions include genuinely new numbers or arrangements,
   with independently correct answers and plausible wrong-answer feedback.
3. `math_visuals`: M2's plotted envelope and M3's trajectory/eigenline teach
   a relationship; prose interprets their axes, direction, and limits.
4. `systems_units`: S1–S4 distinguish provider-token counts, dollars, the
   product maximum, and the combined population without denominator drift.
5. `systems_honesty`: no prose or answer treats the synthetic replay as proof
   of the fictional candidate's historical measurement.
6. `systems_mechanism`: routing, batching, full-response caching, and KV
   caching are not conflated; S3 explains tenant isolation and invalidation.
7. `systems_visuals`: S2 and S3 flows display the actual decision and trust
   boundaries; their captions and alt text expose failure paths.
8. `learning_order`: each new term is defined before use, each prerequisite
   link points backward, and no later lesson is required to understand an
   earlier one.
9. `explanation_once`: later lessons apply earlier ideas without duplicating
   their full explanations; cross-links state what transfers and what differs.
10. `question_quality`: every sampled question works outside its subsection;
    answers and feedback are independently checked, not accepted from keys.
11. `source_trace`: substantive claims cite packet IDs or are labeled as
    deductions/unknown; the source packet is not copied as filler.
12. `depth_and_clarity`: all eight lessons have useful teaching depth,
    appropriate examples, clear prose, and no substantial padding or omitted
    step needed by the declared learner.

```json
{
  "math_steps": {"pass": false, "evidence": ""},
  "math_transfer": {"pass": false, "evidence": ""},
  "math_visuals": {"pass": false, "evidence": ""},
  "systems_units": {"pass": false, "evidence": ""},
  "systems_honesty": {"pass": false, "evidence": ""},
  "systems_mechanism": {"pass": false, "evidence": ""},
  "systems_visuals": {"pass": false, "evidence": ""},
  "learning_order": {"pass": false, "evidence": ""},
  "explanation_once": {"pass": false, "evidence": ""},
  "question_quality": {"pass": false, "evidence": ""},
  "source_trace": {"pass": false, "evidence": ""},
  "depth_and_clarity": {"pass": false, "evidence": ""}
}
```

`PASS SAMPLE` means this submission cleared a demanding work sample. It is
still not a guarantee of perfect performance on a full-length course. The
best next test is a real subsection from a different source, checked by its
owner in the rendered reader.
