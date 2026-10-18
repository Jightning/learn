# Synthetic source excerpts and source questions

All material here is invented for evaluation; it is not empirical or external evidence.

## proc-1 — Batch lookup and stopping

To find the first batch whose cumulative quantity reaches a requested amount, sort batches by increasing start time. Track a running total from zero. Add each batch quantity in order; stop at the first batch for which the total is at least the requested amount. If no batch reaches it, report that the request exceeds the recorded total. Example records: (09:00, 5), (08:00, 2), (10:00, 4). Request: 7. The cumulative total equals 7 at 09:00. For request 12, the total is 11 and no batch reaches it.

**Source question:** The records are deliberately unsorted. Which batch first reaches 7 after ordering, and what should be reported for 12?

## mech-1 — Threshold controller

A tank controller reads level L and compares it with target T. If L is below T, it opens the inlet. If L is above T, it opens the drain. If L equals T, it closes both. The level sensor reports the level; valves change it. After an action, the controller reads again. The rule assumes the sensor is working and the valves respond.

**Source question:** At target 60 cm, the sensor reads 54 cm and later 61 cm. Which valve acts at each reading, and what should happen at 60 cm?

## interp-1 — Two-site comparison

In a fictional survey, 18 of 30 visitors at Site A said they would return; at Site B, 12 of 30 did. Visitors selected the site themselves. The survey measured stated intention, not later visits. The observed difference is 20 percentage points. The records do not establish that site conditions caused the difference.

**Source question:** What descriptive difference is supported, and what causal or behavioral conclusion is not supported?
