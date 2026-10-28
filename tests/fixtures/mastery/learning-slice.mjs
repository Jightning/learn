import { masteryCourseFiles } from './course.mjs';

/** Synthetic public practice slice. URL is intercepted by browser tests, never
 * advertised as deployed. The caller binds the real locally built ZIP hash. */
export function learningSliceFiles(sha256) {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Actual lab package SHA-256 required');
  const files = masteryCourseFiles(), read = path => JSON.parse(files[path]);
  const write = (path, value) => { files[path] = JSON.stringify(value); };
  write('course.json', { code: 'ledger-slice', title: 'Request-cost ledger practice', state: { enabled: true } });
  write('sections/01-ledger/_section.json', { title: 'Request costs' });
  const skills = read('questions/skills.json');
  skills[0].task = 'Calculate and defend request costs';
  skills[0].standard = 'Show rounded cents for each request and explain the sum';
  write('questions/skills.json', skills);
  const targets = read('mastery/targets.json'), root = targets.roots[0];
  root.label = 'Build and defend a request-cost ledger';
  const standards = { calculate: 'Round each request half-up to cents before summing',
    build: 'Implement the CSV ledger using exact decimal strings',
    debug: 'Locate the rounding-placement bug and demonstrate a boundary case',
    explain: 'Defend rounding order and answer a fresh reviewer follow-up' };
  root.anchors[0].facets = Object.keys(standards);
  root.facets = Object.entries(standards).map(([id, standard]) => ({ id, standard, skills: ['a'],
    anchors: [{ level: 3, standard, criteria: ['correct', 'reason'] }] }));
  targets.roots = [root]; write('mastery/targets.json', targets);
  const policies = read('mastery/policies.json'); policies.policies = [policies.policies[0]];
  policies.policies[0].delayDays = [2]; write('mastery/policies.json', policies);
  write('sections/01-ledger/1-costs.json', { title: 'Build a request-cost ledger', blocks: [
    { t: 'p', h: 'A ledger lists billable requests. A unit price is the dollar cost of one unit. Compute each request as units × unit price, convert dollars to cents (× 100), round half-up, and sum. Half-up rounds an exact positive half to the next integer.' },
    { t: 'p', h: 'Worked example: two requests each cost $0.005. Each is 0.5 cents, rounded to 1 cent. Total: 1 + 1 = 2 cents. Summing dollars first gives $0.010 = 1 cent; that violates the per-request billing rule. Decimal reads decimal strings exactly; passing through float can change the boundary.' },
    { t: 'p', h: 'Practice: answer the ordinary question, then use the public Python package outside the site. Fix ledger.py and retain the code, test report and runtime. Missing Python is an environment gap: use the arithmetic explanation while arranging a runtime; this does not complete build/debug evidence.' },
    { t: 'p', h: 'Commit your explanation and a reviewer-selected fresh follow-up before viewing feedback. Rubric: correct per-request arithmetic; CSV implementation; a boundary-case bug diagnosis; a causal explanation. Each facet is scored separately. Public checks and reviewer claims remain provisional.' },
    { t: 'p', h: 'After feedback, revisit the worked example and explain the correction, then solve fresh.csv and defend it. Wait two days from qualifying evidence before delayed.csv and another defense. Attempt the delayed task without consulting earlier work. Export and restore preserve reports and references, not missing file bytes or reviewer authority.' }
  ], quiz: ['ledger-total', 'ledger-repair'] });
  const q = (id, prompt, value, why) => ({ id, skills: ['a'], q: prompt, response: { kind: 'number', value }, why, verified: true });
  write('questions/bank.json', [q('ledger-total', 'Two requests cost $0.005 each. Round each half-up to cents. What total cents are billed?', 2, 'Each half-cent rounds to 1 cent; 1 + 1 = 2.'),
    q('ledger-repair', 'Repair check: two requests cost $0.015 each. What is the per-request rounded total in cents?', 4, 'Each 1.5-cent request rounds to 2 cents, so the total is 4, not 3.')]);
  const original = read('mastery/activities.json').activities;
  const base = original[0], lab = original[1];
  const tests = facets => facets.map(facet => ({ root: 'simple', facet, skill: 'a', anchor: 3, criteria: ['correct', 'reason'] }));
  const activity = (id, kind, after, facets, extra = {}) => ({ ...base, id, kind, after, group: id,
    support: 'none', question: undefined, tests: tests(facets), adapter: { id: kind === 'question' ? 'question' : kind === 'external-lab' ? 'external-submission' : kind, version: 1 },
    timing: { active: [60, 300], feedback: [30, 60] }, ...extra });
  const labFields = { lab: { ...lab.lab, url: 'https://ledger.invalid/cost-ledger-1.0.0.zip', sha256,
    instructions: 'Local package: examples/mastery-cost-ledger/public. See README.md; this reserved test URL is not deployed.', command: 'python3 -B -m unittest -v' },
    environment: lab.environment, artifact: lab.artifact, timing: { active: [300, 900], setup: [0, 180], feedback: [30, 60] } };
  const delay = activity => ({ activity, root: 'simple', days: 2, after: 'qualifying-evidence-or-repair' });
  write('mastery/activities.json', { schemaVersion: 1, activities: [
    activity('ordinary', 'question', [], ['calculate'], { support: 'guided', question: 'ledger-total' }),
    activity('lab', 'external-lab', ['ordinary'], ['calculate', 'build', 'debug'], labFields),
    activity('defense', 'written-defense', ['lab'], ['explain'], { checkVisibility: 'review' }),
    activity('repair', 'question', ['defense'], ['calculate'], { question: 'ledger-repair', support: 'reference' }),
    activity('fresh', 'external-lab', ['repair'], ['calculate', 'build', 'debug'], { ...labFields,
      lab: { ...labFields.lab, instructions: 'Fresh public practice: solve data/fresh.csv, retain your code and boundary reasoning, then continue to fresh-defense.' } }),
    activity('fresh-defense', 'written-defense', ['fresh'], ['explain'], { checkVisibility: 'review' }),
    activity('delayed', 'external-lab', ['fresh-defense'], ['calculate', 'build', 'debug'], { ...labFields, delay: delay('fresh'),
      lab: { ...labFields.lab, instructions: 'Delayed public practice: after two days from qualifying evidence, solve data/delayed.csv and continue to delayed-defense. Do not consult earlier work.' } }),
    activity('delayed-defense', 'written-defense', ['delayed'], ['explain'], { delay: delay('fresh-defense'), checkVisibility: 'review' }),
    ...original.filter(a => a.id.startsWith('future-')).map(a => ({ ...a, tests: tests(['explain']), timing: { active: [60, 120], feedback: [30, 60] } })),
    activity('future-cloud', 'external-lab', [], ['build'], { ...labFields, required: false, fallback: 'defense',
      environment: { capabilities: ['cloud-account', 'unreal-engine'], instructions: 'No cloud account or Unreal project supplied. Operational work unavailable.' } })
  ] });
  return files;
}
