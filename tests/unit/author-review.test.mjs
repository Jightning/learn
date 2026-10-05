import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import * as YAML from "js-yaml";
import { reviewIndex, changedItems, screenPackets, fullItems, saveIssues, saveCorrections, readReview, acceptReview, recordReviewView, affectedItems } from "../../tools/lib/author-review.mjs";
import { readPlan } from "../../tools/lib/author-packets.mjs";

function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), "review-index-")), state = join(dir, ".state");
  const put = (name, data) => { const file = join(dir, name); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, YAML.dump(data, { lineWidth: -1 })); return file; };
  const file = put("sections/01-unit/1-start.yaml", { title: "Start", blocks: [
    { t: "def", term: "Total", core: "Combine every term.", objectives: ["obj-total"] },
    { t: "p", h: "The qualification appears here. " + "Original evidence. ".repeat(60) }],
    quiz: [{ type: "total", concept: "concept-total", q: "Find the total", response: { kind: "self", model: "Sum each term." } }] });
  put("categorize/objectives.yaml", [{ id: "obj-total", outcome: "Compute a total", families: ["family-total"] }]);
  put("categorize/families.yaml", [{ id: "family-total", description: "Summation" }]);
  put("categorize/concepts.yaml", [{ id: "concept-total", term: "Total", body: "Combine all terms." }]);
  put("materials/plan.yaml", { reader: { background: ["addition"] }, lessons: [{ id: "s1-1", objectives: ["obj-total"], families: ["family-total"] }] });
  try { fn({ dir, state, file, put }); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("identity survives reordering, edits, and repeated indexing; new items alone gain IDs", () => fixture(({ dir, state, file }) => {
  const before = reviewIndex(dir, state), bytes = readFileSync(file, "utf8");
  assert.deepEqual(reviewIndex(dir, state), before);
  assert.equal(readFileSync(file, "utf8"), bytes);
  const unit = YAML.load(bytes), id = unit.blocks[0].authorId;
  unit.blocks.reverse(); unit.blocks[1].core = "Changed explanation."; unit.blocks.push({ t: "p", h: "New content." });
  writeFileSync(file, YAML.dump(unit));
  const after = reviewIndex(dir, state), changes = changedItems(before, after);
  assert.equal(YAML.load(readFileSync(file, "utf8")).blocks[1].authorId, id);
  assert.ok(changes.some(c => c.id === id && c.change === "changed"));
  assert.equal(changes.filter(c => c.change === "added").length, 1);
  assert.equal(after.entries.filter(e => e.kind === "quiz").length, 1);
}));

test("section screens combine original excerpts, identify truncation, and expand several IDs without hashes", () => fixture(({ dir, state }) => {
  const index = reviewIndex(dir, state), packets = screenPackets(index, readPlan(dir), { section: "s1" });
  const section = packets.find(p => p.section === "s1");
  assert.equal(section.items.length, 3);
  assert.ok(section.items.some(i => i.truncated?.includes("h")));
  assert.equal(section.outline[0].defines, "Total");
  assert.ok(!JSON.stringify(packets).includes('"hash"'));
  const full = fullItems(index, section.items.map(i => i.id));
  assert.ok(full[1].content.h.length > 280);
  assert.ok(!JSON.stringify(full).includes("authorId"));
  assert.throws(() => fullItems(index, ["missing"]), /unknown review ID/);
}));

test("correction deltas detect unreported edits and include affected question/context; acceptance is separate", () => fixture(({ dir, state, file }) => {
  const initial = reviewIndex(dir, state), concept = initial.entries.find(e => e.kind === "concept");
  const review = saveIssues(state, initial, { items: [{ target: concept.id, issue: "Definition incomplete", done: "Every term included" }] });
  assert.throws(() => acceptReview(state, initial), /correction results/);
  const unit = YAML.load(readFileSync(file, "utf8")); unit.blocks[1].h = "Unreported edit.";
  writeFileSync(file, YAML.dump(unit));
  const now = reviewIndex(dir, state);
  saveCorrections(state, now, { results: [{ issue: review.issues[0].id, disposition: "already-satisfied", affected: [concept.id] }] });
  const saved = readReview(state);
  assert.equal(saved.status, "recheck");
  assert.ok(saved.changes.some(c => c.id === unit.blocks[1].authorId));
  const screens = screenPackets(now, readPlan(dir), { changed: true, review: saved });
  const items = screens.flatMap(p => p.items);
  assert.ok(items.some(i => i.kind === "quiz"));
  assert.ok(items.some(i => i.id === unit.blocks[1].authorId && i.change === "changed"));
  assert.ok(!JSON.stringify(screens).includes('"hash"'));
  assert.throws(() => acceptReview(state, now), /needs recheck/);
  recordReviewView(state, now, items.map(i => i.id));
  acceptReview(state, now); assert.equal(readReview(state).status, "accepted");
}));

test("duplicate identities fail before writing and deleted targets retain explicit evidence", () => fixture(({ dir, state, file }) => {
  const index = reviewIndex(dir, state), unit = YAML.load(readFileSync(file, "utf8"));
  const deleted = unit.blocks[0].authorId;
  unit.blocks[1].authorId = deleted; writeFileSync(file, YAML.dump(unit));
  const bytes = readFileSync(file, "utf8");
  assert.throws(() => reviewIndex(dir, state), /duplicate review ID/);
  assert.equal(readFileSync(file, "utf8"), bytes);
  unit.blocks.shift(); unit.blocks[0].authorId = index.entries.find(e => e.kind === "block" && e.position === 2).id;
  writeFileSync(file, YAML.dump(unit));
  assert.ok(changedItems(index, reviewIndex(dir, state)).some(c => c.id === deleted && c.change === "deleted"));
}));

test("stale issue targets and incomplete correction reports fail rather than losing pending evidence", () => fixture(({ dir, state, file }) => {
  const index = reviewIndex(dir, state), target = index.entries[0].id;
  writeFileSync(join(state, "screen-baseline.yaml"), YAML.dump(index));
  const unit = YAML.load(readFileSync(file, "utf8")); unit.blocks[0].core = "Edited after screening.";
  writeFileSync(file, YAML.dump(unit));
  const now = reviewIndex(dir, state), report = { items: [{ target, issue: "Missing", done: "Present" }] };
  assert.throws(() => saveIssues(state, now, report), /stale issue target/);
  writeFileSync(join(state, "screen-baseline.yaml"), YAML.dump(now));
  saveIssues(state, now, report);
  assert.throws(() => saveIssues(state, now, report), /finish the saved review/);
  assert.throws(() => saveCorrections(state, now, { results: [] }), /every issue/);
}));

test("shared objective closure reaches questions in other subsections", () => {
  const entries = [
    { id: "b", kind: "block", sub: "s1-1", position: 1, content: { objectives: ["o"] } },
    { id: "o", kind: "objective", content: {} },
    { id: "q", kind: "quiz", sub: "s2-1", position: 1, content: { objectives: ["o"] } },
    { id: "unrelated", kind: "block", sub: "s3-1", position: 1, content: {} }];
  assert.deepEqual(affectedItems({ entries }, ["b"]).map(e => e.id), ["b", "o", "q"]);
});

test("large shared context is referenced once and every screen respects its byte budget", () => fixture(({ dir, state }) => {
  const index = reviewIndex(dir, state), plan = readPlan(dir);
  plan.data.reader.goal = "Very long reader context. ".repeat(2000);
  const packets = screenPackets(index, plan, { maxBytes: 4000 });
  assert.ok(packets.length > 1);
  for (const packet of packets) {
    assert.equal(packet.context, "review-context.yaml");
    assert.ok(Buffer.byteLength(YAML.dump(packet, { lineWidth: -1 })) <= 4000);
  }
}));

test("insertion preserves surviving review revisions instead of invalidating every following position", () => fixture(({ dir, state, file }) => {
  const before = reviewIndex(dir, state), unit = YAML.load(readFileSync(file, "utf8"));
  unit.blocks.unshift({ t: "p", h: "New opener." }); writeFileSync(file, YAML.dump(unit));
  const delta = changedItems(before, reviewIndex(dir, state));
  assert.equal(delta.length, 1); assert.equal(delta[0].change, "added");
}));

test("changed source evidence invalidates prior review even with identical course text", () => fixture(({ dir, state, put }) => {
  const source = put("evidence.yaml", { fact: "original" });
  mkdirSync(join(state, "sources"), { recursive: true });
  writeFileSync(join(state, "sources/catalog.yaml"), YAML.dump({ sources: [{ id: "src", path: source }] }));
  const before = reviewIndex(dir, state);
  put("evidence.yaml", { fact: "updated" });
  const delta = changedItems(before, reviewIndex(dir, state));
  assert.deepEqual(delta, [{ id: "author-plan", change: "source-changed" }]);
}));
