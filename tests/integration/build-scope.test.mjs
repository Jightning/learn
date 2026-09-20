#!/usr/bin/env node
/* A private course is user data, not application source. Prove that dev and
 * build ignore it: malformed YAML must not enter the generated course index,
 * and malformed blocks.js must not enter Vite's module graph. */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const id = `private-build-probe-${process.pid}`;
const dir = join(ROOT, "courses", id);
let failed = 0;

const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failed++;
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/* Exercise the command developers actually run. A unit test of the plugin's
   allowlist would miss Vite config, watcher, or middleware regressions. */
async function checkDevServer() {
  const port = 43000 + (process.pid % 1000);
  const vite = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath,
    [vite, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });

  try {
    let home;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (child.exitCode !== null) break;
      try { home = await fetch(`http://127.0.0.1:${port}/`); break; }
      catch { await wait(100); }
    }
    check("the dev server starts with a malformed private course present",
          Boolean(home && home.ok), home ? `HTTP ${home.status}` : output.trim().slice(0, 300));
    if (!home || !home.ok) return;

    const demo = await fetch(`http://127.0.0.1:${port}/courses/demo.json`);
    check("the dev server still serves the public demo",
          demo.ok && (demo.headers.get("content-type") || "").includes("json"));

    const index = await fetch(`http://127.0.0.1:${port}/@id/__x00__virtual:courses`);
    const indexSource = await index.text();
    check("the dev course index contains only allowlisted source",
          index.ok && indexSource.includes('"demo"') && !indexSource.includes(id));

    const privateCourse = await fetch(`http://127.0.0.1:${port}/courses/${id}.json`);
    check("the dev server does not serve private courses",
          !(privateCourse.headers.get("content-type") || "").includes("json"));
    check("the dev server does not inspect or report private courses", !output.includes(id));
  } finally {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise(resolve => child.once("exit", resolve)),
      wait(2000).then(() => { if (child.exitCode === null) child.kill("SIGKILL"); })
    ]);
  }
}

try {
  mkdirSync(dir);
  writeFileSync(join(dir, "course.yaml"), ": this is deliberately malformed YAML\n");
  writeFileSync(join(dir, "blocks.js"), "export default function (\n");

  await checkDevServer();

  const built = spawnSync(process.execPath, ["tools/build.mjs"], {
    cwd: ROOT, encoding: "utf8"
  });
  const output = `${built.stdout || ""}${built.stderr || ""}`;

  check("a malformed private course cannot fail the build", built.status === 0,
        built.status === 0 ? "" : output.trim().slice(0, 300));
  check("the build does not inspect or report private courses", !output.includes(id));
  check("the private course is absent from dist",
        !existsSync(join(ROOT, "dist", "courses", `${id}.json`)));

  const validated = spawnSync(process.execPath,
    ["tools/validate.mjs", "--isolated", "demo"], { cwd: ROOT, encoding: "utf8" });
  const validationOutput = `${validated.stdout || ""}${validated.stderr || ""}`;
  check("engine validation is isolated from private courses", validated.status === 0 &&
        !validationOutput.includes(id), validated.status === 0 ? "" : validationOutput.trim().slice(0, 300));
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
