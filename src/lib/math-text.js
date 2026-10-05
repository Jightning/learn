/* MathLive's ASCII export uses Unicode primes and spaced calculus operators. */
export function normalizeMathText(text) {
  return text.replace(/\bln\b/g, "log").replaceAll("−", "-").replaceAll("×", "*").replaceAll("÷", "/")
    .replaceAll("π", "pi").replaceAll("√", "sqrt").replace(/\^?([′″])/g, (_, mark) => mark === "″" ? "''" : "'")
    .replace(/\|([^|]+)\|/g, "abs($1)")
    .replace(/\(d\s+([A-Za-z]\w*)\)\s*\/\s*\(d\s+([A-Za-z]\w*)\)/g, "diff($1,$2)")
    .replace(/\(d\)\s*\/\s*\(d\s+([A-Za-z]\w*)\)\s*([^=]+)(?==|$)/g, "diff($2,$1)")
    .replace(/\bint\s*_([+-]?[\d.]+|\([^()]+\)|[A-Za-z])\s*\^([+-]?[\d.]+|\([^()]+\)|[A-Za-z])\s*(.+?)\s+d\s+([A-Za-z]\w*)(?=\s*(?:$|=|\+|\-))/g,
      (_, low, high, body, variable) => `integral(${body},${variable},${low},${high})`)
    .replace(/\bint\s+(.+?)\s+d\s+([A-Za-z]\w*)(?=\s*(?:$|=|\+|\-))/g, "integral($1,$2)");
}

export const primeName = (text, variable = "x") => text.replace(/([A-Za-z]\w*)\s*('+)/g,
  (_, name, marks) => `${name}__d${marks.length}__${variable}`);
