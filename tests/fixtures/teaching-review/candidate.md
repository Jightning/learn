# Candidate material (synthetic)

These are intentionally mixed-quality drafts. Evaluate each against its own declared reader and goal, using the matching source unit/question.

## proc-1

Reader: can add whole numbers and read times. Goal: find the first batch that satisfies a cumulative request and report when records are insufficient.

Lesson: Select the first batch whose cumulative quantity reaches the request. In the source example, the answer is the 09:00 batch.

Question: Records are (08:00, 2), (09:00, 6), (10:00, 4). Request 7. Which batch first reaches it? Answer: second; cumulative total is 8.

## Diagram contrast (mech-1)

Unlabeled draft: [sensor] → [controller] → [valve] → [tank] → [sensor].

Labeled draft: [read L] → [compare L with T] → [L<T: inlet; L>T: drain; L=T: both closed] → [valves change level] → [read L again].

The source question remains the 54/61/60 cm case above.

## Research tasks (interp-1)

Needed source-consultation task, for a goal that includes evaluating real causal claims: inspect a follow-up study linked by the course. Use its Methods and Results to identify assignment, measured outcome, and uncertainty; explain whether its findings strengthen the survey's causal interpretation. Supply the study before assigning the task. Feedback must evaluate those features against the actual study. The current fictional survey goal alone does not warrant adding it.

Gratuitous learner task: search for a general study about whether charts are better than prose, then add a citation to this invented survey interpretation. The task gives no evidence about these fictional records and does not help answer their source question.

## mech-1

Reader: knows greater-than, less-than, and can compare whole-number measurements. Goal: use the controller rule to predict action, distinguish reporting from changing the level, and update after a reading.

Lesson: The sensor reports the level and the valves change it. Below target, open the inlet; above target, open the drain; at target, close both. For target 60 cm, at 54 cm the inlet opens; at 61 cm the drain opens; at 60 cm both close. After an action, read again because the new level may cross the target. The controller responds to the current reading, not to which valve acted before.

Question: A second tank has target 40 cm and reads 37 cm. Name the action and the next measurement needed. Answer: open inlet, then read the sensor again.

## interp-1

Reader: can subtract and express a difference as percentage points. Goal: state a descriptive comparison and limit inference to what the survey measured.

Lesson: A: 18/30 = 60%; B: 12/30 = 40%; difference = 20 percentage points. This describes stated intention in the surveyed visitors. Self-selection means the site cannot be said to cause the difference, and intention is not an observed return visit.

Question: Can these records establish that visitors returned more often to Site A? Answer: No; actual later visits were not measured.
