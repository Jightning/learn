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

const inventoryReport = { inventoryExceptions: { sum: { reason: "Narrow fixture scope; two checked alternatives suffice for this demonstration, with limited transfer evidence." } } };

function bankFixture(fn) {
  fixture(({ dir, state, file, put }) => {
    const unit = YAML.load(readFileSync(file, 'utf8')); unit.quiz = ['q-total']; put('sections/01-unit/1-start.yaml', unit);
    put('questions/types.yaml', [{ id: 'sum', task: 'Compute a total.', concept: 'concept-total', objectives: ['obj-total'], families: ['family-total'], teach: ['s1-1'] }]);
    put('questions/bank.yaml', [
      { id: 'q-total', typeId: 'sum', q: 'Sum 1 and 2.', response: { kind: 'number', value: 3 }, why: 'Add both terms.', verified: true },
      { typeId: 'sum', q: 'Sum 3 and 4.', response: { kind: 'number', value: 7 }, why: 'Add both terms.', verified: true, use: 'check', group: 'representation' }
    ]);
    put('questions/assessment.yaml', [{ scope: 'course', criteria: 'Compute independently.' }]);
    fn({ dir, state, file, put });
  });
}

test('bank IDs persist once and reordering never changes identities or review revisions', () => bankFixture(({ dir, state, put }) => {
  const before = reviewIndex(dir, state);
  const path = join(dir, 'questions/bank.yaml'), items = YAML.load(readFileSync(path, 'utf8'));
  assert.match(items[1].id, /^bank-/); assert.equal(items[1].authorId, undefined);
  items.reverse(); put('questions/bank.yaml', items);
  const after = reviewIndex(dir, state);
  assert.deepEqual(changedItems(before, after), []);
  assert.deepEqual(after.entries.filter(e => e.kind === 'bank').map(e => e.id).sort(), before.entries.filter(e => e.kind === 'bank').map(e => e.id).sort());
}));

test('bank grouped review includes siblings, metadata once and inspectable linked teaching', t => bankFixture(({ dir, state }) => {
  const index = reviewIndex(dir, state), packet = fullItems(index, ['q-total']);
  assert.equal(packet.filter(e => e.kind === 'question-type').length, 1);
  assert.equal(packet.filter(e => e.kind === 'bank').length, 2);
  assert.ok(packet.some(e => e.kind === 'block'));
  for (const item of packet.filter(e => e.kind === 'bank')) assert.equal(item.content.objectives, undefined);
  const bytes = Buffer.byteLength(YAML.dump(packet));
  t.diagnostic(`grouped tiny-bank full review: ${bytes} UTF-8 bytes (2 siblings, 1 type, linked teaching)`);
  assert.ok(bytes < 2500, `tiny type packet is ${bytes} bytes`);
  assert.equal(JSON.stringify(packet).includes('rho'), false);
  assert.ok(index.bankCoverage.rows[0].warnings.some(w => w.includes('suspected template duplicate')));
  assert.ok(index.bankCoverage.rows[0].warnings.some(w => w.includes('thin inventory')));
}));

test('clean bank approval must see current mapping and blueprint, and grouping or placement edits invalidate it', () => bankFixture(({ dir, state, file, put }) => {
  const index = reviewIndex(dir, state);
  assert.throws(() => acceptReview(state, index), /current screen/);
  recordReviewView(state, index, index.entries.map(e => e.id)); acceptReview(state, index, inventoryReport);
  assert.equal(readReview(state).status, 'accepted');
  const items = YAML.load(readFileSync(join(dir, 'questions/bank.yaml'), 'utf8'));
  items[1].group = 'boundary'; put('questions/bank.yaml', items);
  const changed = reviewIndex(dir, state), affected = affectedItems(changed, changedItems(index, changed).map(e => e.id), index);
  assert.ok(affected.some(e => e.id === 'type-sum'));
  assert.ok(affected.some(e => e.id === 'assessment-course'));
  assert.ok(affectedItems(changed, ['obj-total']).some(e => e.id === 'assessment-course'), 'objective scoring changes affect derived blueprint review');
  assert.throws(() => acceptReview(state, changed), /needs recheck/);
  recordReviewView(state, changed, affected.map(e => e.id)); acceptReview(state, changed, inventoryReport);
  const unit = YAML.load(readFileSync(file, 'utf8')); unit.quiz = []; put('sections/01-unit/1-start.yaml', unit);
  assert.ok(changedItems(changed, reviewIndex(dir, state)).some(e => e.id === 'placement-s1-1'));
}));

test('missing source families and role/group shortages remain explicit review leads', () => bankFixture(({ dir, state, put }) => {
  put('categorize/families.yaml', [{ id: 'family-total' }, { id: 'family-boundary' }]);
  put('questions/bank.yaml', [{ id: 'q-total', typeId: 'sum', q: 'Sum 1 and 2.', response: { kind: 'number', value: 3 } }]);
  const index = reviewIndex(dir, state), row = index.bankCoverage.rows[0];
  assert.deepEqual(index.bankCoverage.missingFamilies, ['family-boundary']);
  assert.ok(row.warnings.includes('no reserved fresh check'));
  assert.ok(row.warnings.includes('transfer diversity unproven'));
}));

test('external teaching exceptions are private, reasoned, current and never inherited by edited mappings', () => bankFixture(({ dir, state, put }) => {
  const index = reviewIndex(dir, state); recordReviewView(state, index, index.entries.map(e => e.id));
  assert.throws(() => acceptReview(state, index, { exceptions: { sum: { kind: 'external-teaching' } } }), /reason/);
  assert.throws(() => acceptReview(state, index, { exceptions: { missing: { kind: 'external-teaching', reason: 'Elsewhere' } } }), /existing type/);
  acceptReview(state, index, { ...inventoryReport, exceptions: { sum: { kind: 'external-teaching', reason: 'Prior course contains the full worked instruction.' } } });
  assert.equal(readReview(state).exceptions.sum.kind, 'external-teaching');
  assert.equal(JSON.stringify(YAML.load(readFileSync(join(dir, 'questions/types.yaml'), 'utf8'))).includes('external-teaching'), false);
  const types = YAML.load(readFileSync(join(dir, 'questions/types.yaml'), 'utf8')); types[0].task = 'Compute a weighted total.'; put('questions/types.yaml', types);
  const changed = reviewIndex(dir, state); recordReviewView(state, changed, changed.entries.map(e => e.id)); acceptReview(state, changed, inventoryReport);
  assert.equal(readReview(state).exceptions.sum, undefined);
}));

test('derived teaching stays inspectable and missing explicit lesson checks are flagged', () => bankFixture(({ dir, state, put }) => {
  const types = YAML.load(readFileSync(join(dir, 'questions/types.yaml'), 'utf8')); delete types[0].teach; put('questions/types.yaml', types);
  const derived = reviewIndex(dir, state);
  assert.ok(fullItems(derived, ['placement-s1-1']).some(e => e.id === 'q-total'));
  assert.deepEqual(derived.bankCoverage.rows[0].teach, ['s1-1']);
  assert.ok(fullItems(derived, ['q-total']).some(e => e.kind === 'block'));
  types[0].teach = ['s1-2']; put('questions/types.yaml', types);
  const explicit = reviewIndex(dir, state);
  assert.ok(explicit.bankCoverage.rows[0].warnings.includes('missing lesson check at s1-2'));
}));

test('limited inventory needs a concise reviewer reason current for the type and sibling answers', () => bankFixture(({ dir, state, put }) => {
  const initial = reviewIndex(dir, state); recordReviewView(state, initial, initial.entries.map(e => e.id));
  assert.throws(() => acceptReview(state, initial), /limited inventory.*reason/);
  acceptReview(state, initial, inventoryReport);
  assert.ok(readReview(state).inventoryExceptions.sum.reason);
  const items = YAML.load(readFileSync(join(dir, 'questions/bank.yaml'), 'utf8')); items[1].response.value = 8;
  put('questions/bank.yaml', items);
  const changed = reviewIndex(dir, state); recordReviewView(state, changed, changed.entries.map(e => e.id));
  assert.throws(() => acceptReview(state, changed), /current reviewed inventoryExceptions/);
  acceptReview(state, changed, inventoryReport);
  assert.ok(readReview(state).inventoryExceptions.sum.reason);
}));
