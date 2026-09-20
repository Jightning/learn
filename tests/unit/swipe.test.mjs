import test from "node:test";
import assert from "node:assert/strict";
import { swipeIntent, opensSidebar } from "../../src/lib/swipe.js";

test("a sidebar swipe declares rightward intent", () => {
  assert.equal(swipeIntent(8, 3), null, "ignores movement below the intent threshold");
  assert.equal(swipeIntent(14, 3), "right", "locks onto a clearly horizontal movement");
  assert.equal(swipeIntent(8, 12), "other", "a vertical scroll with rightward drift is not a swipe");
  assert.equal(swipeIntent(-14, 1), "other", "leftward movement is not a swipe");
});

test("a sidebar swipe must be long and strongly horizontal", () => {
  assert.equal(opensSidebar(71, 0), false, "rejects short horizontal movement");
  assert.equal(opensSidebar(90, 31), false, "rejects a swipe outside the horizontal angle");
  assert.equal(opensSidebar(90, 30), true, "accepts the boundary of the horizontal angle");
  assert.equal(opensSidebar(90, 10), true, "accepts an explicit right swipe");
});
