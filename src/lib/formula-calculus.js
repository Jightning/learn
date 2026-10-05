import { formulaMath } from "./formula-math.js";
const { parse, derivative, rationalize } = formulaMath;

export function calculusTex(node, options) {
  if (node.isSymbolNode) {
    const match = /^(\w+)__d([1-3])__(\w+)$/.exec(node.name);
    if (match) return `${parse(match[1]).toTex()}^{${"\\prime".repeat(Number(match[2]))}}`;
  }
  if (!node.isFunctionNode || !["diff", "derivative", "integral"].includes(node.fn.name)) return;
  const [body, variable, low, high] = node.args;
  const tex = item => item.toTex(options);
  if (node.fn.name !== "integral") return `\\frac{d}{d${tex(variable)}}\\left(${tex(body)}\\right)`;
  return `\\int${low ? `_{${tex(low)}}^{${tex(high)}}` : ""} ${tex(body)}\\,d${tex(variable)}`;
}

export function resolveCalculus(node, degree) {
  return node.transform(part => {
    if (!part.isFunctionNode || !["diff", "derivative", "integral"].includes(part.fn.name)) return part;
    const [rawBody, variable, rawLow, rawHigh] = part.args;
    const body = resolveCalculus(rawBody, degree), name = variable.name;
    if (part.fn.name !== "integral") {
      if (body.isSymbolNode && body.name !== name && !["e", "pi"].includes(body.name))
      {
        const previous = /^(\w+)__d([1-3])__(\w+)$/.exec(body.name);
        if (previous && previous[3] === name) {
          if (Number(previous[2]) >= 3) throw new Error("Prime notation supports up to three derivatives.");
          return parse(`${previous[1]}__d${Number(previous[2]) + 1}__${name}`);
        }
        return parse(`${body.name}__d1__${name}`);
      }
      try { return derivative(body, name, { simplify: false }); }
      catch { throw new Error("This derivative cannot be checked automatically. Enter its evaluated form."); }
    }
    if (degree(body) > 11) throw new Error("Automatic integration supports polynomials up to degree 11. Enter an evaluated form for other integrals.");
    let result;
    try { result = rationalize(body, {}, true); }
    catch { throw new Error("This integral needs a polynomial in its integration variable. Enter its evaluated form."); }
    if (!result.coefficients || result.variables.some(v => v !== name))
      throw new Error("This integral needs a polynomial in its integration variable. Enter its evaluated form.");
    const primitive = parse(result.coefficients.map((coefficient, i) => `(${coefficient})*${name}^${i + 1}/${i + 1}`).join("+") || "0");
    if (!rawLow) return primitive;
    const low = resolveCalculus(rawLow, degree), high = resolveCalculus(rawHigh, degree);
    const substitute = bound => primitive.transform(item => item.isSymbolNode && item.name === name ? bound : item);
    return parse(`(${substitute(high).toString()})-(${substitute(low).toString()})`);
  });
}
