/* Due review uses every encountered concept, regardless of where its question
 * first appeared. The content pool combines subsection checks and variants. */
import { get, dueKeys, configOf } from "./retention.js";
import { retrievability } from "./schedule.js";
import { activeGoals, deadlinePlan } from "./learn-by.js";
import { forCourse } from "./log.js";
import { duePracticeTypes } from "./practice-policy.js";
import { selectScored } from "./practice-score.js";
import { retentionKeyFor, practiceRequirements } from "./questions.js";

export function dueCount(books, now = Date.now()) {
  return books.reduce((n, b) => n + dueKeys(b.cid, now).length, 0);
}

export function buildQueue(books, { limit = 20, now = Date.now(), used = new Set() } = {}) {
  if (books.some(book => activeGoals(book.cid, now).length)) return buildGoalQueue(books, { limit, now, used });
  const due = books.flatMap(book => dueKeys(book.cid, now).map(key => {
    const history = get(book.cid, key);
    const target = configOf(book.C).target;
    return { ...book, key, history,
      recall: history?.reps ? retrievability(history, now, target) : -1 };
  })).sort((a, b) => a.recall - b.recall);
  const rows = [];
  for (const entry of due) {
    if (rows.length >= limit) break;
    const candidates = (entry.items || []).filter(q => !q.quarantined && (!q.use || q.use === "practice") && retentionKeyFor(q) === entry.key);
    if (!candidates.length) continue;
    const seen = new Set(entry.history?.items || []);
    const item = candidates.find(q => !seen.has(q.id)) || candidates[0];
    rows.push({ cid: entry.cid, C: entry.C, item,
      reason: entry.history?.ok ? "Due for review" : "Previously missed" });
  }
  return rows;
}

function buildGoalQueue(books, { limit, now, used }) {
  const entries = books.flatMap(book => {
    const plan = deadlinePlan(book.idx, activeGoals(book.cid, now), forCourse(book.cid, book.C), { now });
    if (!plan.details.length) return [];
    return [{ book, plan, rows: forCourse(book.cid, book.C),
      versions: Object.fromEntries(Object.values(book.idx.BANK || {}).map(q => [q.id, q.contentVersion])) }];
  });
  const chosen = [], taken = new Set(used);
  while (chosen.length < limit) {
    const best = entries.flatMap(({ book, plan, rows, versions }) => {
      const localUsed = new Set([...taken].filter(key => key.startsWith(`${book.cid}:`)).map(key => key.slice(book.cid.length + 1)));
      const selected = selectScored(plan.pool, rows, { used: localUsed, types: book.idx.TYPES || {},
        bank: book.idx.BANK, diagnostics: book.idx.DIAGNOSTIC, inventory: book.idx.TYPES,
        standard: practiceRequirements(plan.details.map(d => d.standard)),
        dueTypes: duePracticeTypes(plan.pool, book.cid, undefined, now), goalPriorities: plan.priorities,
        goalReasons: plan.reasons, versions, remaining: limit - chosen.length });
      return selected.item ? [{ book, selected, score: selected.scores[0].score }] : [];
    }).sort((a, b) => b.score - a.score || a.book.cid.localeCompare(b.book.cid));
    if (!best.length) break;
    const { book, selected } = best[0];
    chosen.push({ cid: book.cid, C: book.C, item: selected.item, reason: selected.reason, help: selected.help, action: selected.action,
      decision: { policyVersion: 2, action: selected.action, probability: 1, deterministic: true,
        eligibleActions: [...new Set([...selected.scores.map(q => q.id), selected.item.id])] } });
    taken.add(`${book.cid}:${selected.item.id}`);
  }
  return chosen;
}
