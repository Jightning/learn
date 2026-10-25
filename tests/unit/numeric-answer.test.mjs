import test from "node:test";
import assert from "node:assert/strict";
import { numericAnswer, numericTolerance } from "../../src/lib/numeric-answer.js";
import { checkValue, scoreResponse, hasResponse } from "../../src/lib/response-scoring.js";
import { checkResponse } from "../../src/lib/question-schema.js";

test("numeric responses accept scientific literals in ordinary and multipart answers", () => {
  for (const value of ["4.99e12", "4.99E+12", "4.99 × 10^12", "4.99*10^12", "4.99×10¹²"]) {
    assert.equal(numericAnswer(value), 4.99e12);
    assert.equal(checkValue({ kind: "number", value: 4.99e12 }, value), true);
    assert.equal(hasResponse({ kind: "number" }, value), true);
  }
  for (const value of ["-1.6e-19", "−1.6 × 10^-19", "-1.6×10⁻¹⁹"]) assert.equal(numericAnswer(value), -1.6e-19);
  const response = { kind: "blanks", fields: [{ id: "n", response: { kind: "number", value: 499, tolerance: 0.1 } }] };
  assert.equal(scoreResponse(response, { n: "4.99×10^2" }).correct, true);
  assert.equal(checkValue({ kind: "number", value: 499 }, "4.98e2"), false);
});

test("numeric literals reject incomplete notation, expressions, nonfinite values and coercion", () => {
  for (const value of ["", " ", "1e", "1e-", "1e999", "Infinity", "NaN", "2+3", "2^3", "1×10^", "0x10", [], {}, true]) {
    assert.ok(Number.isNaN(numericAnswer(value)), String(value));
    assert.equal(hasResponse({ kind: "number" }, value), false);
  }
  for (const value of [0, "0", ".5", "-12.5"]) assert.equal(numericAnswer(value), Number(value));
});

test("fractions work in numeric fields without enabling arbitrary expressions", () => {
  for (const value of ["1/3", " 1 / 3 ", "1⁄3", "-1/-3", "1e-3/3e-3"]) {
    assert.equal(numericAnswer(value), 1/3);
    assert.equal(checkValue({ kind: "number", value: 1/3 }, value), true);
    assert.equal(hasResponse({ kind: "number" }, value), true);
  }
  assert.equal(numericAnswer("-3/2"), -1.5);
  assert.equal(scoreResponse({ kind: "blanks", fields: [{ id: "factor", response: { kind: "number", value: 1/3 } }] }, { factor: "1/3" }).correct, true);
  for (const value of ["1/0", "0/0", "1/", "/3", "1/2/3", "(1+2)/3", "1/Infinity"]) {
    assert.equal(hasResponse({ kind: "number" }, value), false);
    assert.ok(Number.isNaN(numericAnswer(value)));
  }
});

test("factor tolerance defaults to 0.05 while explicit precision and other units are preserved", () => {
  const response = { kind: "number", value: 1/3, unit: "factor" };
  assert.equal(numericTolerance(response), 0.05);
  for (const value of ["0.3", "0.33", "1/3"]) assert.equal(checkValue(response, value), true);
  assert.equal(checkValue(response, "0.4"), false);
  assert.equal(checkValue({ ...response, tolerance: 0 }, "0.33"), false);
  assert.equal(numericTolerance({ kind: "number", value: 1e-9, unit: "A" }), 0);
});

test("allowSymbols false requires decimals for submission, grading and multipart scoring", () => {
  const response = { kind: "number", value: 0.5, allowSymbols: false };
  for (const value of ["0.5", "+.5", " 0.500 "]) {
    assert.equal(hasResponse(response, value), true);
    assert.equal(checkValue(response, value), true);
  }
  for (const value of ["1/2", "5e-1", "5×10^-1", "π", "pi", "e"]) {
    assert.equal(hasResponse(response, value), false);
    assert.equal(checkValue(response, value), false);
  }
  assert.equal(checkValue({ ...response, allowSymbols: true }, "1/2"), true);
  const blanks = { kind: "blanks", fields: [{ id: "n", label: "Decimal", response }], scoring: {
    criteria: [{ id: "n", field: "n", points: 1, match: { kind: "number", value: 0.5 } }]
  } };
  assert.equal(scoreResponse(blanks, { n: "1/2" }).score, 0);
  assert.equal(scoreResponse(blanks, { n: ".5" }).score, 1);
  const errors = [];
  checkResponse({ response: blanks }, "blanks", errors);
  assert.deepEqual(errors, []);
  checkResponse({ response: { ...response, allowSymbols: "false" } }, "number", errors);
  assert.match(errors.join("\n"), /allowSymbols must be a boolean/);
});
