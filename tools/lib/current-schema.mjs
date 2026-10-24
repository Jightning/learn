/* Keep old question shapes readable at runtime, while making current authoring
 * and publish checks able to refuse fields that need an explicit migration. */
const LEGACY_FIELDS = ["a", "answer", "stem", "steps"];

const legacyFields = (C, item) => LEGACY_FIELDS.filter(key =>
  Object.hasOwn(item || {}, key) &&
  // Bank compilation validates typed steps and adds an empty list when absent.
  // Legacy inline steps are answer prose and still require migration.
  !(key === "steps" && item?.id && C.questionBank?.[item.id] === item));
const hasLegacyShape = (C, item) => !item?.response || legacyFields(C, item).length > 0;

export function legacyQuestionCounts(C) {
  const quiz = (C.sections || []).reduce((n, s) => n + (s.subs || []).reduce((m, u) =>
    m + (u.quiz || []).filter(item => hasLegacyShape(C, item)).length, 0), 0);
  const practice = Object.values(C.practice || {}).reduce((n, bank) => n +
    (bank.items || []).filter(item => hasLegacyShape(C, item)).length, 0);
  const drills = Object.values(C.drills || {}).reduce((n, bank) => n + (bank.items || []).length, 0);
  return { quiz, practice, drills };
}

export function migrationReportLine(id, C) {
  const { quiz, practice, drills } = legacyQuestionCounts(C);
  return `migration ${id.padEnd(10)} quiz ${quiz} · practice ${practice} · drill items ${drills}`;
}

export function strictCurrentIssues(C) {
  const issues = [];
  for (const s of C.sections || [])
    for (const u of s.subs || [])
      for (const item of u.quiz || []) {
        const legacy = legacyFields(C, item);
        if (!item.response || legacy.length) {
          const detail = [!item.response && "requires response:",
            legacy.length && `remove legacy field${legacy.length > 1 ? "s" : ""} ${legacy.join(", ")}`]
            .filter(Boolean).join("; ");
          issues.push(`${u.id}: question "${item.type || "(untitled)"}": strict current schema ${detail}`);
        }
      }

  for (const [key, bank] of Object.entries(C.practice || {}))
    for (const [i, item] of (bank.items || []).entries()) {
      const legacy = legacyFields(C, item);
      if (!item.response || legacy.length) {
        const detail = [!item.response && "requires response:",
          legacy.length && `remove legacy field${legacy.length > 1 ? "s" : ""} ${legacy.join(", ")}`]
          .filter(Boolean).join("; ");
        issues.push(`practice/${key} item ${i + 1}: strict current schema ${detail}`);
      }
    }

  const drillCount = Object.values(C.drills || {}).reduce((n, bank) => n + (bank.items || []).length, 0);
  if (drillCount)
    issues.push(`drills/: strict current authoring does not create drill banks; migrate ${drillCount} legacy item(s) to typed inline lesson questions or the reusable questions bank`);
  return issues;
}
