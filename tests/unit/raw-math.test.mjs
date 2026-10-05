import test from "node:test";
import assert from "node:assert/strict";
import { rawMathFragment, unicodeConstructedMathFragment } from "../../tools/lib/raw-math.mjs";

test("detects TeX that would print literally in prose", () => {
  for (const value of ["e^{2x}", "x_n", "x = 2", "Use \\frac{1}{2}", "\\lambda > 0"])
    assert.ok(rawMathFragment(value), value);
});

test("marked math and code are not mistaken for bare TeX", () => {
  for (const value of [
    "Growth is <m>e^{2x}</m>.",
    "<p>Let <m>x = 2</m>.</p>",
    "<code>e^{2x}</code>",
    "Measured gain (g&nbsp;=&nbsp;0.61)."
  ]) assert.equal(rawMathFragment(value), "", value);
});

test("constructed Unicode summation notation is targeted without flagging Greek prose", () => {
  assert.equal(unicodeConstructedMathFragment("Sum values Σᵢ₌₁ⁿ aᵢ."), "Σᵢ₌₁ⁿ");
  for (const value of [
    "The Greek letter Σ appears here.",
    "<m>Σᵢ₌₁ⁿ a_i</m>",
    "<code>Σᵢ₌₁ⁿ</code>"
  ]) assert.equal(unicodeConstructedMathFragment(value), "", value);
});
