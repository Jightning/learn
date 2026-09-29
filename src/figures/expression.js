/* Data-only plot expressions. No property lookup, assignment, statements or
 * JavaScript evaluation reaches course data. The small grammar is intentionally
 * bounded so a malformed import cannot monopolize the reader's tab. */
const FUNCTIONS = Object.freeze({
  abs: Math.abs, acos: Math.acos, asin: Math.asin, atan: Math.atan,
  ceil: Math.ceil, cos: Math.cos, cosh: Math.cosh, exp: Math.exp,
  floor: Math.floor, log: Math.log, log10: Math.log10, max: Math.max,
  min: Math.min, pow: Math.pow, round: Math.round, sign: Math.sign,
  sin: Math.sin, sinh: Math.sinh, sqrt: Math.sqrt, tan: Math.tan,
  tanh: Math.tanh, trunc: Math.trunc
});
const TOKEN = /\s*(?:((?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)|([a-zA-Z][a-zA-Z0-9_.]*)|(\*\*|[()+\-*/%^,]))/gy;

export function parseExpression(source) {
  const input = String(source || "");
  if (input.length > 160) throw new Error("expression is too long");
  const tokens = [];
  let at = 0;
  while (at < input.length) {
    if (/^\s*$/.test(input.slice(at))) break;
    TOKEN.lastIndex = at;
    const match = TOKEN.exec(input);
    if (!match || match.index !== at) throw new Error("expression contains unsupported syntax");
    tokens.push(match[1] || match[2] || match[3]);
    if (tokens.length > 80) throw new Error("expression has too many tokens");
    at = TOKEN.lastIndex;
  }
  let i = 0, nodes = 0;
  const peek = () => tokens[i];
  const take = expected => {
    if (peek() !== expected) throw new Error(`expected ${expected}`);
    i++;
  };
  const node = (kind, args) => {
    if (++nodes > 80) throw new Error("expression is too complex");
    return { kind, ...args };
  };
  const atom = depth => {
    if (depth > 24) throw new Error("expression is too deep");
    const t = tokens[i++];
    if (t === "(" ) { const e = sum(depth + 1); take(")"); return e; }
    if (t && /^(?:\d|\.)/.test(t)) return node("number", { value: Number(t) });
    if (t === "x") return node("x", {});
    if (t === "pi" || t === "Math.PI") return node("number", { value: Math.PI });
    if (t === "e" || t === "Math.E") return node("number", { value: Math.E });
    const name = t?.startsWith("Math.") ? t.slice(5) : t;
    if (!Object.hasOwn(FUNCTIONS, name)) throw new Error("unknown name or function");
    take("(");
    const args = [];
    if (peek() !== ")") {
      do { args.push(sum(depth + 1)); if (peek() !== ",") break; i++; }
      while (args.length < 5);
    }
    take(")");
    if (!args.length || args.length > 4) throw new Error("function needs 1 to 4 arguments");
    return node("call", { name, args });
  };
  const power = depth => {
    let left = atom(depth);
    if (peek() === "^" || peek() === "**") {
      i++; left = node("binary", { op: "^", left, right: unary(depth + 1) });
    }
    return left;
  };
  const unary = depth => {
    if (peek() === "+" || peek() === "-") {
      const op = tokens[i++];
      return node("unary", { op, arg: unary(depth + 1) });
    }
    return power(depth);
  };
  const product = depth => {
    let left = unary(depth);
    while (["*", "/", "%"].includes(peek())) {
      const op = tokens[i++];
      left = node("binary", { op, left, right: unary(depth) });
    }
    return left;
  };
  const sum = depth => {
    let left = product(depth);
    while (peek() === "+" || peek() === "-") {
      const op = tokens[i++];
      left = node("binary", { op, left, right: product(depth) });
    }
    return left;
  };
  const tree = sum(0);
  if (i !== tokens.length) throw new Error("expression has trailing syntax");
  const evaluate = (n, x) => {
    if (n.kind === "number") return n.value;
    if (n.kind === "x") return x;
    if (n.kind === "unary") return n.op === "-" ? -evaluate(n.arg, x) : evaluate(n.arg, x);
    if (n.kind === "call") return FUNCTIONS[n.name](...n.args.map(a => evaluate(a, x)));
    const a = evaluate(n.left, x), b = evaluate(n.right, x);
    if (n.op === "+") return a + b;
    if (n.op === "-") return a - b;
    if (n.op === "*") return a * b;
    if (n.op === "/") return a / b;
    if (n.op === "%") return a % b;
    return a ** b;
  };
  return x => evaluate(tree, x);
}
