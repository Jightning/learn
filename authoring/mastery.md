# Opt-in practical mastery (v1)

Use only for lessons with mastery activities or an explicit `mastery` need.
Keep the existing source, teaching, and question rules. Reuse canonical skills,
objectives and families; activities supplement them. Definitions and routing
checks establish no learner achievement or evaluator authority.

- Put public definitions in `mastery/{manifest,targets,policies,activities}.yaml`
  (JSON/YML also work), with schemaVersion 1. Declare required capabilities and
  adapter versions; future optional adapters remain visible unavailable gaps.
- Targets own stable root IDs, scoreFor, native skills, anchor standards and
  separately observed facets. Policies own criterion standards and delay days.
  Define build/debug/explain separately when the performance requires each.
- Activities own stable IDs, lesson, tests (`root/facet/skill/anchor/criteria`),
  honest group/support, versions, timing and adapter. Supply every required
  criterion; a self question or reading label cannot replace a practical task.
- External labs carry public package ID/version/HTTPS URL/SHA-256, instructions,
  command, artifact contract, environment setup/cleanup and an honest fallback.
  The site never executes the command. Keep private tests, solutions, credentials
  and evaluator packages outside the course. `checkVisibility: private` records
  an assessment requirement; it hides no distributed bytes or package reference.
- Use a written-defense successor with `after: [lab-id]`; commit explanation and
  fresh reviewer follow-up before feedback. Use another task group for transfer.
  Delayed activities name qualifying source activity/root, policy days and
  `after: qualifying-evidence-or-repair`; changing the clock is not retention.

For an assessment-required practical family, keep exact `sources`, `teach` and
substantive linked main-path blocks, then map activities and qualified facets:

```yaml
activities: [ledger-lab, ledger-defense]
requiredFacets:
  - {root: ledger-root, facet: build, anchor: 3, kind: external-lab}
  - {root: ledger-root, facet: explain, anchor: 3, kind: written-defense}
```

Each requirement needs an available mapped activity of that kind covering all
facet-anchor criteria, with a native skill in the family and scoring objective
linked to that family. Labs need artifact references. Unknown/unavailable IDs,
partial criteria and wrong kinds fail coverage. Existing question routes remain
valid; a declared practical obligation must pass even when questions exist.
This checks authored evidence routes, not semantic adequacy, independent private
checks, environment availability, trustworthy review or actual learning.

Run `author index`, screen original activity/target/policy IDs, and expand full
packets before judgment. `mastery-activity-<id>`, `mastery-target-<id>`,
`mastery-policy-<id>` and `mastery-manifest` are derived review IDs; never insert
an authorId into strict mastery documents. Rubric/task edits enter the existing
issues → corrected → checked done → changed screen → reviewed flow.

Bump content/evidence/rubric versions for corresponding semantic changes; explicit
versions and payload signatures both bind evidence. Organization edits preserve
unchanged evidence; never rewrite old submissions or trust imported reviewer
labels. See `docs/mastery-loading.md` for compatibility/distribution rules and
`tests/fixtures/mastery/learning-slice.mjs` plus
`examples/mastery-cost-ledger/README.md` for the runnable public slice. Its reserved
URL is a test interception, not hosted distribution. Full-course planning and
production evaluator acceptance remain separate gates.
