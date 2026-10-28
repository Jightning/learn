/* Callers validate positive finite budgets and importance before allocation.
   Entries divide one fixed outcome budget; subordinate facets never add weight. */
export function allocateOutcomeWeights(entries, budgets) {
  const rawTotal = Object.values(budgets).reduce((sum, weight) => sum + weight, 0);
  const scale = Number.isFinite(rawTotal) ? 1 : Math.max(...Object.values(budgets));
  const total = scale === 1 ? rawTotal : Object.values(budgets).reduce((sum, weight) => sum + weight / scale, 0);
  const outcomes = Object.fromEntries(Object.entries(budgets).map(([id, weight]) => [id, (weight / scale) / total]));
  const weights = Object.create(null);
  for (const [id, budget] of Object.entries(outcomes)) {
    const members = entries.filter(entry => entry.scoreFor === id);
    const rawSum = members.reduce((n, entry) => n + entry.importance, 0);
    const max = Number.isFinite(rawSum) ? 1 : Math.max(...members.map(entry => entry.importance));
    const sum = max === 1 ? rawSum : members.reduce((n, entry) => n + entry.importance / max, 0);
    for (const entry of members) weights[entry.id] = budget * (entry.importance / max) / sum;
  }
  return { outcomes, weights };
}
