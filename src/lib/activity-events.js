import { validateAdapterRequest, validateAdapterResult } from "./activity-adapters.js";
import { responseKey, MAX_RESPONSE_BYTES } from "./response-scoring.js";

// Whole records fit the existing 16 KiB response bound and encrypted sync limit.
export const ACTIVITY_EVENT_LIMITS = Object.freeze({ bytes: MAX_RESPONSE_BYTES, batch: 1000, notes: 2048 });
const mapping = x => x !== null && typeof x === "object" && !Array.isArray(x);
const id = x => typeof x === "string" && !!x.trim() && x.length <= 512;
const stamp = x => Number.isSafeInteger(x) && x >= 0;
const bytes = x => new TextEncoder().encode(JSON.stringify(x)).length;
function jsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return Array.from(value).every(jsonValue);
  return mapping(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)) && Object.values(value).every(jsonValue);
}
const signatures = ["contentSignature", "evidenceSignature", "rubricSignature"];
const common = ["schemaVersion", "event", "id", "course", "ts", "sessionId", "trust"];
const fields = {
  "activity-submission": ["request", "compatibility", "assistance", "timing", "environment"],
  "activity-evaluation": ["submissionId", "result", "supersedes", "reason"],
  "activity-context-revision": ["submissionId", "assistance", "timing", "reason"],
  "activity-feedback": ["evaluationId"],
  "activity-claim": ["root", "semanticVersion", "status", "sources", "uncertainty", "provenance", "supersedes", "reason"]
};

/** Hash committed text plus external artifact descriptors, never fetched bytes.
 * Canonical key order makes browser/CLI hashes agree. Artifact SHA-256 remains a
 * claim until an external checker verifies bytes; hashing is not authentication. */
export async function activityInputHash(input) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(responseKey(input)));
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
}

/** Compact compatibility identities bind the S03 semantic signatures without
 * embedding potentially large canonical payloads into every learner event. */
export async function activityEventCompatibility(C, activityId) {
  const activity = C.activityIndex?.activities[activityId];
  if (!activity) throw new Error("Resolved activity signatures required");
  const result = {};
  for (const key of signatures) {
    if (typeof activity[key] !== "string" || !activity[key]) throw new Error("Resolved activity signatures required");
    result[key] = await activityInputHash(activity[key]);
  }
  result.policies = Object.fromEntries([...new Set(activity.tests.map(t => C.mastery.roots[t.root].policy))]
    .sort().map(key => [key, C.mastery.policies[key].version]));
  return result;
}

function frozen(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
}
function validator(errors) {
  const fail = message => errors.push(`activity events: ${message}`);
  const shape = (value, keys) => {
    if (!mapping(value)) { fail("must be a mapping"); return false; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`unknown key ${key}`);
    return true;
  };
  const note = value => typeof value === "string" && !!value.trim() && value.length <= ACTIVITY_EVENT_LIMITS.notes;
  const assistance = value => {
    if (!shape(value, ["sources", "answerExposed", "notes"])) return;
    const allowed = ["hint", "reference", "collaboration", "instructor", "ai", "solution"];
    if (!Array.isArray(value.sources) || value.sources.length > allowed.length || value.sources.some(x => !allowed.includes(x)) || new Set(value.sources).size !== value.sources.length ||
      typeof value.answerExposed !== "boolean" || value.notes !== undefined && !note(value.notes)) fail("invalid actual assistance");
    if (Array.isArray(value.sources) && value.sources.includes("solution") && value.answerExposed !== true) fail("solution assistance requires answer exposure");
  };
  const timing = value => {
    if (!shape(value, ["activeMs", "setupMs", "wallMs", "source", "interrupted"])) return;
    // Null explicitly means unknown, never zero. Reported time is not measured time.
    for (const key of ["activeMs", "setupMs", "wallMs"]) if (value[key] !== null && !stamp(value[key])) fail(`invalid timing ${key}`);
    if (!["measured", "external-report"].includes(value.source) || typeof value.interrupted !== "boolean") fail("invalid timing provenance");
    if (value.wallMs !== null && value.activeMs !== null && value.setupMs !== null && value.activeMs + value.setupMs > value.wallMs) fail("active/setup time exceeds wall time");
  };
  return { fail, shape, note, assistance, timing };
}

/** Validate a bounded import/append set, including its referenced history.
 * Nothing is stored or projected. Order is deterministic, not import order;
 * identical IDs deduplicate, conflicting IDs/attempt reuse fail the whole set.
 * C must be the resolved definition snapshot applicable to these records.
 * Later persistence must retain historical snapshots for incompatible versions. */
export async function validateActivityEvents(rows, C, errors = []) {
  const start = errors.length, { fail, shape, note, assistance, timing } = validator(errors);
  if (!C?.mastery || !C.activityIndex || !id(C.code)) throw new Error("Resolved mastery course required");
  if (!Array.isArray(rows) || rows.length > ACTIVITY_EVENT_LIMITS.batch) { fail("bounded event list required"); return null; }
  const unique = new Map();
  for (const raw of rows) {
    // Reject non-JSON values before clone/hash; callers may supply live JS objects.
    let value;
    try {
      const json = JSON.stringify(raw);
      if (json === undefined || !jsonValue(raw) || bytes(raw) > ACTIVITY_EVENT_LIMITS.bytes) throw new Error();
      value = JSON.parse(json);
      if (responseKey(raw) !== responseKey(value)) throw new Error();
    } catch { fail("record must be bounded JSON"); continue; }
    if (!shape(value, [...common, ...(Object.hasOwn(fields, value?.event) ? fields[value.event] : [])])) continue;
    if (value.schemaVersion !== 1 || !Object.hasOwn(fields, value.event) || !id(value.id) || !id(value.sessionId) || value.course !== C.code || !stamp(value.ts)) fail("invalid event identity/version/time");
    if (value.trust !== undefined && value.trust !== "untrusted") fail("import cannot assert trusted provenance");
    value.trust = "untrusted";
    if (value.event === "activity-evaluation" && value.result?.trust === "untrusted") delete value.result.trust;
    if (unique.has(value.id) && responseKey(unique.get(value.id)) !== responseKey(value)) fail("conflicting duplicate event ID");
    else unique.set(value.id, value);
  }
  if (errors.length !== start) return null;
  const ordered = [...unique.values()].sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const prior = new Map(), attempts = new Set(), nonces = new Set();
  const reference = (key, kind, row) => {
    const target = prior.get(row[key]);
    if (!target || target.event !== kind) { fail(`missing or later ${key}`); return null; }
    return target;
  };
  for (const row of ordered) {
    if (row.event === "activity-submission") {
      const activity = Object.hasOwn(C.activityIndex.activities, row.request?.activityId) && C.activityIndex.activities[row.request.activityId];
      if (!activity) { fail("unknown activity"); continue; }
      if (!validateAdapterRequest(row.request, activity, errors)) continue;
      if (row.request.courseId !== row.course) fail("submission course mismatch");
      if (row.request.submissionHash !== await activityInputHash(row.request.input)) fail("committed input hash mismatch");
      if (responseKey(row.compatibility) !== responseKey(await activityEventCompatibility(C, activity.id))) fail("compatibility/policy identity mismatch");
      if (attempts.has(row.request.attemptId) || nonces.has(row.request.nonce)) fail("duplicate committed attempt/nonce; use a new attempt for changed work");
      attempts.add(row.request.attemptId); nonces.add(row.request.nonce);
      assistance(row.assistance); timing(row.timing);
      if (shape(row.environment, ["description", "fixture", "seed"])) {
        if (!note(row.environment.description)) fail("environment description required");
        for (const key of ["fixture", "seed"]) if (row.environment[key] !== undefined && !id(row.environment[key])) fail(`invalid environment ${key}`);
      }
    } else if (row.event === "activity-evaluation") {
      const submission = reference("submissionId", "activity-submission", row);
      if (!submission) continue;
      const result = structuredClone(row.result);
      if (result?.trust === "untrusted") delete result.trust;
      row.result = validateAdapterResult(result, submission.request, C.activityIndex.activities[submission.request.activityId], errors);
      if (row.result && (row.result.provenance.issuedAt < submission.ts || row.result.provenance.issuedAt > row.ts)) fail("evaluation issuance must follow commitment and precede recording");
      if (row.supersedes !== undefined) {
        const original = reference("supersedes", "activity-evaluation", row);
        if (original && original.submissionId !== row.submissionId) fail("revision must retain original submission");
        if (!note(row.reason)) fail("evaluation correction reason required");
      } else if (row.reason !== undefined) fail("correction reason requires supersedes");
    } else if (row.event === "activity-context-revision") {
      reference("submissionId", "activity-submission", row);
      assistance(row.assistance); timing(row.timing);
      if (!note(row.reason)) fail("context correction reason required");
    } else if (row.event === "activity-feedback") {
      reference("evaluationId", "activity-evaluation", row);
    } else if (row.event === "activity-claim") {
      const root = Object.hasOwn(C.mastery.roots, row.root) && C.mastery.roots[row.root];
      if (!root || row.semanticVersion !== root.semanticVersion || root.claimRequirement !== "historical-evidence") fail("claim requires matching historical requirement/root version");
      if (!["unsubstantiated", "submitted", "disputed", "withdrawn"].includes(row.status) || !note(row.uncertainty)) fail("invalid claim status/uncertainty");
      if (!Array.isArray(row.sources) || row.sources.length > 8 || new Set(row.sources).size !== row.sources.length || row.sources.some(x => {
        try { const url = new URL(x); return !id(x) || url.protocol !== "https:" || !!url.username || !!url.password; } catch { return true; }
      }) || row.status === "submitted" && !row.sources.length) fail("bounded claim source references required");
      if (shape(row.provenance, ["kind", "reviewerId", "issuedAt"])) {
        if (!["self-report", "reviewer-claim"].includes(row.provenance.kind) || !id(row.provenance.reviewerId) || !stamp(row.provenance.issuedAt) || row.provenance.issuedAt > row.ts) fail("invalid claim provenance");
      }
      if (row.supersedes !== undefined) {
        const original = reference("supersedes", "activity-claim", row);
        if (original && original.root !== row.root) fail("claim revision must retain root");
        if (!note(row.reason)) fail("claim correction reason required");
      } else if (row.reason !== undefined) fail("claim correction reason requires supersedes");
    }
    prior.set(row.id, row);
  }
  if (ordered.some(row => bytes(row) > ACTIVITY_EVENT_LIMITS.bytes)) fail("normalized record exceeds byte bound");
  return errors.length === start ? frozen(ordered) : null;
}

/** Validate large local histories in dependency-complete bounded calls. A single
 * response/review chain above the batch limit fails visibly, never truncates.
 * Cross-batch identities remain global; splitting cannot permit attempt reuse. */
export async function validateActivityHistory(rows, C, errors = []) {
  if (!Array.isArray(rows)) { errors.push('activity history: event list required'); return null; }
  if (rows.length <= ACTIVITY_EVENT_LIMITS.batch) return validateActivityEvents(rows, C, errors);
  const unique = new Map(), components = new Map(), owners = new Map(), attempts = new Set(), nonces = new Set();
  for (const row of rows) {
    if (!row || typeof row.id !== 'string') { errors.push('activity history: invalid identity'); return null; }
    const prior = unique.get(row.id);
    if (prior && responseKey(prior) !== responseKey(row)) { errors.push('activity history: conflicting duplicate event ID'); return null; }
    unique.set(row.id, row);
  }
  const ordered = [...unique.values()].sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const row of ordered) {
    const ref = row.submissionId ?? row.evaluationId ?? row.supersedes;
    const owner = row.event === 'activity-claim' ? JSON.stringify(['claim', row.root]) : ref ? owners.get(ref) : JSON.stringify(['submission', row.id]);
    if (!owner) { errors.push('activity history: missing or later dependency'); return null; }
    owners.set(row.id, owner);
    if (row.event === 'activity-submission') {
      if (attempts.has(row.request?.attemptId) || nonces.has(row.request?.nonce)) {
        errors.push('activity history: duplicate committed attempt/nonce'); return null;
      }
      attempts.add(row.request?.attemptId); nonces.add(row.request?.nonce);
    }
    if (!components.has(owner)) components.set(owner, []);
    components.get(owner).push(row);
  }
  const validated = [];
  let batch = [];
  const flush = async () => {
    const result = await validateActivityEvents(batch, C, errors);
    if (!result) return false;
    validated.push(...result); batch = []; return true;
  };
  for (const component of components.values()) {
    if (component.length > ACTIVITY_EVENT_LIMITS.batch) {
      errors.push('activity history: dependency chain exceeds bounded validation limit'); return null;
    }
    if (batch.length + component.length > ACTIVITY_EVENT_LIMITS.batch && !await flush()) return null;
    batch.push(...component);
  }
  if (!await flush()) return null;
  return frozen(validated.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
}
