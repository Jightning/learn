/* Stable review identity and deterministic packets. Hashes stay in private
   state; models see original excerpts, IDs and human-readable change kinds. */
import { existsSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname, relative, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";
import * as YAML from "js-yaml";
import { digest } from "./digest.mjs";
import { parseFile } from "./load.mjs";
import { readPlan, fingerprint, packetText, fileHash } from "./author-packets.mjs";

const list = x => x == null ? [] : Array.isArray(x) ? x : [x];
const dataFiles = dir => existsSync(dir) ? readdirSync(dir).filter(f => /\.(yaml|yml|json)$/.test(f)).sort() : [];
const collectionFile = (dir, kind) => ["yaml", "yml", "json"].map(ext => join(dir, "categorize", `${kind}.${ext}`)).find(existsSync);
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, packetText(value));
};
export const readReview = state => existsSync(join(state, "review.yaml")) ? parseFile(join(state, "review.yaml")) : null;
const withoutIdentity = value => {
  const { authorId, ...content } = value;
  return content;
};

/** Only files with missing identities are serialized, once. Existing IDs,
    citation keys and learner-state identities never change with an edit. */
export function reviewIndex(dir, state, { assign = true, persist = true } = {}) {
  const documents = new Map(), entries = [], seen = new Set();
  const doc = file => {
    if (!documents.has(file)) documents.set(file, { data: parseFile(file), dirty: false });
    return documents.get(file);
  };
  const add = (kind, item, file, location, namedId) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${file}: ${kind} must be a mapping`);
    let id = namedId || item.authorId;
    if (!id) {
      if (!assign) throw new Error(`${file}: missing authorId; run author index`);
      id = `${kind}-${randomUUID().slice(0, 12)}`;
      item.authorId = id; doc(file).dirty = true;
    }
    if (typeof id !== "string" || !/^[a-zA-Z0-9][\w.-]*$/.test(id)) throw new Error(`${file}: invalid review ID ${id}`);
    if (seen.has(id)) throw new Error(`duplicate review ID ${id}`);
    seen.add(id);
    const content = withoutIdentity(item);
    entries.push({ id, kind, file: relative(dir, file), ...location, content,
      hash: fingerprint(JSON.stringify(content)) });
  };
  const d = digest(dir);
  for (const sub of d.subs) {
    const unit = doc(sub.file).data || {};
    for (const [key, kind] of [["blocks", "block"], ["quiz", "quiz"]]) {
      if (unit[key] != null && !Array.isArray(unit[key])) throw new Error(`${sub.file}: ${key} must be a sequence`);
      for (const [position, item] of (unit[key] || []).entries())
        add(kind, item, sub.file, { sub: sub.id, section: sub.id.split("-")[0], position: position + 1 });
    }
  }
  for (const folder of ["practice", "drills"]) for (const name of dataFiles(join(dir, folder))) {
    const file = join(dir, folder, name), unit = doc(file).data || {};
    if (unit.items != null && !Array.isArray(unit.items)) throw new Error(`${file}: items must be a sequence`);
    for (const [position, item] of (unit.items || []).entries())
      add("practice", item, file, { concept: unit.concept || basename(name, extname(name)), position: position + 1 });
  }
  const plan = readPlan(dir);
  if (plan.hash) {
    const { objectives, families, concepts, ...schedule } = plan.data;
    add("plan", schedule, plan.path, {}, "author-plan");
  }
  for (const kind of ["objectives", "families", "concepts"]) {
    const canonical = collectionFile(dir, kind);
    const canonicalIds = new Set(canonical ? doc(canonical).data.map(item => item.id) : []);
    const items = plan.data[kind] || [];
    for (const item of items) if (typeof item !== "string") add({ objectives: "objective", families: "family", concepts: "concept" }[kind], item, canonicalIds.has(item.id) ? canonical : plan.path, {}, item.id);
  }
  // Legacy concepts have named identity already; no authorId is necessary.
  {
    const metaFile = join(dir, "course.yaml");
    const meta = existsSync(metaFile) ? doc(metaFile).data : {};
    const concepts = new Map(Object.entries(meta?.concepts || {}).map(([key, item]) => [key, { item, file: metaFile }]));
    for (const name of dataFiles(join(dir, "concepts"))) {
      const file = join(dir, "concepts", name), item = doc(file).data;
      concepts.set(item.key || basename(name, extname(name)), { item, file });
    }
    for (const [id, { item, file }] of concepts) {
      const prior = entries.find(e => e.id === id);
      if (!prior) { add("concept", item, file, {}, id); continue; }
      const normalize = value => { const copy = { ...value }; delete copy.id; delete copy.key; return YAML.dump(copy, { sortKeys: true }); };
      if (prior.kind !== "concept" || normalize(prior.content) !== normalize(item)) throw new Error(`conflicting review ID ${id} in ${file}`);
    }
  }
  // Validate every identity before writing any file.
  for (const [file, document] of documents) if (document.dirty)
    writeFileSync(file, extname(file) === ".json" ? JSON.stringify(document.data, null, 2) + "\n" : packetText(document.data));
  const evidence = {}, catalogPath = join(state, "sources/catalog.yaml");
  if (existsSync(catalogPath)) for (const source of parseFile(catalogPath)?.sources || []) {
    try { evidence[source.id] = fileHash(source.path); } catch { evidence[source.id] = "unavailable"; }
  }
  const index = { version: 1, plan: fingerprint(JSON.stringify(plan.data)), evidence, entries };
  if (persist) save(join(state, "items.yaml"), index);
  return index;
}

export function findItems(index, ids) {
  const byId = new Map(index.entries.map(e => [e.id, e]));
  return [...new Set(ids)].map(id => {
    if (!byId.has(id)) throw new Error(`unknown review ID ${id}`);
    return byId.get(id);
  });
}

const references = entry => {
  const c = entry.content;
  return [...list(c.objectives ?? c.objective), ...list(c.families ?? c.family),
    ...list(c.prerequisites), ...list(c.concept ?? entry.concept), ...list(c.related), ...list(c.confusable_with),
    ...Array.from(JSON.stringify(c).matchAll(/<c\s+k=\\?"([^"\\]+)/g), m => m[1])]
    .map(x => typeof x === "string" ? x : x?.id).filter(Boolean);
};
export function changedItems(before, after) {
  const old = new Map(before.entries.map(e => [e.id, e])), current = new Map(after.entries.map(e => [e.id, e]));
  // Compare surviving order, so inserting one item does not falsely invalidate
  // every following item just because its positional number increased.
  const order = entries => {
    const groups = new Map(), positions = new Map();
    for (const e of entries) if (old.has(e.id) && current.has(e.id)) {
      const key = `${e.sub || e.file}/${e.kind}`;
      const peers = groups.get(key) || [];
      positions.set(e.id, peers.length); peers.push(e.id); groups.set(key, peers);
    }
    return positions;
  };
  const previousOrder = order(before.entries), nextOrder = order(after.entries);
  const changes = after.entries.flatMap(e => !old.has(e.id) ? [{ id: e.id, change: "added" }] :
    e.hash !== old.get(e.id).hash || e.sub !== old.get(e.id).sub || previousOrder.get(e.id) !== nextOrder.get(e.id)
      ? [{ id: e.id, change: "changed" }] : []);
  for (const id of old.keys()) if (!current.has(id)) changes.push({ id, change: "deleted" });
  if (fingerprint(JSON.stringify(before.evidence || {})) !== fingerprint(JSON.stringify(after.evidence || {}))) {
    const id = current.has("author-plan") ? "author-plan" : after.entries[0]?.id;
    if (id && !changes.some(c => c.id === id)) changes.push({ id, change: "source-changed" });
  }
  return changes;
}

/** Include dependency closure and adjacent teaching context, not every lesson
    whenever one byte in its YAML file changes. */
export function affectedItems(index, ids, before = null) {
  const selected = new Set(ids);
  if (selected.has("author-plan")) for (const e of index.entries) selected.add(e.id);
  const universe = [...(before?.entries || []), ...index.entries];
  const byId = new Map(universe.map(e => [e.id, e]));
  let grew;
  do {
    grew = false;
    for (const id of [...selected]) for (const ref of references(byId.get(id) || { content: {} }))
      if (byId.has(ref) && !selected.has(ref)) { selected.add(ref); grew = true; }
    for (const entry of universe) if (!selected.has(entry.id) && references(entry).some(id => selected.has(id))) {
      selected.add(entry.id); grew = true;
    }
  } while (grew);
  for (const id of [...selected]) {
    const e = byId.get(id);
    if (!e) continue;
    for (const ref of references(e)) if (byId.has(ref)) selected.add(ref);
    if (e.sub) for (const other of index.entries)
      if (other.sub === e.sub && other.kind === "block" && Math.abs(other.position - e.position) <= 1) selected.add(other.id);
  }
  return index.entries.filter(e => selected.has(e.id));
}

const publicItem = entry => {
  const content = { ...entry.content };
  if (["objective", "family", "concept"].includes(entry.kind)) delete content.id;
  return { id: entry.id, kind: entry.kind, target: entry.file,
    ...(entry.sub ? { subsection: entry.sub } : {}), content };
};
const excerpt = (value, omitted, path = "", limit = 280, budget = { remaining: 2400 }) => {
  if (budget.remaining <= 0) { omitted.push(path); return null; }
  if (typeof value === "string" && value.length > limit) {
    // Never cut the inside of a formula/tag; report omission explicitly.
    omitted.push(path);
    const cut = value.slice(0, limit).replace(/<m>(?:(?!<\/m>)[\s\S])*$/, "").replace(/<[^>]*$/, "");
    budget.remaining -= cut.length;
    return cut + "…";
  }
  if (Array.isArray(value)) {
    if (value.length > 6) omitted.push(`${path}[6..${value.length - 1}]`);
    return value.slice(0, 6).map((v, i) => excerpt(v, omitted, `${path}[${i}]`, limit, budget));
  }
  if (value && typeof value === "object") {
    const fields = Object.entries(value);
    if (fields.length > 20) omitted.push(`${path} additional fields`);
    return Object.fromEntries(fields.slice(0, 20).map(([k, v]) => {
      budget.remaining -= k.length;
      return [k, excerpt(v, omitted, path ? `${path}.${k}` : k, limit, budget)];
    }));
  }
  if (typeof value === "string") budget.remaining -= value.length;
  return value;
};

export function screenPackets(index, plan, { section, changed = false, review, maxBytes = 24000, contextPath = "review-context.yaml", issuePath = "corrections.yaml", envelope = {} } = {}) {
  if (section && !index.entries.some(e => e.section === section)) throw new Error(`unknown section ${section}`);
  if (changed && !review?.baseline) throw new Error("no saved review baseline; run author issues first");
  const baseline = review?.status === "accepted" ? review.accepted : review?.baseline;
  const delta = changed ? changedItems(baseline, index) : [];
  const pending = changed && review.status !== "accepted";
  const seeds = [...delta.map(d => d.id), ...(review?.results || []).flatMap(r => r.affected || []),
    ...(pending ? review.issues.flatMap(i => i.targets) : [])];
  if (!pending) seeds.splice(0, seeds.length, ...delta.map(d => d.id));
  let entries = changed ? affectedItems(index, seeds, baseline) : index.entries;
  if (section) entries = entries.filter(e => e.section === section || !e.section);
  const bySection = new Map();
  for (const e of entries) {
    const key = e.section || "curriculum";
    if (!bySection.has(key)) bySection.set(key, []);
    const omitted = [], item = publicItem(e);
    item.content = excerpt(item.content, omitted);
    if (omitted.length) item.truncated = omitted;
    const change = delta.find(d => d.id === e.id)?.change;
    if (change) item.change = change;
    if (changed) item.issues = review.issues.filter(i => i.targets.includes(e.id) || review.results?.some(r => r.issue === i.id && r.affected?.includes(e.id))).map(i => i.id);
    bySection.get(key).push(item);
  }
  if (changed) for (const deletion of delta.filter(d => d.change === "deleted")) {
    const old = baseline.entries.find(e => e.id === deletion.id);
    if (section && old.section && old.section !== section) continue;
    const key = old.section || "curriculum", omitted = [], item = publicItem(old);
    item.content = excerpt(item.content, omitted); item.change = "deleted";
    if (omitted.length) item.truncated = omitted;
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(item);
  }
  const packets = [];
  for (const [key, items] of bySection) {
    const outline = index.entries.filter(e => e.section === key && e.kind === "block").slice(0, 20).map(e => ({ id: e.id, subsection: e.sub,
      ...(e.content.term ? { defines: String(e.content.term).slice(0, 100) } : {}) }));
    const header = { ...envelope, phase: "review", section: key, purpose: "Screen original excerpts; expand IDs before source or answer judgments.",
      context: contextPath, outline, ...(changed ? { issueReport: issuePath } : {}) };
    if (Buffer.byteLength(packetText(header)) > maxBytes / 2) delete header.outline;
    if (Buffer.byteLength(packetText(header)) > maxBytes) throw new Error("screen header exceeds byte budget");
    let chunk = [], part = 1;
    for (const item of items) {
      if (Buffer.byteLength(packetText({ ...header, items: [item] })) > maxBytes)
        throw new Error(`screen item ${item.id} exceeds byte budget; request its full ID packet`);
      if (chunk.length && Buffer.byteLength(packetText({ ...header, items: [...chunk, item] })) > maxBytes) {
        packets.push({ ...header, part: part++, items: chunk }); chunk = [];
      }
      chunk.push(item);
    }
    if (chunk.length) packets.push({ ...header, part, items: chunk });
  }
  if (changed && !packets.length) packets.push({ ...envelope, phase: "review", purpose: "Check issue resolution evidence.", issueReport: issuePath, context: contextPath, items: [] });
  return packets;
}

export function reviewContext(index, plan) {
  return { reader: plan.data.reader || {}, lessons: plan.data.lessons || plan.data.subsections || [],
    map: index.entries.map(e => ({ id: e.id, kind: e.kind, ...(e.sub ? { subsection: e.sub } : {}),
      ...(e.kind === "block" ? { order: e.position, tier: e.content.tier || "spine" } : {}),
      ...(e.content.term ? { defines: e.content.term } : {}), references: references(e) })) };
}

export function recordReviewView(state, index, ids) {
  const path = join(state, "review-views.yaml"), views = existsSync(path) ? parseFile(path) : {};
  for (const e of findItems(index, ids)) views[e.id] = { hash: e.hash, sub: e.sub, position: e.position,
    evidence: fingerprint(JSON.stringify(index.evidence || {})) };
  save(path, views);
}

export function fullItems(index, ids) { return findItems(index, ids).map(publicItem); }

export function saveIssues(state, index, report) {
  const findings = report.items || report.findings;
  if (!Array.isArray(findings) || !findings.length) throw new Error("issue report needs nonempty items");
  const seen = new Set();
  const issues = findings.map(f => {
    const targets = list(f.targets || f.target);
    findItems(index, targets);
    if (!targets.length || !f.issue || !f.done) throw new Error("each issue needs targets, issue and done");
    const id = f.id || `issue-${randomUUID().slice(0, 12)}`;
    if (seen.has(id)) throw new Error(`duplicate issue ID ${id}`);
    seen.add(id);
    return { id, targets, issue: f.issue, done: f.done, ...(f.sourceRefs ? { sourceRefs: f.sourceRefs } : {}) };
  });
  const screenPath = join(state, "screen-baseline.yaml");
  if (existsSync(screenPath)) {
    const screened = parseFile(screenPath);
    for (const target of issues.flatMap(i => i.targets)) {
      const old = screened.entries.find(e => e.id === target), now = index.entries.find(e => e.id === target);
      if (!old || old.hash !== now.hash) throw new Error(`stale issue target ${target}; screen or expand its current revision first`);
    }
  }
  const old = readReview(state);
  if (old && old.status !== "accepted") throw new Error("finish the saved review before replacing its issue baseline");
  const review = { status: "issues", baseline: index, issues };
  save(join(state, "review.yaml"), review);
  save(join(state, "corrections.yaml"), { items: issues });
  return review;
}

export function saveCorrections(state, index, report) {
  const review = readReview(state);
  if (!review || review.status !== "issues") throw new Error("no pending consolidated issues");
  const results = report.results;
  if (!Array.isArray(results)) throw new Error("correction report needs results");
  const seen = new Set();
  for (const r of results) {
    if (!review.issues.some(i => i.id === r.issue) || seen.has(r.issue)) throw new Error(`unknown or duplicate issue ${r.issue}`);
    seen.add(r.issue);
    if (!["fixed", "already-satisfied"].includes(r.disposition) || !Array.isArray(r.affected) || !r.affected.length)
      throw new Error(`${r.issue}: needs disposition fixed|already-satisfied and nonempty affected IDs`);
    findItems(index, r.affected);
  }
  if (seen.size !== review.issues.length) throw new Error("every issue needs a correction result");
  review.status = "recheck";
  review.results = results;
  review.changes = changedItems(review.baseline, index);
  // Preserve the immutable baseline even when done/index was run meanwhile.
  save(join(state, "review.yaml"), review);
  save(join(state, "change-report.yaml"), { changes: review.changes.map(change => ({ ...change,
    issues: review.issues.filter(i => i.targets.includes(change.id) || results.some(r => r.issue === i.id && r.affected.includes(change.id))).map(i => i.id) })), results });
  rmSync(join(state, "review-views.yaml"), { force: true });
  return review;
}

export function acceptReview(state, index) {
  const review = readReview(state);
  if (!review) return;
  if (!["recheck", "accepted"].includes(review.status)) throw new Error("record correction results, then re-review affected evidence before acceptance");
  const base = review.status === "accepted" ? review.accepted : review.baseline;
  const changes = changedItems(base, index);
  const seeds = [...changes.map(d => d.id), ...(review.status === "recheck" ? [...review.issues.flatMap(i => i.targets), ...review.results.flatMap(r => r.affected)] : [])];
  const viewsPath = join(state, "review-views.yaml"), views = existsSync(viewsPath) ? parseFile(viewsPath) : {};
  for (const change of changes.filter(c => c.change === "deleted")) {
    const old = base.entries.find(e => e.id === change.id);
    if (views[change.id]?.hash !== old.hash) throw new Error(`deleted review ID ${change.id} needs a changed-content screen before acceptance`);
  }
  for (const e of affectedItems(index, seeds, base)) {
    const view = views[e.id];
    if (!view || view.hash !== e.hash || view.sub !== e.sub || view.position !== e.position || view.evidence !== fingerprint(JSON.stringify(index.evidence || {})))
      throw new Error(`review ID ${e.id} changed or needs recheck; run screen --changed or packet --ids before acceptance`);
  }
  review.status = "accepted"; review.accepted = index;
  save(join(state, "review.yaml"), review);
}
