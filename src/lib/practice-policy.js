import { get as retentionGet } from './retention.js';
import { retentionKeyFor } from './questions.js';
import { POLICY, skillsOf } from './evidence.js';
import { selectScored } from './practice-score.js';
export function duePracticeTypes(pool, cid, lookup = retentionGet, now = Date.now()) {
  return [...new Set(pool.filter(q => !q.use || q.use === 'practice').filter(q => {
    const schedule = lookup(cid, retentionKeyFor(q));
    return schedule?.reps > 0 && (!schedule.dueAt || schedule.dueAt <= now);
  }).flatMap(q => skillsOf(q).length ? skillsOf(q) : [q.id]))];
}
/* Compatibility entry point. Coverage is rebuilt from events rather than
 * session-local counters, so a new session cannot reset its obligations. */
export function selectAdaptive(pool, rows, policy = {}, used = new Set(), dueTypes = [], blueprint = null, versions = null, diagnostics = [], inventory = {}) {
  const result = selectScored(pool, rows, { used, dueTypes, standard: blueprint, versions, diagnostics, inventory, types: inventory });
  return { ...result, policy: { ...policy, version: POLICY.version, actions: policy.actions || 0, lastType: result.targetSkill || result.item?.typeId } };
}
