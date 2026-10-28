# Mastery loading and compatibility v1

Mastery remains opt-in. Courses without `mastery/` load as before and acquire no
mastery indexes. Both `parseCourse(files)` and `loadCourse(dir)` run the shared
`src/lib/mastery-course.js` resolver after canonical curriculum and native question
compilation. Invalid required capabilities or definitions append errors and yield
no usable mastery/activity index; import and pack refuse those errors.

## Public files

Use exactly one YAML, YML or JSON document per name:

```text
mastery/manifest.yaml
mastery/targets.yaml
mastery/policies.yaml
mastery/activities.yaml  # optional unless declared in manifest
```

The first three documents are required for opt-in. Targets/policies use the S01
schema. Activities use `{schemaVersion: 1, activities: [...]}` from
[the activity contract](mastery-activities.md); their capability declarations live
in the shared manifest, rather than a second competing manifest. A complete pilot
manifest is:

```yaml
schemaVersion: 1
required:
  mastery.targets: 1
  mastery.policies: 1
  mastery.activities: 1
  adapter.question: 1
  adapter.external-submission: 1
  adapter.written-defense: 1
optional:
  adapter.audio: 1
  adapter.trusted-evaluation: 1
```

Unsupported required IDs/versions fail with an update-reader-or-course message.
Unsupported optional declarations remain in `manifest.unavailable`; optional
activities retain `availability: unavailable`. Adapter availability means contract
support only. It establishes no service, trust, execution or earned credit.
Duplicate documents, undeclared/missing activity collections, unknown mastery
files, and authored `course.mastery`/`course.activityIndex` are rejected.

## Normalized interfaces

- `C.mastery`: S01 roots, policies, skillRoots, outcomeRoots, outcomeWeights,
  rootWeights, manifest, schemaVersion, plus compatibility signatures below.
- `C.activityIndex`: S02 activities, rootActivities, skillActivities, manifest and
  schemaVersion; null for root/policy-only courses.
- `compileMastery(C, source, errors, supportedCapabilities)` retains its original
  default support map for standalone callers. The shared resolver supplies the
  combined activity/adapter capabilities, so neither compiler drops required IDs.
- The resolver derives `subsections` from `C.sections[].subs[]` for the activity
  compiler; it uses existing `C.questionBank` and `C.questionSkills` unchanged.

## Compatibility signatures

Roots expose `contentSignature`, `rubricSignature`, `organizationSignature`.
Activities expose those plus `evidenceSignature`. `C.mastery.organizationSignature`
also records lesson order, teaching destinations, weights and action organization.
These are deterministic canonical JSON identities, not cryptographic artifact
hashes, version migrations, trust proofs or learner-state records.

| Change | Compatibility effect |
| --- | --- |
| Lesson placement/order, help destination, importance, wave/timing/dependencies | Organization changes; activity semantic/evidence/rubric identities remain valid. |
| Select a higher already-defined target anchor | Recompute organization/gaps; preserve unchanged anchor observations. |
| Task answer/steps, external package hash/version, tested capability standard | Affected activity content and evidence identities change. |
| Allowed assistance, group, demand/attribution or explicit evidenceVersion | Affected evidence identity changes. |
| Rubric criteria/policy or explicit rubricVersion | Applicable rubric identity changes; other roots/policies remain unchanged. |
| Explicit contentVersion or root semanticVersion | Affected content/evidence identities change even if prose is unchanged. |

Both explicit versions and semantic payloads participate, so a forgotten version
bump cannot reuse an incompatible identity. Activity signatures use only tested
facets/anchors and applicable criteria, not unrelated roots or unused criteria.
S04 and later cards must bind all relevant identities to immutable observations;
S03 does not delete, migrate, rescore or silently upgrade any learner evidence.

## Distribution boundary

Pack and build still distribute the existing text map. Executable labs are only
public HTTPS package references with identity/version/SHA-256 and displayable
commands. No archive execution, binary transport, network fetching or service
provisioning is added. Imports use the same parser and capability checks.

All course text is public to its recipient. Keep private tests, evaluator keys and
reviewer solutions in a separate evaluator package **outside the course tree**.
Opted-in courses reject `private/`, `evaluator/` and `private-assessment/` path
segments in distributed files, including nested trees. Unknown `mastery/` files
are rejected. These guards cannot recognize secrets hidden in arbitrary public
text; a `private: true` flag does not hide bytes. Existing `sources/` and author
comment exclusions remain in effect. No private course-source data is an engine
fixture.

`tests/fixtures/mastery/course.mjs` serializes the S02 future pilot with real
canonical native links. Its external URL/hash remain synthetic until S12. The
loading integration test exercises pack/import/unpack and inspects actual output
against a separate synthetic evaluator package and deliberately misplaced private
files. This is distribution/contract evidence, not a runnable or trusted lab.

## Authoring and review integration (S13)

The v1 manifest, target, policy, activity, adapter and evidence contracts remain
unchanged. Authoring uses the same shared compiler; it does not maintain a second
runtime schema or migrate learner events. Existing courses require no edits.
For practical required-family coverage, explicitly add `activities` and
`requiredFacets` (`root`, `facet`, integer `anchor`, activity `kind`) to canonical
family metadata. Never infer implementation coverage from reading or self labels.
The opt-in recipe is `authoring/mastery.md`. Declared obligations survive
in private authoring state after writing starts; removing a facet cannot bypass
finish or packing. Source routes and substantive teaching are still required.

`tools/lib/author-mastery.mjs` reads validated public definitions for packets,
coverage and indexed review. Stable derived review IDs use `mastery-activity-`,
`mastery-target-`, `mastery-policy-` and `mastery-manifest`; native IDs and existing
author IDs are unchanged. Raw payloads appear once per indexed entry. Compiled
compatibility signatures stay internal; changed screens name affected content,
evidence, rubric or organization versions and include dependency/teaching context.
Current screens/full packets are required before accepting changed items.
A task/rubric change also invalidates the relevant lesson's authoring check.

Private package references and private bytes are not supported course fields.
Review displays the public package reference plus `checkVisibility` requirements;
actual private inventory belongs to the external evaluator, outside exported data.
Generated-provenance source routes expand as explicitly labeled provenance with
no independent source excerpt. Coverage is a routing gate, not a quality review,
private-test execution, trusted evaluation or learner mastery certificate.

Reproduce the S13 checks with `node --test tests/integration/author-mastery.test.mjs`
and the existing author coverage/review suites; `npm run check:static` checks the
regenerated plugin. Gate G remains S14; production services/reviewers and actual
course authoring remain separate work.
