# Creating a course

The authoring contract lives in [`../authoring/`](../authoring/). Start with
[`entrypoint.md`](../authoring/entrypoint.md), then load only the modules named
by [`manifest.yaml`](../authoring/manifest.yaml) for the phase and requested
need. This page preserves the old link; it is not a second rules authority.

The CLI owns source indexing, validation, audit, coverage, packing, and
completion. The packet separates planner scope and order, writer teaching and
course files, and reviewer evidence and corrections.

Course-local question banks use `questions/types.yaml`, `bank.yaml`, and sparse
`assessment.yaml`; lesson `quiz` lists only ordered IDs. The same `author` flow
works in single, paired auto and paired manual mode. Select `--need bank` for
the format; write one representative pilot, then batch related types and
practice/reserved siblings together. Run `index`, `screen` and selected full
ID packets before one consolidated review/correction pass. The shared review
context reports roles, groups, shortages and missing source families; this
mechanical matrix is not answer or blueprint approval. Private accepted review
snapshots become stale when mappings, placements, groups, sources or assessment
criteria change. See `authoring/formats/question-bank.md`.
