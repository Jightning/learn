import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateResponseModel } from '../../tools/lib/response-model-evaluation.mjs';
const row = (id, ts, learner, family) => ({ id, ts, learner, family, features: [1], correct: true });
test('model evaluation rejects leakage and reports actual held-out calibration without promotion', () => {
  const train = [row('one', 1, 'a', 'f')], held = [row('two', 2, 'b', 'g')];
  for (const split of ['temporal', 'learner', 'family']) {
    const result = evaluateResponseModel(train, held, { split });
    assert.equal(result.report.n, 1); assert.equal(result.promotion, 'experimental-not-promoted');
  }
  assert.throws(() => evaluateResponseModel(train, [row('two', 0, 'a', 'f')]), /Temporal/);
  assert.throws(() => evaluateResponseModel(train, [row('two', 2, 'a', 'g')], { split: 'learner' }), /Leakage/);
  assert.throws(() => evaluateResponseModel(train, [row('two', 2, 'b', 'f')], { split: 'family' }), /Leakage/);
  assert.throws(() => evaluateResponseModel(train, train), /Unique/);
});
