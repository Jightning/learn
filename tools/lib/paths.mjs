/* ============================================================================
 * tools/lib/paths.mjs — where the engine is, and where the courses are
 *
 * These tools run in two places. In this repository the two are the same
 * folder: the engine (docs, template, scripts) sits beside courses/. Packaged
 * for an agent — the Claude Code plugin, or the kit any other CLI agent uses —
 * the engine is wherever the package was installed, and the courses belong to
 * whoever is authoring them: the folder they are working in.
 *
 *   ENGINE     the spec, the template, the scripts
 *   WORKSPACE  courses/ and .author/ live here
 *
 * The rule is simple enough to keep in one place: a workspace is named by
 * AUTHOR_WORKSPACE, else it is where the command was run. The installed engine never selects
 * another checkout as the course workspace.
 * ==========================================================================*/
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* Where this file sits differs between the repository (tools/lib/paths.mjs)
   and a package, where the bundler inlines it into scripts/<tool>.mjs. So the
   engine is found by what it holds, not by counting folders up. */
const holdsSpec = d => existsSync(join(d, "docs", "create_course.md")) ||
  existsSync(join(d, "courses", "_template")) || existsSync(join(d, "template", "course.yaml"));

function findEngine(from) {
  for (let d = from, up = 0; up < 5; d = dirname(d), up++) if (holdsSpec(d)) return d;
  return resolve(from, "..");
}

/** The folder the running script was installed in (this repo, or the package). */
export const ENGINE = findEngine(dirname(fileURLToPath(import.meta.url)));

const here = () => resolve(process.env.INIT_CWD || process.cwd());
const workspaceAt = process.argv.indexOf("--workspace");
const requestedWorkspace = workspaceAt >= 0 ? process.argv[workspaceAt + 1] : null;
if (workspaceAt >= 0 && (!requestedWorkspace || requestedWorkspace.startsWith("--")))
  throw new Error("--workspace needs a directory path");

export const WORKSPACE = requestedWorkspace ? resolve(requestedWorkspace) : process.env.AUTHOR_WORKSPACE
  ? resolve(process.env.AUTHOR_WORKSPACE)
  : here();

export const COURSES = join(WORKSPACE, "courses");
export const STATE = join(WORKSPACE, ".author");
export const TEMPLATE = existsSync(join(ENGINE, "courses", "_template"))
  ? join(ENGINE, "courses", "_template") : join(ENGINE, "template");
export const DOCS = existsSync(join(ENGINE, "docs")) ? join(ENGINE, "docs") : ENGINE;
/** True when the engine is a package rather than this repository. */
export const PACKAGED = WORKSPACE !== ENGINE;
