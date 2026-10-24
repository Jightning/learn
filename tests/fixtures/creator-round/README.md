# Six-case creator experiment

`cases.json` and the six source files define small synthetic tasks, approved as a
bounded experiment on 2026-10-19. `oracle.md` is evaluator-only. `slides-fixture.mjs`
generates a synthetic PPTX archive for extraction tests; it does not establish
PowerPoint rendering or legacy PPT conversion compatibility.

Use a fresh GPT-6 Luna Medium writer per case, sequentially, with the current
selected creator guidance and only that case. The ODE case starts without outline
approval; the controller supplies a recorded simulated decision after the proposal.
Other scopes are approved explicitly. One lesson and two meaningful questions are
sufficient only if they cover the bounded goal. Preserve initial output and allow
at most one correction per case. Review truth, teaching sequence, representations
and transfer independently; feed only actionable findings back to the writer.

Live artifacts are under `.scratch/creator-round/`; the consolidated evaluation
records observations and limits. Content trials do not exercise the complete
production CLI approval/finish lifecycle. Routing/schema/rendering tests cannot
measure learning, retention, model reliability or subscription savings.
