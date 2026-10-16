# Adaptive practice evaluation

Mixed Practice now uses the deterministic score-based selector by default and
offers a persistent weighted fallback in its Question selection settings. The
older rotation heuristic remains in shadow mode. The score ranks novelty,
breadth, challenge, due review, and soft prerequisites; its smoothed recent
success estimate is a heuristic, not a calibrated probability. Browser and
replay tests verify mechanics, not superior learning. The live rollout was a
product choice before a controlled learner comparison, so do not claim an
outcome gain from synthetic data or point estimates alone.

For a mechanical comparison, run `node tools/shadow-practice.mjs course-dir
events.json replay.json [seed]`. The replay compares rotation heuristic,
score-based, weighted-random and simple round-robin proposals after each observed completion without
altering the learner log or treating unchosen outcomes as evidence. It is a
selection-mechanics comparison; it does not validate delayed learning or FSRS
prediction. The controlled comparison below remains necessary.

Before collecting learner outcomes, register a comparison with
`node tools/evaluate-practice.mjs register config.json participants.json registration.json`.
The tool refuses to overwrite registrations. Keep the registration unchanged;
analysis verifies its signature. These are local study files, outside courses.

The config requires a randomization seed, the same representative `criteria`
for both arms, an `analysis` describing stratified analysis and uncertainty,
and explicit `margins` for `timeImprovement`, `actionImprovement`,
`falseReadiness`, `essentialGaps`, `dropout`, `transfer`, and `retention`.
Choose margins before outcomes; the tool supplies no claim of optimal values.
Specify sample size, exclusion rules, missing-data treatment, domain differences,
and ablations of coverage rotation, repair guidance, and indirect evidence in
the registered analysis. Time improvements must be shown in raw and usable
active time so exclusion rules cannot conceal cost.

Participants are a list of `{id, course, priorKnowledge}`. Use study IDs rather
than names. Seeded allocation balances baseline/adaptive within each
course/prior-knowledge stratum; each stratum needs at least two participants.
Include experts, learners who initially struggle and recover, sparse banks,
and an open rubric task. Both arms use the same reviewed performance standard.

Keep research questions outside course folders and learner checks. The tiny
`tests/fixtures/practice-research/items.json` inventory illustrates separate
representations, an exceptional branch, and a rubric task. It is test content,
not a reviewed or sufficient real assessment. Independently review actual
research items and keep their groups distinct from practiced/check groups.

After observations, run
`node tools/evaluate-practice.mjs analyze registration.json observations.json report.json`.
Each participant row records `completed`, `ready`, `rawActiveSeconds`,
`usableActiveSeconds`, `actions`, `repairActions`, `standardScore`,
`essentialScores`, `transfer`, `retention`, and `delayDays`. Scores are fractions;
delayed measures must cover 7–28 days. Missing participants remain in assigned
denominators; missing delayed measures leave the comparison incomplete.
Record outcomes for dropouts too. A ready claim with a held-out score below
90% or an essential score below 80% counts as false readiness.

The report always leaves the *learning benefit claim* pending review. Execute
the registered analysis and examine uncertainty, essential gaps,
completion/dropout, repair cost, and delayed transfer/retention. Keep the
weighted fallback available; if the accepted margins show a material
regression, switch the default back. Calibrate any future probability claims
in a separate held-out study. No learner comparison has been run by these tests.
