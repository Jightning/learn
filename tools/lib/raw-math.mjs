/* TeX in an HTML prose field is printed literally unless the author marks its
 * bounds. Catch unambiguous math syntax before a course reaches the reader. */
export function rawMathFragment(value) {
  if (typeof value !== "string") return "";
  const prose = value
    .replace(/<m>[\s\S]*?<\/m>/gi, " ")
    .replace(/<(?:code|pre)\b[^>]*>[\s\S]*?<\/(?:code|pre)>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  const match = /\\[A-Za-z]{2,}|(?:[A-Za-z0-9)]|\})\^(?:\{[^}]+\}|[-+A-Za-z0-9\\]+)|[A-Za-z][A-Za-z0-9]*_(?:\{[^}]+\}|[-+A-Za-z0-9\\]+)|\b[A-Za-z][A-Za-z0-9]*(?:\([^)]*\))?\s*=/.exec(prose);
  return match ? match[0] : "";
}

/* Pasted constructed sums often use Unicode sub/superscripts rather than TeX.
 * Match only a summation with an explicit lower-bound equals sign and upper
 * bound; ordinary Greek letters and prose remain untouched. */
export function unicodeConstructedMathFragment(value) {
  if (typeof value !== "string") return "";
  const prose = value
    .replace(/<m>[\s\S]*?<\/m>/gi, " ")
    .replace(/<(?:code|pre)\b[^>]*>[\s\S]*?<\/(?:code|pre)>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  const match = /[Σ∑][ᵢⱼ₀₁₂₃₄₅₆₇₈₉₊₋₍₎ₐₑₕₖₗₘₙₒₚᵣₛₜᵤᵥₓ]*₌[₀₁₂₃₄₅₆₇₈₉]+[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿⁱ]+/u.exec(prose);
  return match ? match[0] : "";
}
