#!/usr/bin/env node
/* Proves the central claim continuously: a new subject needs no code.
 * Scaffolds a throwaway course from courses/_template, validates it, packs it
 * into the same file map the browser imports, then removes the probe. The app
 * build deliberately ignores it: user courses are runtime data, not source.
 */
import { rmSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TITLE = "Cloneability Probe";
const name = "probe" + Date.now().toString(36);
const dir = join(ROOT, "courses", name);
const run = (f, a = []) => execFileSync(process.execPath, [join(ROOT, "tools", f), ...a],
  { cwd: ROOT, encoding: "utf8" });

/* The probe is a whole course sitting in courses/, and the run that plants it
 * spends over ten minutes inside test-ui. If it dies without unwinding, the
 * scaffold is stranded — and a stranded probe is not inert, it silently joins
 * the next build as a ninth subject. One was found in the tree this way.
 *
 * Cleaning up on the way out cannot cover it. Ctrl-C at a terminal signals the
 * whole process group, so the child dies, execFileSync throws, and the finally
 * below already handles that. Anything that signals only this process is the
 * case that strands, and a handler cannot help there either: execFileSync
 * blocks the event loop, so a handler registered here would not run until the
 * child it is waiting on had finished anyway. SIGKILL runs nothing at all.
 *
 * So the guard runs on the way *in*, where nothing can prevent it. It matches
 * on the scaffold's own title and not the name prefix alone, so no real course
 * can be caught by it.
 *
 * `packed/` is swept too because this check creates an import bundle after the
 * scaffold. An interrupted run must not leave that generated probe behind.
 */
function sweep() {
  for (const n of readdirSync(join(ROOT, "courses"))) {
    if (!/^probe[0-9a-z]+$/.test(n)) continue;
    const y = join(ROOT, "courses", n, "course.yaml");
    if (existsSync(y) && readFileSync(y, "utf8").includes(TITLE))
      rmSync(join(ROOT, "courses", n), { recursive: true, force: true });
  }
  const packed = join(ROOT, "packed");
  if (!existsSync(packed)) return;
  for (const n of readdirSync(packed)) {
    if (!/^probe[0-9a-z]+\.course\.json$/.test(n)) continue;
    /* A bundle is a map of path -> contents, so the title is read from the
       course.yaml inside it rather than from the filename. */
    let bundle;
    try { bundle = JSON.parse(readFileSync(join(packed, n), "utf8")); } catch { continue; }
    if (String(bundle["course.yaml"] || "").includes(TITLE))
      rmSync(join(packed, n), { force: true });
  }
}
sweep();

let ok = false, detail = "";
try {
  run("new-course.mjs", [name, TITLE]);
  const built = run("build.mjs");
  if (built.includes(name)) throw new Error("the app build inspected the user-course probe");
  if (existsSync(join(dir, "blocks.js"))) throw new Error("probe course required custom code");
  run("validate.mjs", ["--isolated", name]);
  const packed = run("pack.mjs", [name]);
  if (!packed.includes(`packed/${name}.course.json`))
    throw new Error("probe course did not produce an importable bundle");
  detail = " · import bundle produced";
  ok = true;
} catch (e) {
  console.error("FAIL template  a new subject could not be created from data alone");
  console.error((e.stdout || "") + (e.stderr || e.message));
  process.exitCode = 1;
} finally {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  sweep();
  try { run("build.mjs"); } catch { /* reported above */ }
}
if (ok) console.log(`ok   template  scaffold → validate → pack · no code required${detail}`);
