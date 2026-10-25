/* Numeric literals and one quotient only; no general expression evaluation. */
export function numericAnswer(value, { allowSymbols = true } = {}) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string") return NaN;
  if (!allowSymbols && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return NaN;
  const parts = value.split(/[\/⁄]/);
  if (parts.length > 1) {
    if (parts.length !== 2) return NaN;
    const numerator = numericAnswer(parts[0]), denominator = numericAnswer(parts[1]);
    const quotient = numerator / denominator;
    return denominator !== 0 && Number.isFinite(quotient) ? quotient : NaN;
  }
  const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const literal = value.trim().replace(/−/g, "-")
    .replace(/([×*])\s*10([⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, operator, exponent) =>
      `${operator}10^${[...exponent].map(c => c === "⁻" ? "-" : c === "⁺" ? "+" : superscripts.indexOf(c)).join("")}`)
    .replace(/\s*[×*]\s*10\s*\^\s*([+-]?\d+)$/, "e$1");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(literal)) return NaN;
  const number = Number(literal);
  return Number.isFinite(number) ? number : NaN;
}

export const numericTolerance = response => response.tolerance ?? (response.unit?.trim().toLowerCase() === "factor" ? 0.05 : 0);
