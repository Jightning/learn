# Authoring contract

Write reader-facing data under `courses/<id>/`. Treat the stated reader
background as the starting point: introduce what the course needs before
relying on it, and keep unknown or unsupported claims explicit as
`unverified`, `generated`, or an open issue.
Keep unrelated personal information out of course content. Cite sources by
filename; include source-relative folders only when needed to distinguish files,
never absolute local paths or usernames.

## Teaching

Teach a usable mental model from the reader's established knowledge. At first
use, answer the learner's central question in plain language: what kind of
thing is this, what does it do, and why use it? State the essential distinction
there; a name, implementation phrase or later example cannot stand in for the
answer. Give context when needed, without a compulsory opening formula.

Establish unfamiliar parts, actions and notation before describing their
interaction. Explain how the result follows and where the account applies.
Use diagrams routinely for connections, spatial structure and change, with
nearby interpretation. Choose their form for the inference, not the source's
file format. An analogy can make the model familiar when its
correspondence and limits are mapped back to the actual subject; it does not
replace the mechanism. Sources ground facts, not the author's wording or
explanatory route (see sources.md).

Develop concrete cases into reusable reasoning: expose unfamiliar decisions,
intermediate results, assumptions, checks and stopping conditions; fade known
steps. Keep a case fixed while explaining it, then vary a condition and show
what carries over. At topic or representation changes, state the connection.
Choose paragraphs, labeled cases and ordered steps by their teaching job
(see blocks.md); neither prose volume nor a picture count establishes clarity.
Introduce ingredients before comparing or summarizing them. Keep necessary
teaching in the main path, optional extensions nearby, and practice aligned
with the promised capability.

Read an introduction before reading its later examples: using only the stated
background and preceding passage, can the reader say what the concept does,
distinguish its relevant roles or cases, and understand the first prediction?
Repair the earliest unanswered question where it arises. Do not count an
answer found much later, your expert inference, correct tags or a finished
workflow as an adequate introduction.

For revisions, preserve approved capabilities, sources and useful identities,
not a broken explanatory sequence. Rebuild that account from understood facts
rather than patching its sentences or appending clarification. Remove
repetition without deleting necessary reasoning. No fixed word, block, visual
or analogy quota is required.

## Scope and workflow

Calibrate the reader, inventory sources and problem families, plan the
dependency order, write data, then review coverage, answers, reader-visible
output, and publish checks. The default reading teaches required material, and
section-end questions must support its outcome even without a separate Practice
area. Mark supplementary explanations and extensions `optional: true`. Establish an
explanation where first needed; reactivate it briefly when useful and develop
it further when a later use requires more. An application may revisit a skill
without repeating its full explanation.

Required capabilities need suitable teaching and assessment evidence; one
item may cover related families. Inventory is not a quota. Record why other
material is background, moved, or excluded. For source analysis, use the rules
in `sources.md`; give missing teaching explicit provenance. Require learner
research only when outside evidence is needed and benefits the goal. Bound it
in section-end questions with starting sources and evaluation; consolidate
findings before later reliance.
Do not outsource foundations.
A course may teach one small subject or a large curriculum. Use a structure
that achieves the reader goal without padding or omitting necessary
prerequisites and distinct problem families.

The stronger model owns scope, order, difficult judgment, and concise
correction instructions. The writer creates teaching, questions, answers, and
course files. The stronger model never rewrites, reformats, or mechanically
converts the writer packet. Record deliberate choices and open freedom so
local editorial decisions cannot silently change scope.

For bank courses, define each task type once with approved curriculum links;
store each question once and place lesson checks by ID. Generate related
practice/check siblings together, verify every answer, then review grouped
types and fresh-check representativeness. Keep shortages explicit; three
copies are no sufficiency guarantee. Indexes derive inheritance and
assessment weights; never ask a writer to synchronize duplicate inventories.
Select `bank` rules for this format. Runtime policy mathematics do not belong
in writer packets.
Before accepting a question, inspect its combined stimulus, prompt and feedback as the reader sees them: avoid duplicated setup, define unfamiliar symbols and units before use, keep complete equations inside math spans with explicit subscripts, and choose tolerances that accept sensible rounding while rejecting meaningful mistakes.
