import assert from "node:assert/strict";
import test from "node:test";
import { gradeFormula, parseFormula, checkFormulaResponse } from "../../src/lib/formula.js";
import { checkResponse } from "../../tools/lib/question-schema.mjs";
import { normalizeMathText } from "../../src/lib/math-text.js";

const expression = answer => ({ kind: "formula", answer, variables: ["x"] });
const equation = { kind: "formula", answer: "y = 2*x + 1", variables: ["x", "y"], solveFor: "y" };

test("formula display hides coefficient multiplication without changing verification", () => {
  const parsed = parseFormula("y=2*x+1");
  assert.doesNotMatch(parsed.tex, /\\cdot/);
  assert.match(parsed.nodes[1].toString(), /2 \* x/);
  assert.match(parseFormula("2*3").tex, /\\cdot/);
  assert.doesNotMatch(parseFormula("2*(x+1)").tex, /\\cdot/);
  assert.equal(gradeFormula(equation, "y=2(x+1/2)"), true);
});

test("formula keys accept reordered terms and reject an established mismatch", () => {
  assert.equal(gradeFormula(equation, "y = 1 + 2x"), true);
  assert.equal(gradeFormula(equation, "y = 2(x + 1/2)"), true);
  assert.equal(gradeFormula(equation, "1 + 2*x = y"), true);
  assert.equal(gradeFormula(equation, "y = 2*x + 2"), false);
  assert.equal(gradeFormula(expression("x+x"), "2x"), true);
  assert.equal(gradeFormula(expression("x/2"), "0.5*x"), true);
  assert.equal(gradeFormula(expression("2*(x+1)"), "2x+2"), true);
  assert.equal(gradeFormula(expression("(x+1)^2"), "x^2+2x+1"), true);
});

test("formula parsing gives typeset powers and roots without evaluating arbitrary text", () => {
  assert.match(parseFormula("e^x").tex, /\^/);
  assert.match(parseFormula("sqrt(x)").tex, /sqrt/);
  for (const source of ["x=", "x=y=1", "x+", "import(x)", "random()", "x.a", "[x,1]", "x;1", "x=2;3", "foo(x)"])
    assert.throws(() => parseFormula(source));
  assert.throws(() => parseFormula("z", ["x"]), /undeclared variable/);
  assert.equal(gradeFormula(equation, "y=x1"), false);
  assert.equal(gradeFormula(equation, "y=x_1"), false);
});

test("domain-sensitive cancellation is rejected and matching roots remain checkable", () => {
  assert.equal(gradeFormula(expression("x/x"), "1"), false);
  assert.equal(gradeFormula(expression("(x^2-1)/(x-1)"), "x+1"), false);
  assert.equal(gradeFormula(expression("sqrt(x^2)"), "x"), false);
  assert.equal(gradeFormula(expression("sqrt(x)"), "sqrt(x)"), true);
  assert.equal(gradeFormula(expression("sqrt(x)"), "sqrt((x))"), true);
  assert.equal(gradeFormula(expression("abs(x)"), "abs((x))"), true);
  assert.equal(gradeFormula(expression("e^x"), "e^x"), true);
  assert.notEqual(gradeFormula(expression("x"), "1.00000000000001*x"), true);
});

test("formula input bounds and finite real constants are enforced", () => {
  for (const source of ["x".repeat(257), "x^100", "x^(10*10)", "1/0", "x/0", "sqrt(-1)", "x*log(0)", "1e100"])
    assert.throws(() => parseFormula(source));
  assert.throws(() => parseFormula("(".repeat(20) + "x" + ")".repeat(20)), /complex/);
  assert.throws(() => parseFormula(Array(45).fill("x").join("+")), /complex/);
});

test("equation keys require an isolated answer variable and matching input shape", () => {
  assert.throws(() => checkFormulaResponse({ ...equation, solveFor: undefined }), /solveFor/);
  assert.throws(() => checkFormulaResponse({ ...equation, answer: "y+x = 1" }), /Isolate/);
  assert.throws(() => gradeFormula(equation, "2x+1"), /whole equation/);
  assert.equal(gradeFormula(equation, "y = y+1"), false);
});

test("schema validates formula keys and independent boolean self-check toggles", () => {
  for (const response of [equation, { kind: "formula", answer: "sqrt(4)", variables: [] },
    { kind: "self", model: "Answer", mathSymbols: true, formulaParsing: false },
    { kind: "self", model: "Answer", mathSymbols: false, formulaParsing: true }]) {
    const errs = []; checkResponse({ response }, "question", errs);
    assert.deepEqual(errs, []);
  }
  for (const response of [{ ...equation, answer: "z+1" }, { ...equation, variables: ["x", "x"] },
    { kind: "self", model: "Answer", formulaParsing: "yes" }, { ...equation, mathSymbols: true }]) {
    const errs = []; checkResponse({ response }, "question", errs);
    assert.ok(errs.length);
  }
});


test("calculus expressions evaluate and prime equations match differential notation", () => {
  assert.equal(gradeFormula(expression("2*x"), "diff(x^2,x)"), true);
  assert.equal(gradeFormula(expression("cos(x)"), "diff(sin(x),x)"), true);
  assert.equal(gradeFormula(expression("x^3/3"), "integral(x^2,x)"), true);
  assert.equal(gradeFormula(expression("1/3"), "integral(x^2,x,0,1)"), true);
  assert.equal(gradeFormula({ ...equation, answer: "y'=2*x", solveFor: "y'" }, "diff(y,x)=2*x"), true);
  assert.equal(gradeFormula({ ...equation, answer: "y'=2*x", solveFor: "y'" }, "y'=3*x"), false);
  assert.equal(gradeFormula({ ...equation, answer: "y''=2", solveFor: "y''" }, "diff(diff(y,x),x)=2"), true);
  assert.match(parseFormula("integral(x^2,x)").tex, /int/);
  assert.match(parseFormula("y'=2*x").tex, /prime/);
  assert.throws(() => parseFormula("integral(sin(x),x)"), /Automatic integration supports polynomials/);
});

test("editor differential and integral exports preserve their mathematical structure", () => {
  assert.equal(normalizeMathText("(d y)/(d x)=2x"), "diff(y,x)=2x");
  assert.equal(normalizeMathText("(d)/(d x)x^2"), "diff(x^2,x)");
  assert.equal(normalizeMathText("y^′=2x"), "y'=2x");
  assert.equal(normalizeMathText("int x^2 d x"), "integral(x^2,x)");
  assert.equal(normalizeMathText("int _0^1x^2 d x"), "integral(x^2,x,0,1)");
  assert.equal(normalizeMathText("int _a^bx^2 d x"), "integral(x^2,x,a,b)");
});
