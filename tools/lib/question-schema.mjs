/* Shared validation for authored response data and documentation examples. */
export function checkResponse(item, where, errs) {
  const r = item.response;
  if (!r) return; /* legacy free-response item */
  if (!["single", "multi", "number", "self"].includes(r.kind)) {
    errs.push(`${where}: response.kind must be single, multi, number, or self`); return;
  }
  if (r.kind === "single" || r.kind === "multi") {
    if (!Array.isArray(r.choices)) {
      errs.push(`${where}: response.choices must be a list`); return;
    }
    r.choices.forEach((choice, i) => {
      if (!String(choice.text || "").trim() || !String(choice.why || "").trim())
        errs.push(`${where}: choice ${i + 1} needs text and why`);
    });
    const correct = r.kind === "single" ? [r.correct] : r.correct;
    if (!Array.isArray(correct) || !correct.length ||
        correct.some(n => !Number.isInteger(n) || n < 1 || n > r.choices.length) ||
        new Set(correct).size !== correct.length)
      errs.push(`${where}: correct must name valid 1-based choice numbers`);
  }
  if (r.kind === "number" && (r.value == null || String(r.value).trim() === "" || !Number.isFinite(Number(r.value)) ||
      !Number.isFinite(Number(r.tolerance ?? 0)) || Number(r.tolerance ?? 0) < 0))
    errs.push(`${where}: numeric response needs a finite value and nonnegative tolerance`);
  if (r.kind === "self" && !String(r.model || "").trim())
    errs.push(`${where}: self-check response needs a model answer`);
}
