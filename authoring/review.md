# Review and correction artifacts

Start with `author screen <course> --section s1` (or `--all`, the default) for a
compact section review: deterministic original excerpts plus a closure map.
`--changed` limits it to relevant changed items and affected context. After a
review is accepted, it compares against that accepted snapshot, so later edits
can use the same changed review flow. Screening finds leads; it cannot settle
math or source truth. Expand evidence before any
math or source judgment. Use `author packet <course> --ids id1,id2 [--expand]`
for full item and evidence lookup; the envelope prints stable IDs once.
Before reporting missing teaching, check the shared map and later items.
Expand truncated fields and relevant dependencies; an excerpt cannot prove
that an explanation is absent.

Screen packets link to one shared `.author/<course>/review-context.yaml` with
reader calibration, lesson/source routing, and the global definition,
reference, and order map. Read that file once per review context; each packet
adds a small section outline. Packets split at 24,000 bytes. In changed mode,
packets link to `corrections.yaml`, attach issue IDs to each current item, and
include original excerpts for deleted items. Deleted IDs remain available via
`packet --ids`. Group IDs in one packet request to deduplicate repeated source
spans; source references within a packet are deduplicated, and batch reviewers
can reuse the shared context and packet artifacts.

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

Save one consolidated issues report with `author issues <course> --report
PATH`. Each entry uses `target` or `targets`, a concise issue, and a done
condition; `sourceRefs` is optional. The CLI generates an issue ID when omitted
and stores the baseline internally; hashes
stay in `.author/` and never appear in model output. For example:

```yaml
items:
  - target: block-abc123
    issue: The definition reverses the stated relation.
    done: Correct the direction and verify against the cited source.
    sourceRefs: [{source: src-1, unit: section-4, lines: [12, 16]}]
  - targets: [quiz-def456, practice-ghi789]
    issue: Both prompts test the wrong objective.
    done: Route both items to obj-2 and verify the answers.
```

After correction, use a separate `correction-results.yaml` with `author
corrected <course> --report PATH`. Each saved issue ID needs exactly one result;
identify every affected current item. Hashes compare internally, including
unreported edits, and the CLI reports changed/added/deleted IDs with issue
links. Acceptance checks that every current changed and affected item was
screened or expanded at its current revision after correction. If content
changes after that check, screen or expand the new revision before acceptance.
The public diff is `.author/<id>/change-report.yaml`; keep hash snapshots out
of model context. Changed source files also invalidate acceptance, even when
course prose is unchanged. Refresh stale extraction with `sources --refresh`
before requesting evidence packets.

```yaml
results:
  - issue: issue-abc123 # generated ID from the saved issues packet
    disposition: fixed # fixed | already-satisfied
    affected: [block-abc123]
```

Then run checked `done --all`. The reviewer runs `screen --changed`, checks
changed items and affected context, expands any item requiring source or math
judgment, and records acceptance with `reviewed --all`. Only the reviewer
accepts a paired correction pass. Clean outcomes remain an agent declaration,
not an independent quality certificate. Fresh screening proves that the current
excerpt was considered; source truth and answer correctness remain reviewer
judgments.

Finish the entire assigned review before dispatching any correction. A
correction repairs the defect and should not add unrelated material. Recheck
changed items and affected context; reuse accepted unchanged results.
