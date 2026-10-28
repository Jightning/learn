import test from "node:test";
import assert from "node:assert/strict";
import { allocateOutcomeWeights } from "../../src/lib/outcome-weights.js";

test("allocation conserves outcome budgets independently of member counts", () => {
  const entries = [{ id: "a", scoreFor: "o", importance: 3 }, { id: "b", scoreFor: "o", importance: 1 }, { id: "c", scoreFor: "p", importance: 1 }];
  const { outcomes, weights } = allocateOutcomeWeights(entries, { o: 3, p: 1 });
  assert.deepEqual(outcomes, { o: .75, p: .25 });
  assert.equal(weights.a, .5625); assert.equal(weights.b, .1875); assert.equal(weights.c, .25);
  entries.push({ id: "d", scoreFor: "o", importance: 2 });
  const next = allocateOutcomeWeights(entries, { o: 3, p: 1 });
  assert.equal(next.weights.c, .25);
  assert.equal(next.weights.a + next.weights.b + next.weights.d, .75);
});

test("finite large weights do not overflow normalized budgets", () => {
  const entries = [{ id: "a", scoreFor: "o", importance: 1e308 }, { id: "b", scoreFor: "o", importance: 1e308 }];
  const { outcomes, weights } = allocateOutcomeWeights(entries, { o: 1e308, p: 1e308 });
  assert.equal(outcomes.o, .5); assert.equal(weights.a, .25); assert.equal(weights.b, .25);
  assert.deepEqual(allocateOutcomeWeights([], {}).outcomes, {});
});

test("ordinary fractional budgets retain exact legacy allocation arithmetic", () => {
  const entries = [{ id: "a", scoreFor: "o", importance: .3 }, { id: "b", scoreFor: "o", importance: .2 }];
  const { outcomes, weights } = allocateOutcomeWeights(entries, { o: .3, p: .5 });
  const legacyBudget = .3 / (.3 + .5);
  assert.equal(outcomes.o, legacyBudget);
  assert.equal(weights.a, legacyBudget * .3 / (.3 + .2));
  assert.equal(weights.b, legacyBudget * .2 / (.3 + .2));
});
