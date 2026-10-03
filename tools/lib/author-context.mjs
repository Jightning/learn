/* Whole-file instruction selection. The manifest owns policy; this module only
   resolves references and reports malformed or unknown selections. */
import { readFileSync, existsSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import * as YAML from "js-yaml";

export const estimateTokens = text => Math.ceil(Buffer.byteLength(text, "utf8") / 4);

export function loadContext(root) {
  const base = realpathSync(root);
  const manifest = YAML.load(readFileSync(join(base, "manifest.yaml"), "utf8"));
  if (!manifest?.modules || !manifest?.phases) throw new Error("context manifest needs modules and phases");
  const modules = Object.entries(manifest.modules).map(([id, value]) => {
    const spec = typeof value === "string" ? { file: value } : value;
    const path = resolve(base, spec.file);
    if (!path.startsWith(base + sep) || !existsSync(path) || !realpathSync(path).startsWith(base + sep))
      throw new Error(`invalid context module ${id}: ${spec.file}`);
    return { ...spec, id, path, text: readFileSync(path, "utf8") };
  });
  const byId = new Map(modules.map(m => [m.id, m]));
  for (const module of modules) for (const id of module.requires || [])
    if (!byId.has(id)) throw new Error(`context ${module.id} requires missing module ${id}`);
  for (const [phase, ids] of Object.entries(manifest.phases)) for (const id of ids)
    if (!byId.has(id)) throw new Error(`phase ${phase} names missing module ${id}`);
  const version = createHash("sha256").update(JSON.stringify(manifest));
  for (const m of modules) version.update(m.id).update(m.text);
  return { root: base, manifest, modules, byId, version: version.digest("hex").slice(0, 12) };
}

export function selectContext(context, { phase = "write", role = "single", needs = [], full = false } = {}) {
  const warnings = [];
  if (!context.manifest.phases[phase]) throw new Error(`unknown phase ${phase}`);
  const ids = new Set();
  const eligible = m => !m.roles?.length || m.roles.includes(role);
  const add = (id, trail = []) => {
    if (ids.has(id)) return;
    if (trail.includes(id)) throw new Error(`cyclic context dependency: ${[...trail, id].join(" -> ")}`);
    const module = context.byId.get(id);
    for (const other of module.requires || []) add(other, [...trail, id]);
    ids.add(id);
  };
  for (const id of context.manifest.phases[phase]) if (eligible(context.byId.get(id))) add(id);
  for (const m of context.modules) {
    if (eligible(m) && (full || (m.needs || []).some(n => needs.includes(n)))) add(m.id);
  }
  for (const need of needs)
    if (!context.modules.some(m => m.needs?.includes(need))) warnings.push(`no context module for ${need}; choose a suitable representation`);
  const modules = [...ids].map(id => context.byId.get(id));
  const text = modules.map(m => m.text.trim()).join("\n\n");
  return { modules, text, warnings, estimatedTokens: estimateTokens(text) };
}

export function shapeNeeds(unit = {}) {
  const needs = new Set();
  for (const block of unit.blocks || []) {
    if (block?.t) needs.add(`block:${block.t}`);
    if (block?.t === "figure" && block.kind) needs.add(`figure:${block.kind}`);
  }
  for (const q of unit.quiz || []) {
    if (q?.response?.kind) needs.add(`question:${q.response.kind}`);
    if (q?.type === "Synthesis") needs.add("question:synthesis");
    if (q?.stimulus?.t) needs.add(`stimulus:${q.stimulus.t}`);
    if (q?.stimulus?.kind) needs.add(`figure:${q.stimulus.kind}`);
  }
  return [...needs];
}
