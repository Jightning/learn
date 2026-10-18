#!/usr/bin/env node
/* Pooling defines which skills a run may exercise; selection may emphasize a
 * weak skill, but it must preserve room for the rest of the selected range. */
import assert from "node:assert/strict";
import test from "node:test";

const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  clear: () => store.clear()
};

const { categoryPool, rangePool, selectMixed, retryVariant } = await import("../../src/lib/practice-pool.js");

const q = (id, subId, concept, extra = {}) => ({ id, subId, concept, ...extra });
const idx = {
  SUBS: { "s1-1": {}, "s1-2": {}, "s2-1": {} },
  QALL: [q("a", "s1-1", "one"), q("b", "s1-2", "two"), q("c", "s2-1", "three")],
  PALL: [q("one:p1", null, "one"), q("two:p1", null, "two"), q("other:p1", null, "other")]
};

test("a subsection range includes checks and variants for only its concepts", () => {
  assert.deepEqual(rangePool(idx, "s1-2", "s1-1").map(item => item.id), ["a", "b", "one:p1", "two:p1"]);
  assert.deepEqual(rangePool(idx, "s1-2").map(item => item.id), ["b", "c", "two:p1"]);
});

test("weak attempts receive priority while a mixed set keeps broad coverage", () => {
  const pool = [
    q("weak", "s1-1", "one"), q("plain-a", "s1-2", "two"),
    q("plain-b", "s2-1", "three"), q("plain-c", "s2-1", "four")
  ];
  const state = { get: id => id === "weak" ? { got: 0 } : null };
  const chosen = selectMixed(pool, "c", state, 3, () => 0.5);
  assert.equal(chosen.length, 3);
  assert.ok(chosen.some(item => item.id === "weak"));
  assert.ok(chosen.some(item => item.id !== "weak"));
});

test("a retry uses another unused variant of the same concept", () => {
  const pool = [q("first", null, "one"), q("second", null, "one"), q("other", null, "two")];
  assert.equal(retryVariant(pool, pool[0], new Set(["first"])).id, "second");
  assert.equal(retryVariant(pool, pool[0], new Set(["first", "second"])), null);
});

test('a placed combined task makes variants for each assessed component eligible', () => {
  const course = { ...idx, QALL: [q('joint', 's1-1', null, { typeId: 'one', skills: ['one', 'two'] })],
    PALL: [q('two-variant', null, null, { typeId: 'two', skills: ['two'] }), q('outside', null, null, { typeId: 'other', skills: ['other'] })] };
  assert.deepEqual(rangePool(course, 's1-1', 's1-1').map(item => item.id), ['joint', 'two-variant']);
});


test('quarantined items are excluded from range, category, weighted, and retry selection', () => {
  const banned = q('banned', 's1-1', 'one', { quarantined: true });
  const safe = q('safe', 's1-1', 'one');
  const course = { ...idx, QALL: [banned], PALL: [safe], CAT: { drillsOf: () => ['one'] } };
  assert.deepEqual(rangePool(course, 's1-1', 's1-1').map(q => q.id), ['safe']);
  assert.deepEqual(categoryPool([banned, safe], course, 'all'), [safe]);
  assert.deepEqual(categoryPool([banned, safe], course, null), [safe]);
  assert.deepEqual(selectMixed([banned, safe], 'c', { get: () => null }), [safe]);
  assert.equal(retryVariant([banned], safe, new Set()), null);
});
