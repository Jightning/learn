# Request-cost ledger 1.0.0

A ledger is a list of billable requests. Fix `total_cents(path)` in `ledger.py`.
For each row multiply units by dollars per unit, convert to cents, round half
up to a whole cent, then sum those rounded cents. Inputs are nonnegative decimal
strings, with the CSV header shown in `data/base.csv`. An empty ledger costs 0.
Do not change the input files or tests. No packages, network or account required.

1. Use an installed **CPython 3.11–3.14**. In a terminal, `python3 --version`
   prints the version. The Windows equivalent is `py -3` in place of `python3`.
2. Open a terminal in this extracted folder (the one containing `ledger.py`).
3. Run the single test command: `python3 -B -m unittest -v`.
   The starter intentionally fails. Read the expected and actual totals.
4. Edit only `ledger.py`, rerun the same command, and retain your code and report.

Worked example: each base request costs $0.005 = 0.5 cents. Half-up means an
exact half rounds toward the larger nonnegative integer: each request costs
1 cent, so the bill is 1 + 1 = 2 cents. Rounding only the sum gives 1 cent.
`Decimal` reads the input strings exactly; converting through `float` first
can introduce representation error. Move the rounding inside the per-row
calculation. Check the empty file as well as the rounding boundary.

Before viewing feedback, explain why rounding placement matters and commit
that explanation in the study site. A reviewer then chooses a fresh follow-up,
for example a new boundary case, and you commit its answer. Report assistance,
active time, setup time and your runtime. Submit code/report text or an HTTPS
artifact reference with its SHA-256; the site stores references, not file bytes.

After feedback, repair your reasoning, then solve `fresh.csv` without consulting
your earlier answer. Later use `delayed.csv` after the required two-day wait.
These are public practice variants. Independent assessment requires a reviewer
to supply a separate fresh task and private checks; these examples cannot prove
private-test performance, verified mastery, or genuine elapsed learner retention.

If Python is missing or the version is unsupported, record an environment gap.
Use the worked arithmetic and written defense as a fallback while arranging an
external runtime; they do not satisfy the build/debug requirement. If `ledger`
cannot be imported, change into this folder. A failed assertion in the starter
is expected; an unavailable runtime is not a skill failure.

Reset: extract a fresh copy into a new folder. Keep the old folder if it holds
work you want to retain. Cleanup: remove only your disposable extracted copy.
Do not run commands merely because an imported course lists them; inspect the
package first. Importing the course never launches this code.
