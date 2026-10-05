/* One bounded, plain-text syntax for authored keys, reader input and previews.
 * Never accept math.js assignments, accessors, arrays or arbitrary functions. */
import { formulaMath } from "./formula-math.js";
import { normalizeMathText, primeName } from "./math-text.js";
import { resolveCalculus, calculusTex } from "./formula-calculus.js";
const { parse, simplify, rationalize } = formulaMath;

const FUNCTIONS = new Set(["sqrt", "abs", "sin", "cos", "tan", "exp", "log"]);
const CALCULUS = new Set(["diff", "derivative", "integral"]);
const CONSTANTS = new Set(["e", "pi"]);
const OPS = new Set(["add", "subtract", "multiply", "divide", "pow", "unaryMinus", "unaryPlus"]);
export const FORMULA_LIMIT = 256;

function formulaTex(node) {
  // Display coefficients as 2x while leaving the checker's operators intact.
  const display = node.cloneDeep();
  display.traverse(part => {
    if (part.isOperatorNode && part.fn === "multiply" && part.args.length === 2) {
      const [left, right] = part.args;
      if (left.isConstantNode && (right.isSymbolNode || right.isParenthesisNode ||
        right.isFunctionNode || (right.isOperatorNode && right.fn === "pow"))) part.implicit = true;
    }
  });
  return display.toTex({ handler: calculusTex });
}

export function parseFormula(text, variables = null, independentVariable = "x", evaluated = false, displayOnly = false) {
  if (typeof text !== "string" || !text.trim() || text.length > FORMULA_LIMIT)
    throw new Error(`Enter a formula of at most ${FORMULA_LIMIT} characters.`);
  const source = primeName(normalizeMathText(text), independentVariable);
  const parts = source.split("=");
  if (parts.length > 2 || parts.some(part => !part.trim()))
    throw new Error("Use an expression or one equation with both sides filled in.");
  const symbols = new Set(), guards = new Set();
  const domainText = node => node.toString({ parenthesis: "auto" });
  let count = 0;
  const hasVariable = node => {
    let found = false;
    node.traverse(part => { if (part.isSymbolNode && !CONSTANTS.has(part.name) && !FUNCTIONS.has(part.name) && !CALCULUS.has(part.name)) found = true; });
    return found;
  };
  const visit = (node, depth = 0) => {
    if (++count > 80 || depth > 16) throw new Error("This formula is too complex to check.");
    if (node.isConstantNode) {
      if (typeof node.value !== "number" || !Number.isFinite(node.value) || Math.abs(node.value) > 1e12)
        throw new Error("Use finite numeric constants up to 10^12.");
    } else if (node.isSymbolNode) {
      if (!CONSTANTS.has(node.name)) {
        const formal = /^(\w+)__d([1-3])__(\w+)$/.exec(node.name);
        const validName = /^[a-zA-Z][a-zA-Z0-9_]{0,15}$/.test(node.name) || formal;
        const declared = variables?.map(v => primeName(v, independentVariable));
        if (!validName) throw new Error("Use variable names of up to 16 letters, digits, or underscores, starting with a letter.");
        if (variables && !declared.includes(node.name) && !(formal && variables.includes(formal[1]) && variables.includes(formal[3])))
          throw new Error(`The answer key uses undeclared variable ${node.name}. Declare it in response.variables.`);
        symbols.add(node.name);
      }
    } else if (node.isParenthesisNode) visit(node.content, depth + 1);
    else if (node.isOperatorNode && OPS.has(node.fn)) {
      if (node.fn === "pow" && node.args[1].isConstantNode && Math.abs(node.args[1].value) > 12)
        throw new Error("Use powers between -12 and 12.");
      node.args.forEach(arg => visit(arg, depth + 1));
      // Preserve domain restrictions before simplification can cancel them.
      if (node.fn === "divide") {
        if (hasVariable(node.args[1])) guards.add(`divide:${domainText(node.args[1])}`);
        else if (!Number.isFinite(node.args[1].evaluate()) || node.args[1].evaluate() === 0)
          throw new Error("Use a finite, nonzero denominator.");
      }
      if (node.fn === "pow") {
        const exponent = hasVariable(node.args[1]) ? null : node.args[1].evaluate();
        if (exponent != null && (!Number.isFinite(exponent) || Math.abs(exponent) > 12))
          throw new Error("Use powers between -12 and 12.");
        const positiveBase = !hasVariable(node.args[0]) && node.args[0].evaluate() > 0;
        if (!positiveBase && !(Number.isInteger(exponent) && exponent >= 0)) guards.add(`power:${domainText(node)}`);
      }
    } else if (node.isFunctionNode && node.fn.isSymbolNode && CALCULUS.has(node.fn.name)) {
      if (!([2, 4].includes(node.args.length) && (node.fn.name === "integral" || node.args.length === 2)) || !node.args[1]?.isSymbolNode)
        throw new Error("Use diff(expression, variable) or integral(expression, variable[, lower, upper]).");
      node.args.forEach(arg => visit(arg, depth + 1));
    } else if (node.isFunctionNode && node.fn.isSymbolNode && FUNCTIONS.has(node.fn.name) && node.args.length === 1) {
      node.args.forEach(arg => visit(arg, depth + 1));
      if (["sqrt", "log", "tan"].includes(node.fn.name) && hasVariable(node.args[0])) guards.add(domainText(node));
      if (!hasVariable(node) && !Number.isFinite(node.evaluate())) throw new Error("Use functions with finite real values.");
    } else throw new Error("Use arithmetic, powers, roots or the supported scalar functions.");
  };
  let nodes;
  try { nodes = parts.map(part => parse(part)); }
  catch { throw new Error("Complete the formula: check parentheses, fractions, and missing operands."); }
  nodes.forEach(node => visit(node));
  const tex = nodes.map(formulaTex).join(" = ");
  if (displayOnly) return { nodes, symbols, guards, tex };
  if (!evaluated) {
    const resolved = nodes.map(node => resolveCalculus(node, polynomialDegree));
    if (resolved.some((node, i) => node.toString() !== nodes[i].toString())) {
      const result = parseFormula(resolved.map(node => node.toString()).join("="), variables, independentVariable, true);
      return { ...result, tex };
    }
  }
  if (symbols.size > 4) throw new Error("Use at most four variables.");
  for (const node of nodes) {
    if (!hasVariable(node)) {
      const value = node.evaluate();
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Use a formula with a finite real value.");
    }
  }
  return { nodes, symbols, guards, tex };
}

export function checkFormulaResponse(response) {
  if (!Array.isArray(response.variables) || response.variables.length > 4 ||
      response.variables.some(v => typeof v !== "string" || !/^[a-zA-Z][a-zA-Z0-9_]{0,15}'{0,3}$/.test(v) || CONSTANTS.has(v) || FUNCTIONS.has(v) || CALCULUS.has(v)) ||
      new Set(response.variables).size !== response.variables.length)
    throw new Error("Formula responses need a variables list of up to four distinct names (use [] for constants).");
  const independent = response.independentVariable || "x";
  if (response.independentVariable != null && !response.variables.includes(independent))
    throw new Error("independentVariable must name a declared variable.");
  const parsed = parseFormula(response.answer, response.variables, independent);
  if (response.solveFor != null && !response.variables.includes(response.solveFor) && !response.variables.includes(response.solveFor.replace(/'+$/, "")))
    throw new Error("solveFor must name a declared variable.");
  if (parsed.nodes.length === 2) equationExpression(parsed, primeName(response.solveFor || "", independent));
  else if (response.solveFor != null) throw new Error("solveFor requires an equation answer.");
  return parsed;
}

function equationExpression(parsed, solveFor) {
  if (!solveFor) throw new Error("Equation answers need solveFor and an isolated answer variable.");
  const [a, b] = parsed.nodes;
  const expression = a.isSymbolNode && a.name === solveFor ? b : b.isSymbolNode && b.name === solveFor ? a : null;
  if (!expression) throw new Error(`Isolate ${solveFor} on one side of the equation.`);
  expression.traverse(node => {
    if (node.isSymbolNode && node.name === solveFor) throw new Error(`Keep ${solveFor} on only one side of the equation.`);
  });
  return expression;
}

function polynomialDegree(node) {
  if (node.isConstantNode) return 0;
  if (node.isSymbolNode) return CONSTANTS.has(node.name) ? 0 : 1;
  if (node.isParenthesisNode) return polynomialDegree(node.content);
  if (!node.isOperatorNode) return Infinity;
  const degrees = node.args.map(polynomialDegree);
  if (node.fn === "multiply") return degrees.reduce((sum, degree) => sum + degree, 0);
  if (node.fn === "divide") return degrees[1] === 0 ? degrees[0] : Infinity;
  if (node.fn === "pow") {
    if (degrees[1] !== 0) return Infinity;
    const power = node.args[1].evaluate();
    return Number.isInteger(power) && power >= 0 ? degrees[0] * power : Infinity;
  }
  return Math.max(...degrees);
}

/* Credit requires symbolic evidence. A valid form that cannot match the key
 * is incorrect; syntax and infrastructure failures remain editable errors. */
export function gradeFormula(response, value) {
  const expected = checkFormulaResponse(response);
  const independent = response.independentVariable || "x";
  const actual = parseFormula(value, null, independent);
  const allowed = new Set(response.variables.map(v => primeName(v, independent)));
  if ([...actual.symbols].some(name => !allowed.has(name) && !(/^(\w+)__d[1-3]__(\w+)$/.test(name) && allowed.has(name.split("__d")[0]) && allowed.has(name.split("__").at(-1))))) return false;
  if (actual.nodes.length !== expected.nodes.length)
    throw new Error(expected.nodes.length === 2 ? "Enter the whole equation, including the answer variable." : "Enter an expression without an equals sign.");
  const solveFor = primeName(response.solveFor || "", independent);
  const a = expected.nodes.length === 2 ? equationExpression(expected, solveFor) : expected.nodes[0];
  let b;
  try { b = actual.nodes.length === 2 ? equationExpression(actual, solveFor) : actual.nodes[0]; }
  catch { return false; }
  if (a.toString() === b.toString()) return true;
  if (expected.guards.size !== actual.guards.size || [...expected.guards].some(g => !actual.guards.has(g))) return false;
  const source = `(${a.toString()}) - (${b.toString()})`;
  const difference = simplify(source, {}, { context: simplify.realContext });
  if (difference.isConstantNode && difference.value === 0) return true;
  if (Math.max(polynomialDegree(a), polynomialDegree(b)) <= 12) {
    // Expand only bounded polynomials, so factoring and expansion can match.
    try {
      const polynomial = rationalize(source);
      if (polynomial.isConstantNode && polynomial.value === 0) return true;
    } catch { /* Retain the conservative comparison if expansion is unsupported. */ }
  }
  for (const at of [-3, -1, 0, 0.5, 1, 2, 5]) {
    const scope = Object.fromEntries(response.variables.map((name, i) => [name, at + i * 0.37]));
    try {
      const av = a.evaluate(scope), bv = b.evaluate(scope);
      if (typeof av === "number" && typeof bv === "number" && Number.isFinite(av) && Number.isFinite(bv) &&
          Math.abs(av - bv) > 1e-9 * Math.max(1, Math.abs(av), Math.abs(bv))) return false;
    } catch { /* A point outside the domain is not evidence of a wrong answer. */ }
  }
  return false;
}
