import { activityFixture } from "./activities.mjs";

/** File-map form of the same future pilot, with real canonical native links. */
export function masteryCourseFiles() {
  const { source, activities } = activityFixture();
  const { manifest, ...activityDocument } = activities;
  const json = JSON.stringify;
  return {
    "course.json": json({ code: "mastery-pilot", title: "Synthetic cost ledger" }),
    "categorize/concepts.json": json([{ id: "ledger", term: "Ledger" }]),
    "categorize/objectives.json": json([{ id: "o", importance: 3, families: ["ledger"] }, { id: "other", importance: 1, families: ["advanced"] }]),
    "categorize/families.json": json([{ id: "ledger", concept: "ledger", teach: ["s1-1"] }, { id: "advanced", concept: "ledger", teach: ["s1-1"] }]),
    "sections/01-ledger/1-costs.json": json({ title: "Cost ledger", blocks: [], quiz: ["ledger-total"] }),
    "questions/skills.json": json(["a", "b", "c"].map(id => ({ id, task: `Perform ${id}`, standard: `Defend ${id}`, family: id === "c" ? "advanced" : "ledger" }))),
    "questions/bank.json": json([{ id: "ledger-total", skills: ["a"], q: "What is 2 + 3?", response: { kind: "number", value: 5 }, why: "Add the costs.", verified: true }]),
    "mastery/manifest.json": json({ schemaVersion: 1, required: { ...source.manifest.required, ...manifest.required }, optional: manifest.optional }),
    "mastery/targets.json": json(source.targets),
    "mastery/policies.json": json(source.policies),
    "mastery/activities.json": json(activityDocument)
  };
}
