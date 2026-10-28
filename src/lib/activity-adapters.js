import { ADAPTER_LIMITS } from "./activity-schema.js";

const mapping = x => x !== null && typeof x === "object" && !Array.isArray(x);
const id = x => typeof x === "string" && !!x.trim() && x.length <= 512;
const hash = x => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const bindings = ["courseId", "activityId", "attemptId", "nonce", "submissionHash", "contentVersion", "evidenceVersion", "rubricVersion"];
const statuses = ["complete", "execution-error", "unavailable", "incomplete"];
function context(errors) {
  const fail = message => errors.push(`adapter: ${message}`);
  const shape = (value, keys) => {
    if (!mapping(value)) { fail("must be a mapping"); return false; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`unknown key ${key}`);
    return true;
  };
  return { fail, shape };
}

/** A request is committed input, never feedback or a trust assertion. All adapters,
 * including future audio/trusted evaluation, use the same bounded envelope.
 * Artifact bytes stay external. Hash verification/storage belongs to later cards. */
export function validateAdapterRequest(value, activity, errors = []) {
  const start = errors.length, { fail, shape } = context(errors);
  if (!shape(value, ["schemaVersion", "adapter", ...bindings, "input"])) return null;
  if (value.schemaVersion !== 1) fail("unsupported request schemaVersion");
  if (!shape(value.adapter, ["id", "version"]) || value.adapter?.id !== activity.adapter.id || value.adapter?.version !== activity.adapter.version) fail("adapter identity/version mismatch");
  for (const key of bindings.slice(0, 5)) if (!id(value[key])) fail(`missing ${key}`);
  if (value.activityId !== activity.id || !hash(value.submissionHash)) fail("activity identity or submission hash mismatch");
  for (const key of bindings.slice(5)) if (value[key] !== activity[key]) fail(`${key} mismatch`);
  if (shape(value.input, ["text", "artifacts"])) {
    const input = value.input;
    if (input.text !== undefined && (typeof input.text !== "string" || input.text.length > ADAPTER_LIMITS.text)) fail("text exceeds bounded input contract");
    if (input.artifacts !== undefined) {
      if (!Array.isArray(input.artifacts) || input.artifacts.length > ADAPTER_LIMITS.artifacts) fail("too many artifact references");
      else for (const artifact of input.artifacts) {
        if (!shape(artifact, ["id", "url", "sha256", "bytes", "mediaType"])) continue;
        let url;
        try { url = new URL(artifact.url); } catch { /* Invalid reference reported below. */ }
        if (!id(artifact.id) || url?.protocol !== "https:" || url.username || url.password || !hash(artifact.sha256) || !Number.isInteger(artifact.bytes) || artifact.bytes < 0 || artifact.bytes > Math.min(activity.artifact?.maxBytes ?? ADAPTER_LIMITS.artifactBytes, ADAPTER_LIMITS.artifactBytes) || !id(artifact.mediaType)) fail("invalid bounded artifact reference");
        if (activity.artifact && !activity.artifact.mediaTypes.includes(artifact.mediaType)) fail("artifact media type not allowed");
      }
      if (Array.isArray(input.artifacts) && new Set(input.artifacts.map(x => x?.id)).size !== input.artifacts.length) fail("duplicate artifact id");
    }
    if (!(typeof input.text === "string" && input.text.trim()) && !input.artifacts?.length) fail("committed input is required");
    if (["question", "written-defense"].includes(activity.kind) && !(typeof input.text === "string" && input.text.trim())) fail("text input is required for this adapter");
    if (activity.kind === "audio" && !input.artifacts?.length) fail("audio requires an artifact reference; transcript alone is not audio evidence");
  }
  return errors.length === start ? structuredClone(value) : null;
}

/** Valid structure never authenticates provenance. A receipt is opaque pending
 * independently configured verification (S16); every imported result is untrusted. */
export function validateAdapterResult(value, request, activity, errors = []) {
  const start = errors.length, { fail, shape } = context(errors);
  if (!validateAdapterRequest(request, activity, errors)) return null;
  if (!shape(value, ["schemaVersion", "adapter", ...bindings, "status", "criteria", "provenance", "receipt"])) return null;
  if (value.schemaVersion !== 1 || value.adapter?.id !== request.adapter.id || value.adapter?.version !== request.adapter.version) fail("result contract/version mismatch");
  shape(value.adapter, ["id", "version"]);
  for (const key of bindings) if (value[key] !== request[key]) fail(`result ${key} mismatch`);
  if (!statuses.includes(value.status)) fail("invalid execution status");
  if (!Array.isArray(value.criteria) || value.criteria.length > ADAPTER_LIMITS.criteria || (value.status === "complete" && !value.criteria.length)) fail("bounded criterion observations required");
  else {
    const seen = new Set();
    for (const criterion of value.criteria) {
      if (!shape(criterion, ["root", "facet", "skill", "anchor", "criterion", "outcome"])) continue;
      const target = activity.tests.find(t => ["root", "facet", "skill", "anchor"].every(key => t[key] === criterion[key]) && t.criteria.includes(criterion.criterion));
      if (!target || !["pass", "fail", "unobserved"].includes(criterion.outcome)) fail("unknown criterion attribution/outcome");
      const key = JSON.stringify([criterion.root, criterion.facet, criterion.skill, criterion.anchor, criterion.criterion]);
      if (seen.has(key)) fail("duplicate criterion observation");
      seen.add(key);
      if (value.status !== "complete" && criterion.outcome !== "unobserved") fail("infrastructure/incomplete status cannot imply observed capability failure or pass");
    }
  }
  if (shape(value.provenance, ["kind", "reviewerId", "issuedAt"])) {
    if (!["self-report", "public-test", "model-review", "reviewer-claim"].includes(value.provenance.kind) || !id(value.provenance.reviewerId) || !Number.isSafeInteger(value.provenance.issuedAt) || value.provenance.issuedAt < 0) fail("invalid claimed provenance");
  }
  if (value.receipt !== undefined && (typeof value.receipt !== "string" || !value.receipt.length || value.receipt.length > 16384)) fail("receipt must be bounded opaque text");
  return errors.length === start ? { ...structuredClone(value), trust: "untrusted" } : null;
}
