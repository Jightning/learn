# Runnable mastery reference slice (S12)

This is a synthetic platform fixture, separate from Resume course authoring.
The Python lab executes in a local terminal. The study site imports definitions
and stores submitted text/references; it never extracts or executes the lab ZIP.

From the repository root, build the deterministic public package:

```sh
node examples/mastery-cost-ledger/package.mjs /tmp/cost-ledger-1.0.0.zip
```

The command prints its SHA-256. It includes only the explicit public allowlist:
instructions, seeded starter, public tests and four CSVs. ZIP timestamps are
fixed; identical sources produce identical archives across local time zones.
The archive and generated course bundles are reproducible outputs, not checked-in
binaries. Do not distribute `reviewer/` with learner or assessment packages.

To start directly without extracting, open `public/` in a terminal and run
`python3 -B -m unittest -v`. Supported runtime: CPython 3.11–3.14, standard
library only. S12 actually ran on CPython 3.14.7. The untouched starter fails
base/fresh/delayed rounding cases; the empty case passes. Learners edit
`ledger.py` and rerun the same command. `public/README.md` supplies setup,
worked reasoning, fallback, troubleshooting, reset, cleanup and submission steps.

Reviewer validation uses a **disposable copy** of the public folder. Replace its
`ledger.py` with `reviewer/ledger.py` and run the same command: all public cases
pass. Copy `reviewer/test_private.py` into that disposable folder and rerun:
the extra boundary check passes. Re-extract the public ZIP into a new folder to
reset. The integration test automates these exact filesystem steps and launches
the installed Python process, outside the site and sync service:

```sh
node --test tests/integration/mastery-learning-slice.test.mjs
npm run build
node --test tests/browser/mastery-learning-slice.test.mjs
```

`tests/fixtures/mastery/learning-slice.mjs` exports
`learningSliceFiles(actualPackageSha256)` for S13 and later checks. It reuses
the shared canonical fixture with a real lesson, two numeric questions, separate
calculation/build/debug/explanation facets, lab, pre-feedback defense and fresh
follow-up, guided repair, fresh lab/defense and two-day delayed lab/defense.
The lesson is inspected in assembled browser reading at 1440px and 390px.
The package reference uses the reserved `https://ledger.invalid/` host, served
only by the browser test interception; it is **not a live download service**.
For local use, use the folder or ZIP above. Publishing requires replacing the
URL with approved hosting and verifying the generated archive checksum.

The integration test drives the required planner using an explicitly caller-owned
deterministic verification set. It proves the whole sequence including each
facet, simulated elapsed delay, and export/restore. That set never travels in a
backup or into the browser. Browser checks prove ordinary question persistence,
explicit package download/checksum, lab draft/commit, explanation/follow-up before
feedback, public-result import, and fresh-browser log restore. The ordinary
question checker does not independently certify a practical activity.

Public examples, including the fresh and delayed CSVs, are practice material.
The separate reviewer test is a deterministic integration fixture, not a secure
production evaluator. A real independent assessment needs new private inputs
and a qualified verifier. Imported public-test/reviewer labels remain untrusted;
restoring reports cannot restore authority. These tests do not demonstrate real
learner retention or mastery. Results with forged trust, changed hashes,
duplicates or oversized input remain covered by the S11 boundary tests.

Optional audio and trusted-evaluator definitions pack/import as unavailable
adapters. Cloud/Unreal references use missing environment capabilities; their
fallback is a written explanation, which cannot grant operational credit.
Future envelopes validate against the same criterion/reference contract without
changing lesson definitions. No audio, cloud project, evaluator, provisioning,
downloaded runtime, private check service or hosted runner is supplied here.
