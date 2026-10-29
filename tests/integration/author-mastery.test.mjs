import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { learningSliceFiles } from '../fixtures/mastery/learning-slice.mjs';
import { ledgerPackage } from '../../examples/mastery-cost-ledger/package.mjs';
import { readPlan, planCoverage, buildPacket, planSignature } from '../../tools/lib/author-packets.mjs';
import { reviewIndex, changedItems, affectedItems, fullItems, screenPackets, reviewContext,
  acceptReview, recordReviewView, saveIssues, saveCorrections } from '../../tools/lib/author-review.mjs';
import { loadContext } from '../../tools/lib/author-context.mjs';
import { assessmentRequirementIssues, captureAssessmentRequirements } from '../../tools/lib/assessment-requirements.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'author-mastery-')), state = join(dir, '.state');
  const put = (path, value) => { mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), typeof value === 'string' ? value : JSON.stringify(value)); };
  const get = path => JSON.parse(readFileSync(join(dir, path), 'utf8'));
  for (const [path, content] of Object.entries(learningSliceFiles(ledgerPackage().sha256))) put(path, content);
  put('categorize/concepts.json', [{ id: 'ledger-concept', term: 'Ledger' }]);
  const originalFamilies = get('categorize/families.json');
  for (const family of originalFamilies) family.concept = 'ledger-concept';
  put('categorize/families.json', originalFamilies);
  const facets = ['calculate', 'build', 'debug', 'explain'].map(facet => ({ root: 'simple', facet, anchor: 3,
    kind: facet === 'explain' ? 'written-defense' : 'external-lab' }));
  const family = get('categorize/families.json')[0];
  Object.assign(family, { assessmentRequired: true, disposition: 'teach',
    sources: [{ source: 'generated', unit: 'ledger-brief', provenance: 'Synthetic S12 teaching slice' }],
    activities: ['lab', 'defense'], requiredFacets: facets });
  put('categorize/families.json', [family, get('categorize/families.json')[1]]);
  const unitPath = 'sections/01-ledger/1-costs.json', unit = get(unitPath);
  for (const block of unit.blocks) Object.assign(block, { family: 'ledger', objectives: ['o'] });
  put(unitPath, unit);
  put('materials/plan.yaml', 'lessons:\n  - id: s1-1\n    objectives: [o]\n    families: [ledger]\n');
  const lesson = { id: 's1-1', file: join(dir, unitPath) };
  const report = options => planCoverage(readPlan(dir), [lesson], options);
  try { return fn({ dir, state, put, get, family, unitPath, lesson, report }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('S12 practical tasks cover required facets while source and substantive teaching remain mandatory', () => fixture(({ put, get, family, unitPath, report, dir, state }) => {
  const row = report().requiredFamilies[0];
  assert.equal(row.complete, true, row.missing.join('; '));
  assert.deepEqual(row.activities, ['lab', 'defense']);
  assert.ok(row.tasks.includes('mastery-activity-lab'));
  assert.deepEqual(row.sources, family.sources);
  assert.deepEqual(assessmentRequirementIssues(dir, state), []);
  family.sources = [{ source: 'unknown', unit: 'missing' }]; put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]);
  assert.equal(report({ verifySource: () => { throw new Error('missing'); } }).assessmentReady, false);
  family.sources = [{ source: 'generated', unit: 'brief', provenance: 'Synthetic' }]; put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]);
  const unit = get(unitPath); unit.blocks = [{ t: 'p', label: 'Implement', family: 'ledger', objectives: ['o'] }]; put(unitPath, unit);
  assert.match(report().requiredFamilies[0].missing.join('; '), /substantive main-path/);
}));

test('questions, wrong kinds, unmapped/partial/unavailable activity evidence cannot satisfy practical requirements', () => fixture(({ put, get, family, report }) => {
  const original = structuredClone(family);
  for (const activities of [['ordinary'], ['missing'], ['future-audio'], ['defense']]) {
    family.activities = activities; put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]);
    assert.equal(report().assessmentReady, false, activities.join());
  }
  Object.assign(family, original); put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]);
  const activities = get('mastery/activities.json');
  activities.activities.find(a => a.id === 'lab').tests[1].criteria = ['correct']; put('mastery/activities.json', activities);
  assert.match(report().requiredFamilies[0].missing.join('; '), /simple\/build/);
  activities.activities.find(a => a.id === 'lab').tests[1].criteria = ['correct', 'reason']; put('mastery/activities.json', activities);
  delete family.requiredFacets; put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]);
  assert.equal(report().assessmentReady, false);
  family.requiredFacets = original.requiredFacets; put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]);
  const skills = get('questions/skills.json'); skills[0].family = 'advanced';
  put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]); put('questions/skills.json', skills);
  assert.throws(() => report(), /contradictory scoring ownership/);
}));

test('activity/rubric changes preserve stable IDs and require current changed-item review', () => fixture(({ dir, state, put, get }) => {
  const before = reviewIndex(dir, state), lab = 'mastery-activity-lab';
  const originalSignature = planSignature(readPlan(dir), 's1-1');
  const ids = before.entries.map(e => e.id);
  assert.ok(ids.includes(lab));
  assert.ok(ids.includes('mastery-policy-P3'));
  assert.ok(!get('mastery/activities.json').activities.some(a => a.authorId));
  assert.throws(() => acceptReview(state, before), /needs current screen/);
  for (const entry of before.entries.filter(e => e.kind.startsWith('mastery-'))) {
    rmSync(join(state, 'review-views.yaml'), { force: true });
    recordReviewView(state, before, ids.filter(id => id !== entry.id));
    assert.throws(() => acceptReview(state, before), /needs current screen/);
    recordReviewView(state, before, ids);
    const stale = structuredClone(before); stale.entries.find(e => e.id === entry.id).hash = 'stale';
    assert.throws(() => acceptReview(state, stale), /needs current screen/);
  }
  const issue = saveIssues(state, before, { items: [{ id: 'rubric-fix', target: lab, issue: 'Clarify reason', done: 'Rubric distinguishes explanation' }] });
  const policies = get('mastery/policies.json'); policies.policies[0].criteria[1].standard += ' Explain rounding order.'; put('mastery/policies.json', policies);
  const after = reviewIndex(dir, state);
  assert.notEqual(planSignature(readPlan(dir), 's1-1'), originalSignature);
  assert.deepEqual(after.entries.map(e => e.id), ids);
  const changes = changedItems(before, after);
  assert.ok(changes.find(e => e.id === lab).affectedVersions.includes('rubric'));
  assert.ok(!fullItems(after, [lab]).find(e => e.id === lab).content.compatibility);
  assert.ok(changes.some(e => e.id === 'mastery-policy-P3'));
  const affected = affectedItems(after, changes.map(c => c.id), before);
  assert.ok(affected.some(e => e.kind === 'block'));
  assert.ok(affected.some(e => e.id === 'mastery-activity-defense'));
  const review = saveCorrections(state, after, { results: [{ issue: issue.issues[0].id, disposition: 'fixed', affected: [lab] }] });
  assert.throws(() => acceptReview(state, after), /needs recheck/);
  const packets = screenPackets(after, readPlan(dir), { changed: true, review });
  assert.ok(packets.flatMap(p => p.items).some(e => e.id === lab && e.change === 'changed'));
  assert.ok(fullItems(after, [lab]).some(e => e.id === 'mastery-policy-P3'));
  assert.ok(reviewContext(after, readPlan(dir)).map.find(e => e.id === lab).references.includes('mastery-target-simple'));
  recordReviewView(state, after, affected.map(e => e.id));
  // Existing question-bank inventory acceptance stays independent.
  const inventoryExceptions = Object.fromEntries(after.entries.filter(e => e.kind === 'question-type').map(e => [e.content.id, 'Bounded synthetic pilot inventory.']));
  acceptReview(state, after, { inventoryExceptions });
  const changedLab = get('mastery/activities.json'); changedLab.activities.find(a => a.id === 'lab').rubricVersion++;
  put('mastery/activities.json', changedLab);
  assert.throws(() => acceptReview(state, reviewIndex(dir, state), { inventoryExceptions }), /needs recheck/);
}));

test('mastery writer packets select opt-in recipes and preserve source routes and public-only package boundaries', () => fixture(({ dir, put, lesson, family }) => {
  const context = loadContext(join(root, 'authoring'));
  const plan = readPlan(dir);
  const packet = buildPacket({ context, plan, subsection: lesson, phase: 'write', sourceRefs: family.sources });
  assert.ok(packet.rules.some(path => path.endsWith('/mastery.md')));
  assert.deepEqual(packet.sourceRefs, family.sources);
  assert.ok(packet.mastery.activities.find(a => a.id === 'lab').lab.sha256);
  assert.equal(packet.mastery.targets.length, 1);
  assert.ok(!JSON.stringify(packet).includes('test_private.py'));
  put('mastery/private.json', { tests: 'must not distribute' });
  assert.throws(() => reviewIndex(dir, join(dir, '.state')), /unsupported mastery file/);
}));

for (const engine of ['tools', 'plugin/scripts']) test(`${engine} indexes/screens/expands S12 activities via CLI`, () => fixture(({ dir, state }) => {
  // AUTHOR_WORKSPACE resolves the fixture through courses/probe, without Git.
  const workspace = mkdtempSync(join(tmpdir(), 'mastery-cli-'));
  const call = (...args) => spawnSync(process.execPath, [join(root, engine, 'author.mjs'), args[0], 'probe', ...args.slice(1)],
    { encoding: 'utf8', env: { ...process.env, AUTHOR_WORKSPACE: workspace } });
  try {
    cpSync(dir, join(workspace, 'courses/probe'), { recursive: true });
    for (const args of [['index'], ['screen'], ['packet', '--ids', 'mastery-activity-lab', '--expand']]) {
      const result = call(...args);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    const packet = readFileSync(join(workspace, '.author/probe/packets/review-items.yaml'), 'utf8');
    assert.match(packet, /mastery-activity-lab/);
    assert.match(packet, /mastery-policy-P3/);
    assert.ok(!packet.includes('test_private.py'));
  } finally { rmSync(workspace, { recursive: true, force: true }); }
}));

 test('captured practical obligations cannot be removed to bypass finish or pack', () => fixture(({ dir, state, put, family }) => {
  captureAssessmentRequirements(readPlan(dir), state);
  family.requiredFacets = family.requiredFacets.filter(f => f.facet !== 'build');
  put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]);
  captureAssessmentRequirements(readPlan(dir), state);
  assert.match(assessmentRequirementIssues(dir, state).join('; '), /practical facet was removed/);
}));

test('malformed facets, absent artifacts and unsupported definitions fail visibly', () => fixture(({ put, get, family, report }) => {
  const original = structuredClone(family.requiredFacets);
  for (const facets of [[], [null], [{ ...original[0], anchor: '3' }], [original[0], { kind: original[0].kind, anchor: 3, facet: 'calculate', root: 'simple' }]]) {
    family.requiredFacets = facets;
    put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]);
    assert.equal(report().assessmentReady, false);
  }
  family.requiredFacets = original;
  put('categorize/families.json', [family, { id: 'advanced', concept: 'ledger-concept', teach: ['s1-1'] }]);
  const activities = get('mastery/activities.json'); delete activities.activities.find(a => a.id === 'lab').artifact;
  put('mastery/activities.json', activities);
  assert.equal(report().assessmentReady, false);
  const manifest = get('mastery/manifest.json'); manifest.required['adapter.unknown'] = 1;
  put('mastery/manifest.json', manifest);
  assert.throws(() => report(), /unsupported required capability/);
}));
