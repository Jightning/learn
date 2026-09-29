# Course authoring evaluation

Hand this entire folder to a candidate AI and ask it to follow [PROMPT.md](PROMPT.md).
The packet is self-contained. It uses original, synthetic source material inspired
by the kinds of reasoning needed in a mathematics course and a technical
interview course; it does not contain either real course or personal resume.

The AI writes only inside `submission/`. When it finishes, run:

```sh
python3 validation/check.py validation/submission
```

From another working directory, use absolute paths to both arguments. The
checker uses only the Python standard library. It reports `MECHANICAL PASS` or
`MECHANICAL FAIL`, with a reason for each failure. Then use
[REVIEW.md](REVIEW.md) to assess the actual teaching. Record those judgments in
`validation/review.json` yourself and run:

```sh
python3 validation/check.py validation/submission --review validation/review.json
```

`PASS SAMPLE` requires **every** mechanical and reviewer gate to pass. The
candidate's own checker run never supplies the review file.

This is an open-book work sample, not a secret exam. The AI can read the checker.
It tests whether it can produce and verify demanding course material under these
conditions. Neither a passing script nor one good sample proves it will write
two very large courses without later mistakes. For a production choice, repeat
the work sample with different source packets and inspect real rendered lessons.

The authoring format here is deliberately portable JSON and Markdown. It tests
source grounding, derivation, explanation, visual data, dependency design, and
question quality. It does not certify compatibility with any particular course
site's YAML schema or renderer.
