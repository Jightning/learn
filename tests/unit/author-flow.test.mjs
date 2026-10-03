import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { courseBatches, flowState, loadWorkflow } from "../../tools/lib/author-flow.mjs";
import { fileHash, planSignature } from "../../tools/lib/author-packets.mjs";
import { loadContext } from "../../tools/lib/author-context.mjs";
const workflow = loadWorkflow(loadContext(new URL("../../authoring", import.meta.url).pathname));

function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), "batch-flow-"));
  const subs = ["s1-1", "s1-2", "s1-3", "s2-1"].map(id => {
    const file = join(dir, `${id}.yaml`); writeFileSync(file, "title: Probe\n"); return { id, file };
  });
  const plan = { hash: "plan", data: { lessons: subs.map(s => ({ id: s.id })) } };
  const progress = { d: { subs }, done: [], courseDone: true, finished: false };
  const records = {};
  const set = (id, status) => { const sub = subs.find(s => s.id === id); records[id] = { status, hash: fileHash(sub.file), plan: planSignature(plan,id) }; };
  const flow = (mode = "paired") => flowState({ mode, progress, plan, records, workflow });
  try { fn({ subs, plan, progress, records, set, flow }); } finally { rmSync(dir, { recursive:true, force:true }); }
}

test("paired collects writing, initial reviews, corrections, then rechecks without skipping any member", () => fixture(({ subs, progress, records, set, flow }) => {
  assert.deepEqual(flow().batch.tasks, ["s1-1", "s1-2", "s1-3"]);
  progress.done.push(subs[0]); assert.equal(flow().stage, "write"); assert.equal(flow().subsection, "s1-2");
  assert.equal(flow("single").stage, "review");
  progress.done.push(subs[1],subs[2]); assert.equal(flow().stage, "review");
  set("s1-1", "correct"); assert.equal(flow().subsection, "s1-2");
  set("s1-2", "correct"); set("s1-3", "reviewed");
  assert.equal(flow().stage, "correct"); assert.deepEqual(flow().batch.tasks,["s1-1","s1-2"]);
  set("s1-1", "recheck"); assert.equal(flow().stage,"correct"); assert.equal(flow().subsection,"s1-2");
  set("s1-2", "recheck"); assert.equal(flow().stage,"review"); assert.equal(flow().batch.recheck,true);
  set("s1-1","reviewed"); set("s1-2","reviewed"); assert.equal(flow().subsection,"s2-1");
  writeFileSync(subs[0].file,"title: Changed\n"); assert.equal(flow().stage,"review");
  delete records["s1-1"]; progress.done.shift(); assert.equal(flow().stage,"write");
}));

test("explicit batches allow larger groups and warnings cannot omit unassigned lessons", () => fixture(({ subs, plan }) => {
  plan.data.batches = [{ id: "whole", subsections: [...subs.map(s=>s.id),"missing","s1-1"] }];
  const grouping=courseBatches(subs,plan,{batching:{target_size:1}});
  assert.equal(grouping.batches.length,1); assert.equal(grouping.batches[0].members.length,4);
  assert.equal(grouping.warnings.length,2);
  plan.data.batches=[{id:"partial",subsections:["s1-1"]}];
  assert.deepEqual(courseBatches(subs,plan,workflow).batches.flatMap(b=>b.members).map(s=>s.id),subs.map(s=>s.id));
}));

test("legacy planning routes to cheap migration while a new course still plans", () => fixture(({ plan,flow }) => {
  delete plan.hash; assert.equal(flow().stage,"plan");
  plan.legacy=["materials/plan.md"]; assert.equal(flow().stage,"migrate"); assert.equal(flow().role,"writer");
  assert.equal(flow("single").role,"single");
}));


test("manual paired completes all course writing before review, then all corrections", () => fixture(({ subs, progress, plan, records, set }) => {
  const flow = () => flowState({ mode: "paired", handoff: "manual", progress, plan, records, workflow });
  assert.deepEqual(flow().batch.tasks, subs.map(s => s.id));
  progress.done.push(subs[0], subs[1], subs[2]);
  assert.equal(flow().stage, "write"); assert.equal(flow().subsection, "s2-1");
  progress.done.push(subs[3]); assert.equal(flow().stage, "review");
  set("s1-1", "correct");
  assert.equal(flow().stage, "review"); assert.equal(flow().subsection, "s1-2");
  for (const s of subs.slice(1)) set(s.id, "reviewed");
  assert.equal(flow().stage, "correct");
  set("s1-1", "reviewed"); assert.equal(flow().stage, "finish");
}));
