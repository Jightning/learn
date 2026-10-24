/* ============================================================================
 * tools/lib/files.mjs — a course as the files it is written in
 *
 * One map of path to text: what the build ships, what `npm run pack` writes,
 * what the app imports, what IndexedDB stores. Shared so the deployment and a
 * hand-packed file can never disagree about what a course is — including which
 * of them the deployment is allowed to hold at all.
 * ==========================================================================*/
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";
import * as YAML from "js-yaml";

/** Author reasoning stays in source files, never in distributed course data. */
export function withoutAuthorComments(value) {
  if (Array.isArray(value)) return value.map(withoutAuthorComments);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "authorComment")
      .map(([key, child]) => [key, withoutAuthorComments(child)]));
  return value;
}

function publishText(name, text) {
  if (!/\.(ya?ml|json)$/i.test(name) || !text.includes("authorComment")) return text;
  const json = /\.json$/i.test(name);
  const value = json ? JSON.parse(text) : YAML.load(text);
  const clean = withoutAuthorComments(value);
  if (JSON.stringify(value) === JSON.stringify(clean)) return text;
  return json ? JSON.stringify(clean) : YAML.dump(clean, { lineWidth: -1, noRefs: true });
}

/* Only explicitly approved courses may reach the public deployment.
   Keep this allowlist separate from course.yaml so authoring cannot publish a
   course by changing its metadata. All other courses use import or sync.
   `_`-prefixed folders remain excluded. */
/* The category is storefront metadata, not part of an author's course. */
export const PUBLIC_CATEGORIES = new Map([["demo", "Getting Started"], ["mvcalc", "Mathematics"]]);
export const PUBLIC = new Set(PUBLIC_CATEGORIES.keys());

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
               ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };

const TEXT = /\.(ya?ml|json|md)$/i;
const SKIP = new Set(["sources", "node_modules"]);

/** Every file of a course as text, keyed by its path relative to the folder. */
export
function courseFiles(dir, fail) {
  const files = {};
  let assetBytes = 0;

  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".") || SKIP.has(e.name)) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }

      const rel = relative(dir, full).split(sep).join("/");
      if (TEXT.test(e.name)) { files[rel] = publishText(e.name, readFileSync(full, "utf8")); continue; }

      /* Images travel as data URIs under their own path, so a course stays one
         self-contained map with nothing to fetch alongside it. */
      const type = MIME[extname(e.name).toLowerCase()];
      if (!type) continue;
      assetBytes += statSync(full).size;
      files[rel] = `data:${type};base64,${readFileSync(full).toString("base64")}`;
    }
  })(dir);

  if (assetBytes > 8e6) fail(`assets total ${(assetBytes / 1e6).toFixed(1)}MB`);
  return files;
}
