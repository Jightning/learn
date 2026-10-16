import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { indexTeaching, teachingPacket, prerequisiteEvidenceSignature } from '../../tools/lib/author-teaching.mjs';

function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'teaching-'));
  const first = join(dir, 's1-1.yaml'), second = join(dir, 's1-2.yaml');
  writeFileSync(first, `blocks:\n  - authorId: block-prior\n    t: p\n    introduces: [c-prior]\n    h: "Original convention: x means the input."\n  - authorId: block-unrelated\n    t: p\n    h: "Unrelated material."\n`);
  writeFileSync(second, `blocks:\n  - authorId: block-current\n    t: p\n    objectives: [o-current]\n    h: "Current lesson."\n`);
  const plan = { path: join(dir, 'materials', 'plan.yaml'), data: {
    concepts: [{ id: 'c-prior' }, { id: 'c-current' }],
    objectives: [{ id: 'o-current' }],
    reader: { background: ['arithmetic'] },
    lessons: [
      { id: 's1-1', teaching: { outcome: 'Establish x', introduces: ['c-prior'] } },
      { id: 's1-2', teaching: {
        outcome: 'Use x', requires: ['c-prior', 'arithmetic'], introduces: ['c-current'],
        reasoning: 'Connect the convention to the operation.',
        representation: { job: 'Show the input-output relation', needs: ['figure:flow'] },
        practice: 'Apply the relation under a changed input.', boundary: 'No inverse operation.'
      } }
    ]
  } };
  const subsections = [{ id: 's1-1', file: first }, { id: 's1-2', file: second }];
  try { fn({ dir, plan, first, second, subsections }); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('validates IDs, unique ownership, background and strictly earlier introductions', () => fixture(({ plan }) => {
  const index = indexTeaching(plan);
  assert.equal(index.owners.get('c-prior'), 's1-1');
  assert.deepEqual(index.requiredByLesson.get('s1-2'), ['c-prior', 'arithmetic']);
  const failWith = (change, message) => {
    const copy = structuredClone(plan); change(copy);
    assert.throws(() => indexTeaching(copy), new RegExp(message));
  };
  failWith(p => { p.data.lessons[1].teaching.requires = ['missing']; }, /unknown prerequisite/);
  failWith(p => { p.data.lessons[0].teaching.introduces = ['c-prior', 'c-current']; p.data.lessons[1].teaching.introduces = ['c-current']; }, /owned by both/);
  failWith(p => { p.data.lessons[0].teaching.requires = ['c-current']; }, /before it is introduced/);
}));

test('writer packet carries only direct original anchors and labels written versus planned', () => fixture(({ plan, subsections, second }) => {
  const index = indexTeaching(plan);
  const packet = teachingPacket({ plan, subsection: subsections[1], subsections, index });
  assert.deepEqual(packet.teaching, plan.data.lessons[1].teaching);
  assert.deepEqual(packet.needs, ['figure:flow']);
  assert.deepEqual(packet.prerequisiteEvidence.map(item => [item.id, item.status]), [
    ['c-prior', 'written'], ['arithmetic', 'background']
  ]);
  const prior = packet.prerequisiteEvidence[0];
  assert.deepEqual(prior.locations.map(item => item.authorId), ['block-prior']);
  assert.ok(JSON.stringify(prior).includes('Original convention'));
  assert.ok(!JSON.stringify(packet).includes('Unrelated material'));
  assert.ok(!JSON.stringify(packet).includes('Current lesson'));
  assert.ok(packet.outline.some(item => item.id === 's1-2'));
  const sameBatch = teachingPacket({ plan, subsection: subsections[1], subsections, assigned: ['s1-1'], index });
  assert.equal(sameBatch.prerequisiteEvidence[0].status, 'planned');
  assert.equal(sameBatch.prerequisiteEvidence[0].assigned, true);
  assert.ok(sameBatch.warnings.some(message => message.includes('owned by assigned lesson')));
  writeFileSync(subsections[0].file, `blocks:\n  - authorId: block-empty\n    t: p\n    introduces: [c-prior]\n`);
  const emptyAnchor = teachingPacket({ plan, subsection: subsections[1], subsections, index });
  assert.equal(emptyAnchor.prerequisiteEvidence[0].status, 'planned');
  assert.equal(emptyAnchor.prerequisiteEvidence[0].assigned, false);
  assert.equal(emptyAnchor.prerequisiteEvidence[0].locations[0].content, undefined);
  assert.ok(emptyAnchor.warnings.some(message => message.includes('no substantive teaching content')));
  writeFileSync(subsections[0].file, `blocks:\n  - t: p\n    introduces: [c-prior]\n    h: "Stable location has not been assigned."\n`);
  const noStableAnchor = teachingPacket({ plan, subsection: subsections[1], subsections, index });
  assert.equal(noStableAnchor.prerequisiteEvidence[0].status, 'planned');
  assert.ok(noStableAnchor.warnings.some(message => message.includes('no stable authorId')));
  writeFileSync(subsections[0].file, `blocks:\n  - authorId: block-prior\n    t: p\n    concepts: [c-prior]\n    h: "Only tagged, not explicitly introduced."\n`);
  const taggedOnly = teachingPacket({ plan, subsection: second && subsections[1], subsections, index });
  assert.equal(taggedOnly.prerequisiteEvidence[0].status, 'planned');
  assert.ok(taggedOnly.warnings.some(message => message.includes('planned evidence only')));
}));

test('prerequisite evidence signatures change for anchor edits and ignore unrelated blocks', () => fixture(({ plan, first, subsections }) => {
  const index = indexTeaching(plan);
  const before = prerequisiteEvidenceSignature(plan, 's1-2', subsections, index);
  writeFileSync(first, `blocks:\n  - authorId: block-prior\n    t: p\n    introduces: [c-prior]\n    h: "Revised convention: x means the output."\n  - authorId: block-unrelated\n    t: p\n    h: "Unrelated material changed."\n`);
  const after = prerequisiteEvidenceSignature(plan, 's1-2', subsections, index);
  assert.notEqual(after, before);
  writeFileSync(first, `blocks:\n  - authorId: block-prior\n    t: p\n    introduces: [c-prior]\n    h: "Original convention: x means the input."\n  - authorId: block-unrelated\n    t: p\n    h: "Unrelated material changed again."\n`);
  assert.equal(prerequisiteEvidenceSignature(plan, 's1-2', subsections, index), before);
}));

test('legacy lessons without teaching briefs remain valid and yield no new packet fields', () => fixture(({ plan, subsections }) => {
  for (const lesson of plan.data.lessons) delete lesson.teaching;
  const index = indexTeaching(plan);
  assert.equal(index.owners.size, 0);
  assert.deepEqual(teachingPacket({ plan, subsection: subsections[1], subsections, index }), {});
}));

test('actual reader order must agree with planned prerequisite order', () => fixture(({ plan, subsections }) => {
  assert.throws(() => teachingPacket({ plan, subsection: subsections[1], subsections: [...subsections].reverse() }), /actual reading order/);
}));

test('hidden, hollow or summary-only anchors cannot establish required prior teaching', () => fixture(({ plan, subsections, first }) => {
  for (const body of [
    'tier: depth\n    h: Explain the relation.',
    'optional: true\n    h: Explain the relation.',
    'h: "<p></p>"',
    'gist: A review summary alone.'
  ]) {
    writeFileSync(first, `blocks:\n  - t: key\n    authorId: block-prior\n    introduces: [c-prior]\n    ${body}\n`);
    const packet = teachingPacket({ plan, subsection: subsections[1], subsections });
    assert.equal(packet.prerequisiteEvidence[0].status, 'planned');
  }
  writeFileSync(first, 'blocks:\n  - t: key\n    authorId: block-prior\n    introduces: [c-prior]\n    tier: apply\n    h: Explain the relation.\n');
  assert.equal(teachingPacket({ plan, subsection: subsections[1], subsections }).prerequisiteEvidence[0].status, 'written');
  plan.data.lessons[0].teaching = {};
  assert.throws(() => indexTeaching(plan), /nonempty lesson capability/);
}));
