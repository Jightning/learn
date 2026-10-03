/* Infer work from artifacts; review records are agent declarations, not proofs. */
import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import * as YAML from "js-yaml";
import { fileHash, planSignature, indexPlan } from "./author-packets.mjs";

export function loadWorkflow(context) {
  const path = realpathSync(resolve(context.root, context.manifest.workflow));
  if (!path.startsWith(context.root + sep)) throw new Error("workflow path escapes authoring context");
  const flow = YAML.load(readFileSync(path, "utf8"));
  for (const stage of ["plan", "migrate", "setup", "write", "review", "correct", "finish", "complete"])
    if (!flow?.stages?.[stage]?.phase || !flow.stages[stage].paired_role || !flow.stages[stage].action)
      throw new Error(`workflow needs stage ${stage}`);
  return flow;
}

/* Plans may choose any batch size. The default groups adjacent lessons within
   sections; its target is scheduling guidance, never a curriculum ceiling. */
export function courseBatches(subs, plan, workflow) {
  const remaining = new Map(subs.map(s => [s.id, s]));
  const batches = [], warnings = [];
  for (const [i, spec] of (plan.data.batches || []).entries()) {
    const members = [];
    for (const id of spec.subsections || []) {
      if (remaining.has(id)) { members.push(remaining.get(id)); remaining.delete(id); }
      else warnings.push(`batch ${spec.id || i + 1}: unknown or duplicate subsection ${id}; ignored`);
    }
    if (members.length) batches.push({ id: spec.id || `planned-${i + 1}`, members });
  }
  const target = workflow.batching?.target_size ?? 4;
  if (!Number.isInteger(target) || target < 1) throw new Error("batching.target_size needs a positive integer");
  const sections = new Map();
  for (const sub of remaining.values()) {
    const section = sub.id.split("-")[0];
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section).push(sub);
  }
  for (const [section, members] of sections) {
    const count = Math.ceil(members.length / target);
    const size = Math.ceil(members.length / count);
    for (let i = 0; i < members.length; i += size)
      batches.push({ id: `${section}-${Math.floor(i / size) + 1}`, members: members.slice(i, i + size) });
  }
  // Explicit assignments cannot reorder prerequisite-bearing sections silently.
  const starts = new Map(batches.map(batch => [batch.members[0].id, batch]));
  return { batches: subs.flatMap(sub => starts.has(sub.id) ? [starts.get(sub.id)] : []), warnings };
}

export function flowState({ mode, handoff = "auto", progress, plan, records = {}, workflow }) {
  let stage, subsection, batch;
  const planIndex = indexPlan(plan);
  const done = new Set(progress.done.map(s => s.id));
  const states = new Map();
  const state = sub => {
    if (states.has(sub.id)) return states.get(sub.id);
    const value = compute(sub); states.set(sub.id, value); return value;
  };
  const compute = sub => {
    const record = records[sub.id];
    const samePlan = record?.plan === planSignature(plan, sub.id, planIndex);
    const fresh = samePlan && record?.hash === fileHash(sub.file);
    if (samePlan && record.status === "correct") return "correct";
    if (!done.has(sub.id)) return "write";
    if (fresh && record.status === "reviewed") return "complete";
    return fresh && record.status === "recheck" ? "recheck" : "review";
  };
  const grouping = mode === "paired" && handoff === "manual"
    ? { batches: [{ id: "course", members: progress.d.subs }], warnings: [] }
    : mode === "paired" ? courseBatches(progress.d.subs, plan, workflow)
    : { batches: progress.d.subs.map(s => ({ id: s.id, members: [s] })), warnings: [] };
  if (!plan.hash) stage = plan.legacy?.length ? "migrate" : "plan";
  else if (!progress.courseDone || !progress.d.subs.length) stage = "setup";
  else {
    for (const candidate of grouping.batches) {
      // Collect initial reviews before corrections; finish all corrections
      // before rechecking the first. Earlier batches always precede new work.
      const next = ["write", "review", "correct", "recheck"].find(kind => candidate.members.some(s => state(s) === kind));
      if (!next) continue;
      const tasks = candidate.members.filter(s => state(s) === next);
      stage = next === "recheck" ? "review" : next;
      subsection = tasks[0];
      batch = { id: candidate.id, members: candidate.members.map(s => s.id),
        tasks: tasks.map(s => s.id), ...(next === "recheck" ? { recheck: true } : {}) };
      break;
    }
    stage ||= progress.finished ? "complete" : "finish";
  }
  const definition = workflow.stages[stage];
  return { mode, handoff, stage, phase: definition.phase,
    role: mode === "single" ? "single" : definition.paired_role,
    ...(batch ? { batch } : {}),
    ...(grouping.warnings.length ? { warnings: grouping.warnings } : {}),
    ...(subsection ? { subsection: subsection.id, target: subsection.file } : {}),
    ...(stage === "correct" && records[subsection.id]?.corrections ? { corrections: records[subsection.id].corrections } : {}),
    action: definition.action };
}
