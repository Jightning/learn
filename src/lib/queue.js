/* Due review uses every encountered concept, regardless of where its question
 * first appeared. The content pool combines subsection checks and variants. */
import { get, dueKeys, configOf } from "./retention.js";
import { retrievability } from "./schedule.js";

export function dueCount(books, now = Date.now()) {
  return books.reduce((n, b) => n + dueKeys(b.cid, now).length, 0);
}

export function buildQueue(books, { limit = 20, now = Date.now() } = {}) {
  const due = books.flatMap(book => dueKeys(book.cid, now).map(key => {
    const history = get(book.cid, key);
    const target = configOf(book.C).target;
    return { ...book, key, history,
      recall: history?.reps ? retrievability(history, now, target) : -1 };
  })).sort((a, b) => a.recall - b.recall);
  const rows = [];
  for (const entry of due) {
    if (rows.length >= limit) break;
    const candidates = (entry.items || []).filter(q => q.concept === entry.key);
    if (!candidates.length) continue;
    const seen = new Set(entry.history?.items || []);
    const item = candidates.find(q => !seen.has(q.id)) || candidates[0];
    rows.push({ cid: entry.cid, C: entry.C, item,
      reason: entry.history?.ok ? "Due for review" : "Previously missed" });
  }
  return rows;
}
