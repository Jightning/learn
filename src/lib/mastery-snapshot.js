import { compileMastery } from './mastery-schema.js';
import { compileActivities, ACTIVITY_CAPABILITIES } from './activity-schema.js';
import { masterySignatures } from './mastery-versions.js';
import { activityInputHash } from './activity-events.js';

const omit = (x, fields) => Object.fromEntries(Object.entries(x).filter(([k]) => !fields.includes(k)));
const manifest = x => omit(x, ['unavailable']);
const pick = (x, fields) => Object.fromEntries(fields.filter(k => x[k] !== undefined).map(k => [k, x[k]]));

/* Keep public definitions once per version, outside preferences and event rows.
 * Restore recompiles them: imported derived indexes are never authoritative. */
export function masterySnapshot(C) {
  if (!C?.mastery || !C.activityIndex) throw new Error('Resolved mastery activities required');
  return structuredClone({
    native: {
      code: C.code,
      objectives: C.objectives,
      questionSkills: C.questionSkills,
      questionBank: Object.fromEntries([...new Set(Object.values(C.activityIndex.activities).map(a => a.question).filter(Boolean))]
        .map(id => [id, pick(C.questionBank[id], ['id', 'q', 'response', 'stimulus', 'tries', 'steps', 'skills', 'demand', 'support', 'group', 'demonstrates', 'representation', 'routes'])])),
      sections: C.sections.map(s => ({ id: s.id, subs: s.subs.map(u => ({ id: u.id })) }))
    },
    source: {
      manifest: manifest(C.mastery.manifest),
      targets: { schemaVersion: 1, roots: Object.values(C.mastery.roots).map(root => ({
        ...omit(root, ['contentSignature', 'rubricSignature', 'organizationSignature', 'anchors', 'facets']),
        anchors: Object.values(root.anchors),
        facets: Object.values(root.facets).map(facet => ({ ...facet, anchors: Object.values(facet.anchors) }))
      })) },
      policies: { schemaVersion: 1, policies: Object.values(C.mastery.policies).map(p => ({ ...p, criteria: Object.values(p.criteria) })) }
    },
    activities: { schemaVersion: 1, manifest: manifest(C.activityIndex.manifest),
      activities: Object.values(C.activityIndex.activities).map(a => omit(a,
        ['availability', 'contentSignature', 'evidenceSignature', 'rubricSignature', 'organizationSignature'])) }
  });
}

export function resolveMasterySnapshot(snapshot) {
  const errors = [];
  try {
    const C = structuredClone(snapshot.native);
    if (typeof C.code !== 'string' || !C.code || !Array.isArray(C.sections)) throw new Error('Missing native definitions');
    C.subsections = Object.fromEntries(C.sections.flatMap(s => s.subs.map(u => [u.id, u])));
    C.mastery = compileMastery(C, snapshot.source, errors, ACTIVITY_CAPABILITIES);
    C.activityIndex = compileActivities(C, C.mastery, snapshot.activities, errors);
    if (!C.mastery || !C.activityIndex || errors.length) throw new Error(errors.join('; '));
    masterySignatures(C);
    return C;
  } catch (e) { throw new Error(`Invalid mastery definition snapshot: ${e.message}`); }
}

export async function snapshotIdentity(snapshot) {
  if (new TextEncoder().encode(JSON.stringify(snapshot)).length > 2 * 1024 * 1024)
    throw new Error('Mastery definition snapshot exceeds 2 MiB; split the course definitions');
  resolveMasterySnapshot(snapshot);
  return activityInputHash(snapshot);
}
