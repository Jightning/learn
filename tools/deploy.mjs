#!/usr/bin/env node
/* ============================================================================
 * tools/deploy.mjs — build, publish, prune, and check
 *
 *   node tools/deploy.mjs            # keep the 2 newest deployments
 *   KEEP=1 node tools/deploy.mjs     # keep only the one just published
 *
 * Three things happen after the upload, and each exists because forgetting it
 * fails silently.
 *
 * **Prune.** Cloudflare never expires a deployment. Every one keeps its own
 * permanent `<hash>.<project>.pages.dev` address and goes on serving whatever
 * was in it, forever. Since a course is private by *absence* from the build,
 * an old deployment is a standing copy of everything that was public when it
 * was made. Keeping a couple for rollback is reasonable; keeping all of them
 * means the oldest mistake is the one still online.
 *
 * **Verify.** The production alias is checked for every course deliberately
 * emitted by the build. Private workspace courses are never enumerated here:
 * `tools/build.mjs` gates `dist/courses/` against the closed public allowlist
 * before Wrangler sees it.
 *
 * The production URL never changes. Each deployment gets an immutable hash
 * address, and `<project>.pages.dev` is an alias that always points at the
 * newest one.
 * ==========================================================================*/
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prune } from "./lib/prune.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEEP = Math.max(1, Number(process.env.KEEP) || 2);

const project = (() => {
  const m = /^\s*name\s*=\s*"([^"]+)"/m.exec(readFileSync(join(ROOT, "wrangler.toml"), "utf8"));
  if (!m) throw new Error("wrangler.toml has no project name");
  return m[1];
})();

const run = (args, opts = {}) =>
  execFileSync("npx", ["wrangler", ...args], { cwd: ROOT, encoding: "utf8", ...opts });

/* A failing step has already printed why; a Node stack trace on top of it just
   buries the message. */
const step = (what, fn) => {
  try { return fn(); }
  catch { console.error(`\n${what} failed — see the output above.`); process.exit(1); }
};

/* --------------------------------------------------------------- 1. build --*/
console.log("building…");
step("build", () =>
  execFileSync(process.execPath, [join(ROOT, "tools", "build.mjs")], { cwd: ROOT, stdio: "inherit" }));

/* --------------------------------------------------------------- 2. ship ---*/
console.log("\npublishing…");
step("publish", () =>
  execFileSync("npx", ["wrangler", "pages", "deploy", "dist", "--project-name", project],
    { cwd: ROOT, stdio: "inherit" }));

/* -------------------------------------------------------------- 3. prune ---*/
const list = () => {
  const out = run(["pages", "deployment", "list", "--project-name", project, "--json"]);
  return JSON.parse(out.slice(out.indexOf("[")));
};

let deployments = [];
try { deployments = list(); }
catch (e) { console.error("\ncould not list deployments; nothing pruned:", e.message); }

/* Wrangler writes both its refusals and its confirmations to stdout and exits
   0 either way, so prune() is handed the output to read rather than a status
   to trust. */
const capture = args => {
  try {
    return run(args, { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    return `${e.stdout || ""}${e.stderr || ""}`.trim() || e.message;
  }
};

let unpruned = 0;
const results = prune(project, deployments, KEEP, capture);
if (results.length) {
  console.log(`\npruning ${results.length} old deployment(s), keeping the newest ${KEEP}:`);
  for (const r of results) {
    if (r.ok) console.log(`  deleted ${r.id.slice(0, 8)}  (${r.status})`);
    else console.error(`  ✗ still online ${r.id.slice(0, 8)}: ${r.error}`);
  }
  /* A deployment that survived the prune is still serving whatever was public
     when it was made, so this is a failure and not a warning — reported at the
     end, because the verify below is the more urgent check of the two. */
  const left = results.filter(r => !r.ok);
  if (left.length) {
    console.error(`\n  ${left.length} deployment(s) could not be deleted; they are still online.`);
    unpruned = left.length;
  }
} else if (deployments.length) {
  console.log(`\n${deployments.length} deployment(s); nothing to prune (keeping ${KEEP}).`);
}

/* ------------------------------------------------------------- 4. verify ---*/
const origin = (deployments[0] && deployments[0].Deployment || "")
  .replace(/^https:\/\/[0-9a-f]+\./, "https://");
if (!origin) { console.log("\nno production URL to check."); process.exit(unpruned ? 1 : 0); }

const shipped = existsSync(join(ROOT, "dist", "courses"))
  ? readdirSync(join(ROOT, "dist", "courses")).map(f => f.replace(/\.json$/, ""))
  : [];

console.log(`\nchecking ${origin}`);
console.log(`  public:  ${shipped.join(", ") || "(none)"}`);

/* Verify what the build deliberately shipped, without discovering or reading
   private workspace courses. The build has already compared dist/courses/
   against the closed PUBLIC allowlist; deployment verification is therefore
   about proving that each resulting public asset reached the production alias.
   Pages answers a missing file with index.html and HTTP 200, so status alone
   proves nothing — a course is present only if the response is actually JSON. */
const present = async url => {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok && (res.headers.get("content-type") || "").includes("json");
  } catch { return false; }
};

const missing = [];
for (const id of shipped) {
  const url = `${origin}/courses/${id}.json`;
  if (!await present(`${url}?nocache=${Date.now()}`)) missing.push(id);
}

if (missing.length) {
  console.error(`\n  ✗ MISSING FROM PRODUCTION: ${missing.join(", ")}`);
  console.error("    The production alias is not serving the public courses just built.");
}
if (missing.length) process.exit(1);
console.log("  private: not inspected; excluded by the build allowlist ✓");
console.log(`\nlive at ${origin}`);
process.exit(unpruned ? 1 : 0);
