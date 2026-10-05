import { buildIndex } from "./index.js";

/* Resolve identities from a saved unchanged legacy snapshot, not list positions
 * after editing. Ambiguous matches require an explicit reviewed mapping. */
const fingerprint = q => JSON.stringify([q.prompt, q.response, q.tries, q.stimulus]);
export function legacyQuestionAliases(previous, current, explicit = {}) {
  const old = buildIndex(previous), next = buildIndex(current);
  const items = [...old.QALL, ...old.PALL], bank = [...next.QALL, ...next.PALL, ...next.CHECK, ...next.DIAGNOSTIC]
    .filter(q => q.typeId);
  const aliases = Object.create(null), missing = [];
  for (const q of items) {
    if (q.typeId) continue;
    const matches = bank.filter(item => fingerprint(item) === fingerprint(q));
    const selected = explicit[q.id] ? matches.find(item => item.id === explicit[q.id]) : matches.length === 1 ? matches[0] : null;
    if (!selected) { missing.push({ id: q.id, reason: matches.length > 1 ? "ambiguous unchanged matches" : "no unchanged bank match" }); continue; }
    aliases[q.id] = selected.id;
  }
  for (const key of Object.keys(explicit)) if (!Object.hasOwn(aliases, key)) throw new Error(`explicit alias ${key} does not identify unchanged source content`);
  return { aliases, missing };
}

export function migrateLegacyRows(rows, aliases = {}) {
  return rows.map(row => {
    if (!Object.hasOwn(aliases, row.itemId) || row.typeId) return row;
    // Unknown first-try status cannot become unaided success during migration.
    return { ...row, legacyItemId: row.itemId, itemId: aliases[row.itemId], firstUnaided: null };
  });
}
