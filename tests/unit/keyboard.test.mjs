import assert from "node:assert/strict";
import test from "node:test";
import { isEditingEvent } from "../../src/lib/keyboard.js";

test("site shortcuts defer to native inputs, editable ancestors and shadow editors", () => {
  const element = tag => ({ matches: selector => selector.split(",").includes(tag) });
  for (const tag of ["input", "textarea", "select", "math-field", '[role="textbox"]', 'dialog[open]'])
    assert.equal(isEditingEvent({ target: element(tag) }), true);
  assert.equal(isEditingEvent({ target: element("span"), composedPath: () => [element("span"), element("math-field")] }), true);
  assert.equal(isEditingEvent({ target: { isContentEditable: true } }), true);
  assert.equal(isEditingEvent({ defaultPrevented: true }), true);
  assert.equal(isEditingEvent({ target: element("button") }), false);
});
