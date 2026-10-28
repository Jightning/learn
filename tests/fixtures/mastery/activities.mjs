import { masteryFixture } from "./root-policy.mjs";

/* One future learning slice. Package URLs/hashes are synthetic, not runnable labs. */
export function activityFixture() {
  const fixture = masteryFixture();
  fixture.C.subsections = { "s1-1": { title: "Cost ledger" } };
  fixture.C.questionBank = { "ledger-total": { id: "ledger-total" } };
  const activity = (id, kind, extra = {}) => ({ id, contentVersion: 1, evidenceVersion: 1,
    rubricVersion: 1, kind, lesson: "s1-1", required: true, wave: 1, group: id, support: "none",
    checkVisibility: "public", adapter: { id: ({ question: "question", "external-lab": "external-submission", "written-defense": "written-defense" })[kind] ?? kind, version: 1 },
    tests: [{ root: "simple", facet: "explain", skill: "a", anchor: 3, criteria: ["correct", "reason"] }], ...extra });
  fixture.activities = { schemaVersion: 1, manifest: { schemaVersion: 1,
    required: { "mastery.activities": 1, "adapter.question": 1, "adapter.external-submission": 1, "adapter.written-defense": 1 },
    optional: { "adapter.audio": 1, "adapter.trusted-evaluation": 1 } }, activities: [
    activity("ordinary", "question", { question: "ledger-total", support: "guided" }),
    activity("lab", "external-lab", { after: ["ordinary"],
      prerequisites: [{ root: "simple", skill: "a", minAnchor: 3 }],
      lab: { id: "cost-ledger", version: "1.0.0", url: "https://example.invalid/ledger-v1.zip", sha256: "0".repeat(64),
        instructions: "Download and verify the public package; fix the seeded rounding bug.", command: "python3 -m unittest", cleanup: "Remove the working folder." },
      environment: { capabilities: ["python3"], instructions: "Use Python 3 with the standard library." },
      timing: { active: [900, 1800], setup: [60, 300], feedback: [30, 120] },
      artifact: { mediaTypes: ["text/plain"], maxBytes: 32768 } }),
    activity("defense", "written-defense", { after: ["lab"], checkVisibility: "review" }),
    activity("repair", "question", { question: "ledger-total", after: ["defense"], support: "reference" }),
    activity("delayed", "question", { question: "ledger-total", after: ["repair"], group: "fresh-ledger",
      delay: { activity: "repair", root: "simple", days: 2, after: "qualifying-evidence-or-repair" } }),
    activity("future-audio", "audio", { required: false, fallback: "defense", artifact: { mediaTypes: ["audio/ogg"], maxBytes: 1000000 } }),
    activity("future-trusted", "trusted-evaluation", { required: false, checkVisibility: "private" })
  ] };
  return fixture;
}
