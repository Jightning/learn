import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

const root = new URL('../../courses/ece20001/sections/14-mosfets/', import.meta.url);
const read = name => load(readFileSync(new URL(name, root), 'utf8'));

function expectedPoints(from, to, samples, fn) {
  return Array.from({ length: samples }, (_, i) => {
    const x = from + (to - from) * i / (samples - 1);
    return [x, fn(x)];
  });
}

function assertSeries(series, label, points, from, to) {
  assert.equal(series.label, label);
  assert.equal(series.points.length, 300);
  assert.equal(points.length, 300);
  for (let i = 0; i < points.length; i++) {
    assert.ok(Math.abs(series.points[i][0] - points[i][0]) <= 1e-12,
      `${label} x-grid point ${i}: expected ${points[i][0]}, got ${series.points[i][0]}`);
  }
  for (let i = 0; i < points.length; i++) {
    assert.ok(Math.abs(series.points[i][1] - points[i][1]) <= 1e-12,
      `${label} point ${i}: expected ${points[i][1]}, got ${series.points[i][1]}`);
  }
  assert.deepEqual([points[0][0], points.at(-1)[0]], [from, to]);
}

test('legacy MOSFET plot conditionals are represented by equivalent sampled points', () => {
  const operation = read('2-mosfet-operation-and-regions.yaml');
  const opBlock = operation.blocks.find(block => block.authorId === 'block-5246c17a-546');
  assert.ok(opBlock);
  assert.deepEqual([opBlock.t, opBlock.kind, opBlock.id], ['figure', 'plot', 'mosfet-curves']);
  assert.deepEqual(opBlock.spec.xrange, [0, 4]);
  assert.deepEqual(opBlock.spec.yrange, [0, 4]);
  assert.equal(opBlock.spec.xlabel, 'V_DS (V)');
  assert.equal(opBlock.spec.ylabel, 'I_D (mA)');
  assert.equal(opBlock.spec.legend, true);
  const curves = opBlock.spec.series;
  assert.equal(curves.length, 3);
  for (const [series, a, label] of curves.map((s, i) => [s, [.75, 1.25, 1.75][i], [`V_GS = 1.5 V`, `V_GS = 2.0 V`, `V_GS = 2.5 V`][i]])) {
    assertSeries(series, label, expectedPoints(0, 4, 300, x => x <= a ? 2 * (a * x - .5 * x * x) : a * a), 0, 4);
  }

  const transfer = read('3-load-line-and-transfer-characteristic.yaml');
  const transferBlock = transfer.blocks.find(block => block.authorId === 'block-314bdc21-7c1');
  assert.ok(transferBlock);
  assert.deepEqual([transferBlock.t, transferBlock.kind, transferBlock.id], ['figure', 'plot', 'vtc']);
  assert.deepEqual(transferBlock.spec.xrange, [0, 5]);
  assert.deepEqual(transferBlock.spec.yrange, [0, 11]);
  assert.equal(transferBlock.spec.xlabel, 'V_G (V)');
  assert.equal(transferBlock.spec.ylabel, 'V_D (V)');
  assert.equal(transferBlock.spec.legend, false);
  assert.equal(transferBlock.spec.series.length, 1);
  assertSeries(transferBlock.spec.series[0], 'V_D', expectedPoints(0, 5, 300,
    x => x < 1 ? 10 : Math.max(.3, 10 - (x - 1) ** 2)), 0, 5);
});
