# Teaching review corpus

Synthetic evaluator-only corpus for human or model-assisted review. It tests the quality of judgments, not an automatic pedagogy score. For each case, read `candidate.md` and its source excerpt/question; keep `oracle.md` out of the candidate's context. The oracle states expected findings and acceptable tradeoffs.

For a pilot, select one case, give the reviewer the declared reader/goal, raw source and candidate, and request concise evidence-linked findings plus accept/revise rationale. Single flow: compare the judgment with the oracle directly. Paired flow: send the same packet to an independent reviewer, then compare both judgments with the oracle; do not send the oracle to either reviewer. Existing `author packet <course> --ids ... --expand` and issue/review artifacts remain the production workflow. This corpus adds no runner, default creator context, quotas, or diagram requirement.

`oracle.md` is an evaluator key and must not be copied into writer or reviewer packets.
