import { selectAdaptive } from "../../src/lib/practice-policy.js";
import { selectMixed } from "../../src/lib/practice-pool.js";
import { orderEvents } from "../../src/lib/evidence.js";

/* Compare proposals against the same observed prefix. Unchosen proposals have
 * no observed learning outcome and cannot be scored as learner improvements. */
export function shadowPractice(idx, rows, seed = 1) {
  let randomState = seed >>> 0 || 1;
  const random = () => {
    randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5;
    return (randomState >>> 0) / 4294967296;
  };
  const pool = [...idx.QALL, ...idx.PALL].filter(q => !q.use || q.use === "practice");
  const versions = Object.fromEntries(Object.values(idx.BANK || {}).map(q => [q.id, q.contentVersion]));
  const prefix = [], decisions = [], latest = new Map();
  let policy = { actions: 0 };
  for (const row of orderEvents(rows)) {
    prefix.push(row);
    if (row.event !== "attempt" && row.loop !== "Q") continue;
    latest.set(row.itemId, row);
    policy = { ...policy, actions: policy.actions + 1 };
    const adaptive = selectAdaptive(pool, prefix, policy, new Set(), [], idx.BLUEPRINTS?.course,
      versions, idx.DIAGNOSTIC || [], idx.TYPES || {});
    policy = adaptive.policy;
    const baseline = selectMixed(pool, "shadow-only", { get: id => {
      const r = latest.get(id); return r ? { got: r.correct ? 1 : 0 } : null;
    } }, 1, random)[0];
    const lastType = type => prefix.reduce((at, r) => (r.typeId || r.concept || r.itemId) === type ? Math.max(at, r.ts) : at, 0);
    const type = q => q.typeId || q.concept || q.id;
    const rotated = [...pool].sort((a, b) => lastType(type(a)) - lastType(type(b)) ||
      (latest.get(a.id)?.ts || 0) - (latest.get(b.id)?.ts || 0) || a.id.localeCompare(b.id))[0];
    decisions.push({ after: row.id, observedItem: row.itemId, adaptive: adaptive.item?.id || null,
      reason: adaptive.reason, weightedRandom: baseline?.id || null, roundRobin: rotated?.id || null });
  }
  return { version: 1, seed, decisions, learningEffect: "unobserved for unchosen actions", promotion: "pending-learner-study" };
}
