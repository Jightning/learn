# Model evaluation task

You have received a self-contained course-authoring evaluation folder. Read
`README.md`, `SCHEMA.md`, and every file in `source/` before writing. Your task
is to produce an eight-lesson course sample that demonstrates whether you can
teach accurately at scale across mathematical derivation and technical claim
defense. Follow the output format exactly.

Write only inside `submission/`. Do not write `review.json` or modify the prompt,
source packet, schema, checker, or review rubric. The evaluator alone records
the teaching review. Do not use another model or delegate. You may
use a calculator or code for independent arithmetic checks, but explain the
reasoning a learner must be able to reproduce without one. Work in one pass;
do not ask the evaluator to fill in content that the packet supplies.

Produce all of these files:

- `plan.json`
- eight `lessons/<ID>.md` files, M1–M4 and S1–S4
- `figures.json`
- `questions.json`
- `practice.json`
- `checks.json`
- `audit.json`
- `self_audit.md`

The packet is your evidence. A statement in `source/draft-claims.md` may be
wrong or unknowable. Audit it; do not adopt it. The gateway project and resume
bullet are fictional. The synthetic replay can prove arithmetic about itself,
but it cannot prove how a person historically measured a resume claim. Keep
that distinction visible at the point of instruction and in answers.

Teach the reader described in `source/learner.md`. Build from the stated
background, define each new term before use, and never require a later lesson
to understand the current one. State an idea fully once and link back to it
later. Show every step needed to reconstruct worked mathematics and verify
results from the defining equation and initial values. For technical claims,
separate the unit, population, denominator, mechanism, evidence, and unknowns.

Figures must convey information the prose cannot. Produce actual figure data,
not a recommendation to add a picture later. Label axes or nodes and write alt
text that tells a reader what the figure shows. Questions must stand alone in
Review, use distinct skill types within a lesson, have correct model answers,
and explain the tempting wrong move. Practice variants must change the surface
while preserving the underlying skill.

The sample is intentionally long. Complete all eight lessons at real teaching
depth; an outline, a short survey, or a polished answer key does not satisfy
the task. If a source does not establish a personal or historical fact, mark
it unknown and teach how to verify it. No confident reconstruction may be
presented as a record.

Before finishing, run `python3 check.py submission` from this folder and fix
mechanical failures. The checker tests only part of quality. Re-read each
lesson as a learner seeing it for the first time. In your final message,
report the checker result, exact file paths, any unresolved uncertainty, and
which parts still require a human accuracy or teaching review. Do not claim
that a script pass proves the course is excellent.
