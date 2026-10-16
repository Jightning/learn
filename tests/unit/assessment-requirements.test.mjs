import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureAssessmentRequirements, preserveAssessmentRequirements } from "../../tools/lib/assessment-requirements.mjs";

test("a required obligation cannot disappear by clearing its flag or deleting its family", () => {
  const dir = mkdtempSync(join(tmpdir(), "required-scope-"));
  try {
    const plan = { data: { families: [{ id: "needed", assessmentRequired: true }] } };
    captureAssessmentRequirements(plan, dir);
    plan.data.families = [];
    captureAssessmentRequirements(plan, dir);
    const report = preserveAssessmentRequirements({ assessmentReady: true, requiredFamilies: [] }, dir);
    assert.equal(report.assessmentReady, false);
    assert.equal(report.requiredFamilies[0].id, "needed");
    assert.match(report.requiredFamilies[0].missing[0], /removed|cleared/);
    const restored = preserveAssessmentRequirements({ assessmentReady: true, requiredFamilies: [{ id: "needed", complete: true }] }, dir);
    assert.equal(restored.assessmentReady, true);
    mkdirSync(join(dir, "bad"));
    writeFileSync(join(dir, "bad/required-assessment.yaml"), "families: bogus\n");
    assert.throws(() => preserveAssessmentRequirements({ requiredFamilies: [] }, join(dir, "bad")), /expected a list/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
