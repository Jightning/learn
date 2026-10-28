/* Synthetic only. This is a definition contract, not a learner achievement. */
export function masteryFixture() {
  const root = (id, skill, scoreFor, requiredAnchor, importance, policy) => ({
    id, label: `Demonstrate ${id}`, semanticVersion: 1, requiredAnchor, importance,
    skills: [skill], scoreFor, targetOwnerModule: "module-a", claimRequirement: "none", policy,
    anchors: [{ level: requiredAnchor, standard: `Perform at anchor ${requiredAnchor}`, facets: ["explain"] }],
    facets: [{ id: "explain", standard: "Explain observed reasoning", skills: [skill],
      anchors: [{ level: requiredAnchor, standard: "Defend a concrete calculation", criteria: ["correct", "reason"] }] }]
  });
  return {
    C: { objectives: { o: { importance: 3 }, other: { importance: 1 } },
      questionSkills: { a: { scoreFor: "o", objectives: ["o"] }, b: { scoreFor: "o", objectives: ["o"] }, c: { scoreFor: "other", objectives: ["other"] } } },
    source: {
      manifest: { schemaVersion: 1, required: { "mastery.targets": 1, "mastery.policies": 1 }, optional: {} },
      targets: { schemaVersion: 1, roots: [root("simple", "a", "o", 3, 3, "P3"), root("typical", "b", "o", 5, 4, "P45"),
        { ...root("advanced", "c", "other", 7, 8, "P67"), claimRequirement: "historical-evidence" }] },
      policies: { schemaVersion: 1, policies: [["P3", 2, 1], ["P45", 3, 2], ["P67", 4, 2]].map(([id, minGroups, minSessions]) => ({
        id, version: 1, minGroups, minSessions, noncriticalFloor: .8, delayDays: [2, 7, 21], unfamiliarConstraint: id === "P67",
        criteria: [{ id: "correct", standard: "Correct critical calculation", critical: true },
          { id: "reason", standard: "Explain the mechanism", critical: false }], entails: []
      })) }
    }
  };
}
