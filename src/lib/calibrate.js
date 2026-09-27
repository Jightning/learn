/* Compare the scheduler's predicted recall with observed outcomes. */
const BANDS = [0.5, 0.7, 0.85, 0.95, 1.01];

export function modelBands(rows) {
  const graded = rows.filter(r => typeof r.predictedR === "number" && r.correct != null);
  let lo = 0;
  return BANDS.map(hi => {
    const hit = graded.filter(r => r.predictedR >= lo && r.predictedR < hi);
    const band = {
      label: `${lo.toFixed(2)}–${Math.min(hi, 1).toFixed(2)}`,
      n: hit.length,
      predicted: hit.length ? hit.reduce((m, r) => m + r.predictedR, 0) / hit.length : 0,
      observed: hit.length ? hit.filter(r => r.correct).length / hit.length : 0
    };
    lo = hi;
    return band;
  }).filter(b => b.n > 0);
}
