import test from "node:test";
import assert from "node:assert/strict";
import { categoryPool } from "../../src/lib/practice-pool.js";
import { questionHelpHref } from "../../src/lib/questions.js";
test("category teaching gives bank membership without requiring duplicate concept tags", () => {
  const idx = { CAT: { cats: { methods: {} }, drillsOf: () => ["legacy"] } };
  const pool = [{ id: "bank", concept: "untagged", scopes: ["methods", "course"] },
    { id: "legacy", concept: "legacy" }, { id: "other", concept: "untagged", scopes: ["course"] }];
  assert.deepEqual(categoryPool(pool, idx, "methods").map(q => q.id), ["bank", "legacy"]);
  assert.equal(questionHelpHref("course", { help: "methods" }, idx), "#/course/cat/methods");
  assert.equal(questionHelpHref("course", { help: "s1-1" }, idx), "#/course/s1-1");
});
