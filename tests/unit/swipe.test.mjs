import test from "node:test";
import assert from "node:assert/strict";
import { swipeIntent, opensSidebar, slideIntent } from "../../src/lib/swipe.js";

test("a sidebar swipe declares rightward intent", () => {
  assert.equal(swipeIntent(8, 3), null, "ignores movement below the intent threshold");
  assert.equal(swipeIntent(14, 3), "right", "locks onto a clearly horizontal movement");
  assert.equal(swipeIntent(8, 12), "other", "a vertical scroll with rightward drift is not a swipe");
  assert.equal(swipeIntent(8, -12), "other", "an upward scroll with rightward drift is not a swipe");
  assert.equal(swipeIntent(-14, 1), "other", "leftward movement is not a swipe");
});

test("a slide drag waits for horizontal intent", () => {
  assert.equal(slideIntent(-8, 1), null);
  assert.equal(slideIntent(-20, 3), "next");
  assert.equal(slideIntent(20, 3), "previous");
  assert.equal(slideIntent(12, 20), "other");
});

test("a locked sidebar swipe commits by horizontal distance", () => {
  assert.equal(opensSidebar(47), false, "releasing a short drag closes the drawer");
  assert.equal(opensSidebar(48), true, "vertical drift after lock does not change the commitment");
  assert.equal(opensSidebar(60), true);
});
