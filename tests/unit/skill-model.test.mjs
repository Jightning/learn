import test from 'node:test';
import assert from 'node:assert/strict';
import { skillPrior, updateSkills, skillMarginals, diagnosticInformation, fitResponseModel, predictResponse, evaluatePredictions, chooseLearningAction } from '../../src/lib/skill-model.js';

test('joint evidence preserves ambiguity and correlations rather than creating three successes', () => {
  const prior = skillPrior(['a', 'b', 'c']), item = { skills: ['a', 'b', 'c'], slip: .1, guess: .1 };
  const miss = updateSkills(prior, item, false), pass = updateSkills(prior, item, true);
  assert.ok(Object.values(skillMarginals(miss)).every(p => Math.abs(p - .4375) < 1e-10));
  assert.ok(Object.values(skillMarginals(pass)).every(p => Math.abs(p - .75) < 1e-10));
  assert.ok(diagnosticInformation(miss, { ...item, skills: ['a'] }) > diagnosticInformation(miss, item));
  assert.equal(prior.states[0].probability, .125);
  assert.throws(() => skillPrior(Array.from({ length: 7 }, (_, i) => String(i))), /six/);
  assert.throws(() => updateSkills(prior, { ...item, skills: ['unknown'] }, true), /Unknown/);
});

test('hard success and easy failure have the stronger appropriate evidence', () => {
  const prior = skillPrior(['a']);
  const easy = { skills: ['a'], slip: .05, guess: .7 }, hard = { skills: ['a'], slip: .4, guess: .1 };
  assert.ok(skillMarginals(updateSkills(prior, hard, true)).a > skillMarginals(updateSkills(prior, easy, true)).a);
  assert.ok(skillMarginals(updateSkills(prior, easy, false)).a < skillMarginals(updateSkills(prior, hard, false)).a);
});

test('regularized fitting predicts held-out synthetic features and returns calibration measures', () => {
  const train = Array.from({ length: 40 }, (_, i) => ({ features: [i % 2 ? 1 : -1], correct: !!(i % 2) }));
  const model = fitResponseModel(train);
  assert.ok(predictResponse(model, [1]) > .75);
  assert.ok(predictResponse(model, [-1]) < .25);
  const report = evaluatePredictions([{ predicted: predictResponse(model, [1]), correct: true }, { predicted: predictResponse(model, [-1]), correct: false }]);
  assert.ok(report.brier < .1); assert.equal(report.n, 2);
  assert.throws(() => fitResponseModel([{ features: [NaN], correct: true }]), /Finite/);
});

test('experimental action policy returns actual propensities and only eligible actions', () => {
  const result = chooseLearningAction([{ id: 'teach', value: 2 }, { id: 'practice', value: 1 }], { exploration: .2, random: () => .95 });
  assert.equal(result.action.id, 'practice'); assert.equal(result.probability, .1);
  assert.equal(result.distribution.reduce((s, a) => s + a.probability, 0), 1);
  assert.equal(result.promotion, 'experimental');
});
