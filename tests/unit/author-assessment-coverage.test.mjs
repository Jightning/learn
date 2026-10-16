import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as YAML from 'js-yaml';
import { indexPlan, planCoverage } from '../../tools/lib/author-packets.mjs';

function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'assessment-coverage-'));
  mkdirSync(join(dir, 'materials'), { recursive: true });
  mkdirSync(join(dir, 'questions'), { recursive: true });
  const lessonFile = join(dir, 's1-1.yaml');
  const plan = { path: join(dir, 'materials', 'plan.yaml'), hash: 'plan-hash', data: {
    objectives: [{ id: 'obj-method', families: ['family-method'] }],
    concepts: [{ id: 'concept-method' }],
    families: [{ id: 'family-method', disposition: 'teach', assessmentRequired: true,
      sources: [{ source: 'review-test', unit: 'problem-4' }], teach: ['s1-1'], questions: ['method-type'] }],
    lessons: [{ id: 's1-1', objectives: ['obj-method'], families: ['family-method'] }]
  } };
  const type = { id: 'method-type', task: 'Apply the method', concept: 'concept-method',
    objectives: ['obj-method'], families: ['family-method'], teach: ['s1-1'] };
  const item = { id: 'method-practice', typeId: 'method-type', q: 'Solve a changed case.',
    response: { kind: 'self', model: 'Show the substitution and check the result.' } };
  const unit = { blocks: [{ authorId: 'block-method', t: 'p', family: 'family-method',
    objectives: ['obj-method'], concept: 'concept-method', h: '<p>Use the substitution to reduce the order.</p>' }],
    quiz: [] };
  const save = () => {
    writeFileSync(join(dir, 'questions', 'types.yaml'), YAML.dump([type]));
    writeFileSync(join(dir, 'questions', 'bank.yaml'), YAML.dump([item]));
    writeFileSync(lessonFile, YAML.dump(unit));
  };
  save();
  try { fn({ dir, plan, unit, type, item, lesson: { id: 's1-1', file: lessonFile }, save }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('declared family obligation requires source, substantive linked teaching and an actual mapped task', () => fixture(({ plan, lesson }) => {
  const report = planCoverage(plan, [lesson]);
  assert.equal(report.assessmentReady, true);
  assert.equal(report.requiredFamilies.length, 1);
  assert.deepEqual(report.requiredFamilies[0].questionTypes, ['method-type']);
  assert.deepEqual(report.requiredFamilies[0].teaching, [{ location: 's1-1/block:1', authorId: 'block-method' }]);
  assert.deepEqual(report.requiredFamilies[0].tasks, ['method-practice']);
}));

test('labels and objective tags without substantive family teaching do not satisfy the obligation', () => fixture(({ plan, lesson, unit, save }) => {
  unit.blocks = [{ authorId: 'label-only', t: 'p', family: 'family-method', objectives: ['obj-method'], label: 'Reduce order' }];
  save();
  const row = planCoverage(plan, [lesson]).requiredFamilies[0];
  assert.equal(row.complete, false);
  assert.ok(row.missing.some(reason => reason.includes('substantive main-path')));
}));

test('optional-only, hollow inline tags, and caption/gist-only blocks do not count as main-path teaching', () => fixture(({ plan, lesson, unit, save }) => {
  for (const block of [
    { ...unit.blocks[0], optional: true },
    { ...unit.blocks[0], tier: 'depth' },
    { ...unit.blocks[0], h: '<p><c k="concept-method">Bernoulli</c></p>', c: undefined },
    { ...unit.blocks[0], h: undefined, core: undefined, c: undefined, cap: 'A plot title', gist: 'A summary.' }
  ]) {
    unit.blocks = [block]; save();
    const row = planCoverage(plan, [lesson]).requiredFamilies[0];
    assert.equal(row.complete, false);
    assert.equal(row.teaching.length, 0);
  }
}));

test('visible applications remain main-path teaching after retiring lane filtering', () => fixture(({ plan, lesson, unit, save }) => {
  unit.blocks[0].tier = 'apply';
  save();
  assert.equal(planCoverage(plan, [lesson]).requiredFamilies[0].complete, true);
}));

test('family and type teach routes must agree and the evidence block must be in that lesson', () => fixture(({ plan, lesson, type, save }) => {
  type.teach = ['s1-2'];
  save();
  const report = planCoverage(plan, [lesson]);
  assert.equal(report.requiredFamilies[0].complete, false);
  assert.ok(report.requiredFamilies[0].missing.some(reason => reason.includes('compatible teach route')));
  type.teach = ['s1-1'];
  save();
  const wrongLesson = { id: 's1-2', file: lesson.file };
  const wrong = planCoverage(plan, [wrongLesson]).requiredFamilies[0];
  assert.equal(wrong.complete, false);
  assert.equal(wrong.teaching.length, 0);
}));

test('a family source route alone does not satisfy missing teaching or task evidence', () => fixture(({ plan, lesson, unit, item, save }) => {
  unit.blocks = [];
  item.q = '';
  save();
  const row = planCoverage(plan, [lesson]).requiredFamilies[0];
  assert.equal(row.complete, false);
  assert.ok(row.missing.some(reason => reason.includes('main-path block')));
  assert.ok(row.missing.some(reason => reason.includes('active mapped')));
}));

test('changing a required family to excluded cannot bypass the obligation', () => fixture(({ plan, lesson }) => {
  plan.data.families[0].disposition = 'excluded';
  const report = planCoverage(plan, [lesson]);
  assert.equal(report.assessmentReady, false);
  assert.ok(report.requiredFamilies[0].missing.some(reason => reason.includes('must remain teach')));
}));

test('required families need an exact source route and a mapped type with an actual task', () => fixture(({ plan, lesson, item, save }) => {
  plan.data.families[0].sources = [];
  plan.data.families[0].questions = ['missing-type'];
  save();
  const row = planCoverage(plan, [lesson]).requiredFamilies[0];
  assert.equal(row.complete, false);
  assert.ok(row.missing.some(reason => reason.includes('source')));
  assert.ok(row.missing.some(reason => reason.includes('mapped question type')));
  assert.ok(row.missing.some(reason => reason.includes('active mapped')));
}));

test('unassessed or noncanonical types cannot satisfy required assessment scope', () => fixture(({ plan, lesson, type, save }) => {
  type.assess = false;
  save();
  const row = planCoverage(plan, [lesson]).requiredFamilies[0];
  assert.equal(row.complete, false);
  assert.ok(row.missing.some(reason => reason.includes('mapped question type')));
}));

test('legacy reader concept cards resolve canonical question types when the plan has no concept list', () => fixture(({ dir, plan, lesson }) => {
  plan.data.concepts = [];
  writeFileSync(join(dir, 'course.yaml'), 'title: Legacy concepts\n');
  mkdirSync(join(dir, 'concepts'), { recursive: true });
  writeFileSync(join(dir, 'concepts', 'concept-method.yaml'), 'title: Method concept\n');
  const row = planCoverage(plan, [lesson]).requiredFamilies[0];
  assert.equal(row.complete, true);
  assert.deepEqual(row.questionTypes, ['method-type']);
}));

test('assessment-required metadata gates only explicitly declared families for legacy compatibility', () => fixture(({ plan, lesson }) => {
  delete plan.data.families[0].assessmentRequired;
  const report = planCoverage(plan, [lesson]);
  assert.equal(report.assessmentReady, true);
  assert.deepEqual(report.requiredFamilies, []);
  assert.match(report.assessmentMessage, /No assessment-required families/);
}));

test('assessmentRequired must be explicitly boolean', () => fixture(({ plan }) => {
  plan.data.families[0].assessmentRequired = 'yes';
  assert.throws(() => indexPlan(plan), /assessmentRequired must be boolean/);
}));

test('generated source routes require explicit provenance', () => fixture(({ plan, lesson }) => {
  plan.data.families[0].sources = [{ source: 'generated', unit: 'lesson brief' }];
  let row = planCoverage(plan, [lesson]).requiredFamilies[0];
  assert.equal(row.complete, false);
  assert.ok(row.missing.some(reason => reason.includes('source')));
  plan.data.families[0].sources[0].provenance = 'Generated because no source excerpt exists for this declared skill.';
  row = planCoverage(plan, [lesson]).requiredFamilies[0];
  assert.equal(row.complete, true);
}));

test('catalog verification rejects unknown, stale, and heading-only source units', () => fixture(({ plan, lesson }) => {
  const unknown = planCoverage(plan, [lesson], { verifySource: () => { throw new Error('unknown source'); } });
  assert.equal(unknown.requiredFamilies[0].complete, false);
  const stale = planCoverage(plan, [lesson], { verifySource: () => ({ locator: 'stale', warning: 'Source changed or disappeared since indexing.' }) });
  assert.equal(stale.requiredFamilies[0].complete, false);
  const emptyUnit = planCoverage(plan, [lesson], { verifySource: () => ({ locator: 'empty locator only' }) });
  assert.equal(emptyUnit.requiredFamilies[0].complete, false);
  const headingOnly = planCoverage(plan, [lesson], { verifySource: () => ({ locator: 'source.md: heading', text: '# Bernoulli method' }) });
  assert.equal(headingOnly.requiredFamilies[0].complete, false);
  const current = planCoverage(plan, [lesson], { verifySource: ref => {
    assert.deepEqual(ref, { source: 'review-test', unit: 'problem-4' });
    return { locator: 'review-test.pdf:page 4', text: 'The required problem gives an equation and asks for its reduction.' };
  } });
  assert.equal(current.requiredFamilies[0].complete, true);
  assert.equal(current.requiredFamilies[0].sources[0].locator, 'review-test.pdf:page 4');
  const shortTask = planCoverage(plan, [lesson], { verifySource: () => ({ locator: 'review-test.pdf:page 5', text: 'Solve x\'=x.' }) });
  assert.equal(shortTask.requiredFamilies[0].complete, true);
}));
