/* Keep old question shapes readable at runtime, while making current authoring
 * and publish checks able to refuse fields that need an explicit migration. */
const LEGACY_FIELDS = ["a", "answer", "stem", "steps"];

const hasLegacyShape = item => !item?.response ||
  LEGACY_FIELDS.some(key => Object.hasOwn(item || {}, key));

export function legacyQuestionCounts(C) {
  const quiz = (C.sections || []).reduce((n, s) => n + (s.subs || []).reduce((m, u) =>
    m + (u.quiz || []).filter(hasLegacyShape).length, 0), 0);
  const practice = Object.values(C.practice || {}).reduce((n, bank) => n +
    (bank.items || []).filter(hasLegacyShape).length, 0);
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
        const legacy = LEGACY_FIELDS.filter(key => Object.hasOwn(item || {}, key));
        if (!item.response || legacy.length) {
          const detail = [!item.response && "requires response:",
            legacy.length && `remove legacy field${legacy.length > 1 ? "s" : ""} ${legacy.join(", ")}`]
            .filter(Boolean).join("; ");
          issues.push(`${u.id}: question "${item.type || "(untitled)"}": strict current schema ${detail}`);
        }
      }

  for (const [key, bank] of Object.entries(C.practice || {}))
    for (const [i, item] of (bank.items || []).entries()) {
      const legacy = LEGACY_FIELDS.filter(field => Object.hasOwn(item || {}, field));
      if (!item.response || legacy.length) {
        const detail = [!item.response && "requires response:",
          legacy.length && `remove legacy field${legacy.length > 1 ? "s" : ""} ${legacy.join(", ")}`]
          .filter(Boolean).join("; ");
        issues.push(`practice/${key} item ${i + 1}: strict current schema ${detail}`);
      }
    }

  const drillCount = Object.values(C.drills || {}).reduce((n, bank) => n + (bank.items || []).length, 0);
  if (drillCount)
    issues.push(`drills/: strict current schema requires variants in practice/<concept>.yaml; migrate ${drillCount} legacy drill item(s)`);
  return issues;
}
