/* Learner-study bookkeeping is separate from learner questions and readiness.
 * A synthetic replay can test mechanics; it cannot authorize promotion. */
import { createHash } from "node:crypto";

const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const finite = (value, label, minimum = 0) => {
  if (!Number.isFinite(value) || value < minimum) throw new Error(`${label} must be finite and >= ${minimum}`);
};
const arms = ["baseline", "adaptive"];

export function registerStudy(config, participants) {
  if (!config?.seed || !config?.criteria || !config?.analysis) throw new Error("seed, criteria and predeclared analysis are required");
  for (const name of ["timeImprovement", "actionImprovement", "falseReadiness", "essentialGaps", "dropout", "transfer", "retention"])
    finite(config.margins?.[name], `margins.${name}`);
  if (!Array.isArray(participants) || participants.length < 4) throw new Error("at least four participants are required");
  const seen = new Set(), strata = new Map();
  for (const p of participants) {
    if (!p?.id || seen.has(p.id) || !p.course || !p.priorKnowledge) throw new Error("unique participant IDs, course and priorKnowledge are required");
    seen.add(p.id);
    const key = JSON.stringify([p.course, p.priorKnowledge]);
    if (!strata.has(key)) strata.set(key, []);
    strata.get(key).push(p);
  }
  const assignments = [];
  for (const [stratum, people] of strata) {
    if (people.length < 2) throw new Error(`stratum ${stratum} needs both comparison arms`);
    people.sort((a, b) => digest([config.seed, a.id]).localeCompare(digest([config.seed, b.id])));
    const offset = parseInt(digest([config.seed, stratum]).slice(0, 8), 16) % 2;
    people.forEach((p, i) => assignments.push({ ...p, arm: arms[(i + offset) % 2] }));
  }
  const protocol = { version: 1, config, assignments: assignments.sort((a, b) => a.id.localeCompare(b.id)) };
  return { ...protocol, signature: digest(protocol) };
}

export function evaluateStudy(protocol, observations) {
  const { signature, ...registered } = protocol;
  if (digest(registered) !== signature) throw new Error("registered protocol was changed");
  if (!Array.isArray(observations)) throw new Error("observations must be a list");
  const ids = new Set(), assigned = new Map(protocol.assignments.map(p => [p.id, p]));
  const groups = Object.fromEntries(arms.map(arm => [arm, []]));
  let complete = true;
  for (const row of observations) {
    if (!assigned.has(row.id) || ids.has(row.id)) throw new Error("unknown or duplicate participant observation");
    ids.add(row.id);
    if (typeof row.completed !== "boolean" || typeof row.ready !== "boolean") throw new Error("completed and ready must be booleans");
    for (const key of ["rawActiveSeconds", "usableActiveSeconds", "actions", "repairActions"]) finite(row[key], key);
    if (row.usableActiveSeconds > row.rawActiveSeconds) throw new Error("usable time exceeds raw time");
    if (row.ready && (!row.completed || !Number.isFinite(row.standardScore) || !Array.isArray(row.essentialScores) || !row.essentialScores.length))
      throw new Error("ready observations need completed held-out standard and essential-outcome scores");
    for (const score of [row.standardScore, ...(row.essentialScores || []), row.transfer, row.retention].filter(x => x != null)) {
      finite(score, "score");
      if (score > 1) throw new Error("scores must be fractions");
    }
    if (row.completed && (row.transfer == null || row.retention == null || !(row.delayDays >= 7 && row.delayDays <= 28))) complete = false;
    groups[assigned.get(row.id).arm].push(row);
  }
  if (ids.size !== assigned.size) complete = false;
  const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const report = {};
  for (const arm of arms) {
    const rows = groups[arm], n = protocol.assignments.filter(p => p.arm === arm).length;
    const finished = rows.filter(r => r.completed);
    const ready = rows.filter(r => r.ready);
    report[arm] = {
      assigned: n, recorded: rows.length, completed: finished.length,
      dropout: (n - finished.length) / n,
      rawActiveSeconds: mean(rows.map(r => r.rawActiveSeconds)),
      usableActiveSeconds: mean(rows.map(r => r.usableActiveSeconds)),
      rawActiveSecondsPerAssigned: rows.reduce((n, r) => n + r.rawActiveSeconds, 0) / n,
      usableActiveSecondsPerAssigned: rows.reduce((n, r) => n + r.usableActiveSeconds, 0) / n,
      completedRawActiveSeconds: mean(finished.map(r => r.rawActiveSeconds)),
      completedUsableActiveSeconds: mean(finished.map(r => r.usableActiveSeconds)),
      actions: mean(rows.map(r => r.actions)), completedActions: mean(finished.map(r => r.actions)),
      repairActions: mean(rows.map(r => r.repairActions)),
      falseReadiness: ready.length ? ready.filter(r => r.standardScore < .90 || r.essentialScores.some(s => s < .80)).length / ready.length : null,
      essentialGaps: finished.length ? finished.filter(r => !r.essentialScores?.length || r.essentialScores.some(s => s < .80)).length / finished.length : null,
      transfer: mean(finished.map(r => r.transfer).filter(x => x != null)),
      retention: mean(finished.map(r => r.retention).filter(x => x != null))
    };
  }
  /* Point estimates describe this dataset only. A reviewer must execute the
   * registered uncertainty/stratification analysis before judging promotion. */
  return { signature, complete, arms: report, promotion: "pending-review",
    missing: protocol.assignments.filter(p => !ids.has(p.id)).map(p => p.id),
    analysis: protocol.config.analysis, margins: protocol.config.margins };
}
