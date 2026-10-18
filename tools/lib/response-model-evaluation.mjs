import { fitResponseModel, predictResponse, evaluatePredictions } from '../../src/lib/skill-model.js';

/* Training and hold-out contracts are checked before fitting. Feature creation
 * must use pre-response information; this evaluator cannot audit raw features. */
export function evaluateResponseModel(training, heldOut, { split = 'temporal', fit = {} } = {}) {
  if (!Array.isArray(training) || !Array.isArray(heldOut) || !training.length || !heldOut.length)
    throw new Error('Nonempty training and held-out observations required');
  if (!['temporal', 'learner', 'family'].includes(split)) throw new Error('Choose temporal, learner, or family holdout');
  const ids = new Set();
  for (const row of [...training, ...heldOut]) {
    if (!row.id || ids.has(row.id) || !row.learner || !row.family || !Number.isFinite(row.ts)) throw new Error('Unique observation IDs, learner, family, and timestamp required');
    ids.add(row.id);
  }
  if (split === 'temporal') {
    if (Math.max(...training.map(r => r.ts)) >= Math.min(...heldOut.map(r => r.ts))) throw new Error('Temporal holdout must follow all training observations');
  } else {
    const field = split === 'learner' ? 'learner' : 'family';
    const seen = new Set(training.map(r => r[field]));
    if (heldOut.some(r => seen.has(r[field]))) throw new Error(`Leakage across ${field} holdout`);
  }
  const model = fitResponseModel(training, fit);
  const predictions = heldOut.map(row => ({ id: row.id, predicted: predictResponse(model, row.features), correct: row.correct }));
  return { split, model, report: evaluatePredictions(predictions), predictions,
    promotion: 'experimental-not-promoted', learningBenefit: 'unmeasured',
    caveat: 'Predictive calibration does not establish causal learning benefit or valid skill diagnosis.' };
}
