import assert from 'node:assert/strict';
import test from 'node:test';
import { gradeQuestion, questionErrorHypotheses, shouldRestoreAttempt, questionSignature } from '../../src/lib/questions.js';
import { checkResponse } from '../../src/lib/question-schema.js';
import { scoreResponse, initialResponse, hasResponse, responseKey, submissionObservation, responseAnswerText,
  validateMatcher, MAX_RESPONSE_BYTES } from '../../src/lib/response-scoring.js';
const choices = ['Y5 low', 'Y5 high', 'Y3 low'].map(text => ({ text, why: 'Check index and voltage.' }));
const text = { kind: 'text', accepted: ['NAND'] };
const blanks = { kind: 'blanks', fields: [
  { id: 'index', label: 'Output index', response: { kind: 'number', value: 5 } },
  { id: 'level', label: 'Asserted level', response: { kind: 'text', accepted: ['low'] } }
] };
const validation = response => { const errors = []; checkResponse({ response }, 'question', errors); return errors; };

test('exact text is strict by default and normalizes only declared case/space rules', () => {
  assert.equal(gradeQuestion(text, 'NAND'), true);
  for (const value of ['nand', ' NAND ', 'not NAND', 'NAND and AND', {}, null]) assert.equal(gradeQuestion(text, value), false);
  const tolerant = { ...text, normalization: { trim: true, caseSensitive: false } };
  assert.equal(gradeQuestion(tolerant, ' nand '), true);
  assert.equal(gradeQuestion(tolerant, 'not NAND'), false);
  assert.deepEqual(validation(tolerant), []);
  assert.match(validation({ ...text, normalization: { fuzzy: true } }).join(' '), /normalization/);
  assert.match(validation({ ...text, normalization: null }).join(' '), /normalization/);
  assert.match(validation({ ...tolerant, accepted: ['NAND', 'nand'] }).join(' '), /duplicate/);
});

test('blank correctness requires each declared semantic field and rejects extra fields', () => {
  assert.deepEqual(validation(blanks), []);
  assert.deepEqual(initialResponse(blanks), { index: '', level: '' });
  assert.equal(hasResponse(blanks, { index: 5 }), false);
  assert.equal(gradeQuestion(blanks, { index: '5', level: 'low' }), true);
  assert.equal(gradeQuestion(blanks, { index: '5', level: 'high' }), false);
  assert.equal(gradeQuestion(blanks, { index: '5', level: 'low', extra: 'yes' }), false);
  assert.equal(responseAnswerText(blanks), 'Output index: 5\nAsserted level: low');
});

test('default blank criteria retain partial success, incorrectness and unobserved separately', () => {
  const partial = scoreResponse(blanks, { index: '5', level: 'high' });
  assert.equal(partial.correct, false); assert.equal(partial.score, 1); assert.equal(partial.maxScore, 2);
  assert.deepEqual(partial.criteria.map(c => c.correct), [true, false]);
  assert.deepEqual(scoreResponse(blanks, { index: '5' }).criteria.map(c => c.correct), [true, null]);
  assert.ok(partial.criteria.every(c => c.skills.length === 0), 'points alone never invent skill credit');
});

test('reviewed choice criteria describe partial points without changing whole-task correctness', () => {
  const response = { kind: 'single', choices, correct: 1, scoring: { criteria: [
    { id: 'index', match: { kind: 'choice', values: [1, 2] }, points: 1, skills: ['index'] },
    { id: 'polarity', match: { kind: 'choice', value: 1 }, points: 1, skills: ['polarity'] }
  ] } };
  assert.deepEqual(validation(response), []);
  const partial = scoreResponse(response, 2);
  assert.equal(partial.correct, false); assert.equal(partial.score, 1); assert.equal(partial.maxScore, 2);
  assert.deepEqual(partial.criteria.map(c => c.correct), [true, false]);
  assert.equal(scoreResponse(response, 1).score, 2);
  assert.equal(scoreResponse(response, 3).score, 0);
});

test('multi-select does not reward selecting everything or duplicate selected values', () => {
  const response = { kind: 'multi', choices, correct: [1, 2] };
  assert.equal(gradeQuestion(response, [2, 1]), true);
  assert.equal(gradeQuestion(response, [1, 2, 3]), false);
  assert.equal(gradeQuestion(response, [1, 1, 2]), false);
});

test('malformed blank and rubric declarations fail before rendering', () => {
  const duplicate = { ...blanks, fields: [blanks.fields[0], blanks.fields[0]] };
  assert.match(validation(duplicate).join(' '), /distinct/);
  assert.match(validation({ ...blanks, fields: [{ id: 'x', label: 'X', response: { kind: 'formula', answer: 'x' } }] }).join(' '), /blank response/);
  assert.match(validation({ ...blanks, fields: [{ ...blanks.fields[0], response: { kind: 'number', value: 1, inference: true } }] }).join(' '), /unknown response key/);
  const bad = { kind: 'single', choices, correct: 1, scoring: { criteria: [{ id: 'x', match: { kind: 'choice', value: 99 }, points: 1 }] } };
  assert.match(validation(bad).join(' '), /unavailable choice/);
  assert.match(validation({ ...text, scoring: { criteria: [{ id: 'x', match: { kind: 'number', value: 1 }, points: 1 }] } }).join(' '), /agree/);
  assert.match(validation({ kind: 'self', model: 'Compare', scoring: { criteria: [] } }).join(' '), /self responses/);
});

test('typed diagnostic matchers are bounded and can inspect a named blank', () => {
  const item = { errors: [
    { id: 'polarity', match: { kind: 'text', field: 'level', accepted: ['high'] } },
    { id: 'choice', match: { kind: 'choice-set', values: [1, 3] } },
    { id: 'rounding', match: { kind: 'number', value: 1, tolerance: .01 } }
  ] };
  assert.deepEqual(questionErrorHypotheses(item, { level: 'high' }).map(e => e.id), ['polarity']);
  assert.deepEqual(questionErrorHypotheses(item, [3, 1]).map(e => e.id), ['choice']);
  assert.deepEqual(questionErrorHypotheses(item, '1.005').map(e => e.id), ['rounding']);
  const errors = []; validateMatcher({ kind: 'regex', pattern: '.*' }, 'match', errors);
  assert.match(errors.join(' '), /invalid typed/);
});

test('submission observations retain raw semantic answers, source and immutable snapshots', () => {
  const value = { index: '5', level: 'high' };
  const first = submissionObservation(1, blanks, value, { submittedAt: 123 }); value.index = '3';
  assert.equal(first.value.index, '5'); assert.equal(first.gradeSource, 'deterministic-checker');
  assert.equal(first.submittedAt, 123); assert.equal(first.score, 1);
  assert.equal(submissionObservation(1, { kind: 'self', model: 'Compare' }, 'Explain', { correct: true }).gradeSource, 'self');
  assert.equal(responseKey({ a: 1, b: 2 }), responseKey({ b: 2, a: 1 }));
  assert.throws(() => submissionObservation(1, text, 'a'.repeat(MAX_RESPONSE_BYTES+1)), /too large/);
});


test('unfinished authored timers resume across review sessions but completed ordinary answers do not', () => {
  const prior = { sessionId: 'old', timing: { deadlineAt: 100 }, feedback: null };
  assert.equal(shouldRestoreAttempt(prior, { context: 'review', sessionId: 'new', timed: true }), true);
  assert.equal(shouldRestoreAttempt({ ...prior, feedback: { recorded: true } }, { context: 'review', sessionId: 'new', timed: true }), false);
  assert.equal(shouldRestoreAttempt(prior, { context: 'practice', sessionId: 'new' }), false);
  const item = { prompt: 'Answer', response: { kind: 'number', value: 1 }, timing: { limitSeconds: 30 } };
  assert.notEqual(questionSignature(item), questionSignature({ ...item, timing: { limitSeconds: 60 } }));
});
