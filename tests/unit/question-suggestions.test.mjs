import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestQuestionMetadata } from '../../tools/lib/question-suggestions.mjs';
test('local NLP proposals expose their limits and never rewrite authored metadata', () => {
  const course = { questionSkills: { a: { id: 'a', task: 'Solve linear equations', standard: 'Choose method independently' } },
    questionBank: { one: { id: 'one', q: 'Use the method to solve linear equations with 2 unknowns.' },
      two: { id: 'two', q: 'Use the method to solve linear equations with 3 unknowns.' } } };
  const snapshot = JSON.stringify(course), result = suggestQuestionMetadata(course);
  assert.equal(result[0].reviewRequired, true);
  assert.equal(result[0].skillCandidates[0].id, 'a');
  assert.deepEqual(result[1].possibleTemplateSiblings, ['one']);
  assert.ok(result[0].supportCue); assert.equal(JSON.stringify(course), snapshot);
});
