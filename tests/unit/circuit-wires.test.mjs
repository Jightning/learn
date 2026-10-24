import test from "node:test";
import assert from "node:assert/strict";
import { circuit } from "../../src/figures/circuit.js";

const wires = spec => [...circuit(spec).matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" class="fx-c-wire"/g)]
  .map(match => match.slice(1).map(Number));

test("manual branch wires stop at every component terminal in either direction", () => {
  const parts = [{ type: "capacitor", x: 1, y: 1 }, { type: "switch", x: 3, y: 1 }];
  const expected = [[42, 90, 66, 90], [114, 90, 162, 90], [210, 90, 234, 90]];
  assert.deepEqual(wires({ wires: [{ from: [0, 1], to: [4, 1] }], parts }), expected);
  assert.deepEqual(wires({ wires: [{ from: [4, 1], to: [0, 1] }], parts }), expected.map(([a, b, c, d]) => [c, d, a, b]));
});

test("vertical branches and wires authored up to a component center leave its body open", () => {
  const parts = [{ type: "battery", x: 1, y: 1, dir: "v" }];
  assert.deepEqual(wires({ wires: [{ from: [1, 0], to: [1, 2] }], parts }),
    [[90, 42, 90, 66], [90, 114, 90, 138]]);
  assert.deepEqual(wires({ wires: [{ from: [1, 0], to: [1, 1] }, { from: [1, 1], to: [1, 2] }], parts }),
    [[90, 42, 90, 66], [90, 114, 90, 138]]);
});

test("perpendicular, offset and already separated wires retain their geometry", () => {
  const parts = [{ type: "capacitor", x: 1, y: 1 }];
  assert.deepEqual(wires({ wires: [{ from: [1, 0], to: [1, 2] }, { from: [0, 2], to: [2, 2] },
    { from: [0, 1], to: [0.5, 1] }], parts }),
  [[90, 42, 90, 138], [42, 138, 138, 138], [42, 90, 66, 90]]);
});

test("the canvas includes symbols outside the declared grid size", () => {
  const svg = circuit({ w: 2, h: 2, parts: [{ type: "capacitor", x: -1, y: -1 }] });
  const [x, y] = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
  assert.ok(x <= -31 && y <= -21);
});
