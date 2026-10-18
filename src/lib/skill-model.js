/* Experimental local models. Parameters are explicit; no model output can
 * bypass the evidence/coverage policy or certify readiness. */
const fraction = (p, name) => {
  if (!Number.isFinite(p) || p < 0 || p > 1) throw new Error(`${name} must be a probability`);
  return p;
};
export const MODEL_VERSION = 'joint-bayes-v1';

export function skillPrior(skills, probabilities = {}) {
  if (!Array.isArray(skills) || !skills.length || skills.length > 6 || new Set(skills).size !== skills.length || skills.some(s => typeof s !== 'string' || !s))
    throw new Error('Exact diagnosis needs one to six distinct skill IDs');
  const ps = skills.map(id => fraction(probabilities[id] ?? .5, id));
  return { version: MODEL_VERSION, skills, states: Array.from({ length: 2 ** skills.length }, (_, mask) => ({
    mask, probability: ps.reduce((p, v, i) => p * ((mask >> i) & 1 ? v : 1 - v), 1)
  })) };
}

function likelihood(model, mask, item) {
  const slip = fraction(item.slip, 'slip'), guess = fraction(item.guess, 'guess');
  if (guess >= 1 - slip) throw new Error('Item must discriminate positive skill evidence');
  const routes = item.routes?.length ? item.routes : [item.skills];
  if (routes.some(route => !Array.isArray(route) || !route.length || route.some(id => !model.skills.includes(id))))
    throw new Error('Unknown or empty required skill set');
  const capable = routes.some(route => route.every(id => (mask >> model.skills.indexOf(id)) & 1));
  return capable ? 1 - slip : guess;
}

export function updateSkills(model, item, correct) {
  if (model.version !== MODEL_VERSION || typeof correct !== 'boolean') throw new Error('Unsupported model or observation');
  const states = model.states.map(state => {
    const p = likelihood(model, state.mask, item);
    return { ...state, probability: state.probability * (correct ? p : 1 - p) };
  });
  const total = states.reduce((s, r) => s + r.probability, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error('Observation has zero likelihood');
  return { ...model, states: states.map(s => ({ ...s, probability: s.probability / total })) };
}

export function skillMarginals(model) {
  return Object.fromEntries(model.skills.map((id, i) => [id,
    model.states.reduce((sum, s) => sum + ((s.mask >> i) & 1 ? s.probability : 0), 0)]));
}
const entropy = model => -model.states.reduce((sum, s) => sum + (s.probability ? s.probability * Math.log2(s.probability) : 0), 0);
export function diagnosticInformation(model, item) {
  const p = model.states.reduce((sum, s) => sum + s.probability * likelihood(model, s.mask, item), 0);
  const conditional = (p ? p * entropy(updateSkills(model, item, true)) : 0) +
    (p < 1 ? (1 - p) * entropy(updateSkills(model, item, false)) : 0);
  return Math.max(0, entropy(model) - conditional);
}

const sigmoid = x => 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, x))));
const validateFeatures = (values, size) => {
  if (!Array.isArray(values) || values.length !== size || values.some(v => !Number.isFinite(v))) throw new Error('Finite consistent feature vectors required');
};
export function predictResponse(model, features) {
  if (model.version !== 'logistic-v1') throw new Error('Unsupported response model');
  validateFeatures(features, model.weights.length - 1);
  return sigmoid(model.weights[0] + features.reduce((s, x, i) => s + x * model.weights[i + 1], 0));
}

// Bounded batch fitting is for offline experiments; live UI never fits a model.
export function fitResponseModel(rows, { epochs = 200, rate = .05, penalty = .01 } = {}) {
  const size = rows[0]?.features?.length;
  if (!rows.length || !size || !Number.isInteger(epochs) || epochs < 1 || epochs > 5000 || !(rate > 0 && rate <= 1) || !(penalty >= 0 && Number.isFinite(penalty)))
    throw new Error('Valid training data and bounded fitting options required');
  for (const row of rows) {
    validateFeatures(row.features, size);
    if (typeof row.correct !== 'boolean') throw new Error('Boolean training outcomes required');
  }
  const model = { version: 'logistic-v1', weights: Array(size + 1).fill(0), trainingCount: rows.length };
  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradient = Array(size + 1).fill(0);
    for (const row of rows) {
      const error = predictResponse(model, row.features) - Number(row.correct);
      gradient[0] += error;
      row.features.forEach((x, i) => { gradient[i + 1] += error * x; });
    }
    model.weights = model.weights.map((w, i) => w - rate * (gradient[i] / rows.length + (i ? penalty * w : 0)));
  }
  return model;
}

export function evaluatePredictions(rows) {
  if (!rows.length) throw new Error('Held-out predictions required');
  const bins = Array.from({ length: 5 }, () => ({ n: 0, predicted: 0, observed: 0 }));
  let brier = 0, logLoss = 0;
  for (const row of rows) {
    const p = fraction(row.predicted, 'predicted');
    if (typeof row.correct !== 'boolean') throw new Error('Boolean held-out outcomes required');
    const y = Number(row.correct), bin = bins[Math.min(4, Math.floor(p * 5))];
    brier += (p - y) ** 2;
    logLoss -= y * Math.log(Math.max(1e-12, p)) + (1 - y) * Math.log(Math.max(1e-12, 1 - p));
    bin.n++; bin.predicted += p; bin.observed += y;
  }
  return { n: rows.length, brier: brier / rows.length, logLoss: logLoss / rows.length,
    calibration: bins.filter(b => b.n).map(b => ({ n: b.n, predicted: b.predicted / b.n, observed: b.observed / b.n })) };
}

// Experimental epsilon-greedy selection receives already-safe actions. Store
// the returned distribution, not just its random seed, for later evaluation.
export function chooseLearningAction(actions, { exploration = .1, random = Math.random } = {}) {
  fraction(exploration, 'exploration');
  if (!actions.length || actions.some(a => !a.id || !Number.isFinite(a.value)) || new Set(actions.map(a => a.id)).size !== actions.length)
    throw new Error('Distinct eligible actions and finite learned values required');
  const best = [...actions].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))[0];
  const distribution = actions.map(a => ({ id: a.id, probability: exploration / actions.length + (a.id === best.id ? 1 - exploration : 0) }));
  const draw = random(); fraction(draw, 'random draw');
  let cumulative = 0;
  const selected = distribution.find(a => { cumulative += a.probability; return draw < cumulative; }) || distribution.at(-1);
  return { action: actions.find(a => a.id === selected.id), probability: selected.probability, distribution,
    version: 'learning-action-experiment-v1', promotion: 'experimental' };
}
