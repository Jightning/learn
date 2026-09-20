import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { loadCourse } from "./tools/lib/load.mjs";
import { courseFiles, PUBLIC } from "./tools/lib/files.mjs";

/* ---------------------------------------------------------------- courses --
 * A course ships as the files it is written in — one JSON per course holding
 * a map of path to text — and is parsed in the browser by src/lib/parse.js.
 *
 * Nothing is compiled here any more. Rendering TeX at build time cost 16x in
 * size (ma26600: 458KB of YAML became 7.3MB) to save 54-87ms of phone CPU per
 * subsection, which is the wrong trade the moment a course is something a user
 * imports, edits and syncs rather than something the operator bakes in.
 *
 * The courses are still read here, but only to derive `INDEX`: the scalars the
 * library card and the cross-course due count need before any course is opened.
 */
/** The scalars every view needs before a course is fetched. */
function indexOf(course, id) {
  const subs = (course.sections || []).reduce((n, s) => n + s.subs.length, 0);
  const questions = (course.sections || []).reduce((n, s) =>
    n + s.subs.reduce((m, u) => m + (u.quiz || []).length, 0), 0);
  return {
    code: course.code || id,
    title: course.title || id,
    tagline: course.tagline || "",
    theme: { hue: Number((course.theme || {}).hue) || 0 },
    meta: course.meta || "",
    state: course.state || {},
    retention: course.retention || {},
    sections: (course.sections || []).length,
    subs, questions,
    drillKeys: Object.keys(course.drills || {})
      .filter(k => ((course.drills[k] || {}).items || []).length)
  };
}

function coursesPlugin() {
  const VID = "virtual:courses";
  const RESOLVED = "\0" + VID;
  const BLOCKS_VID = "virtual:course-blocks";
  const BLOCKS_RESOLVED = "\0" + BLOCKS_VID;
  const dir = join(process.cwd(), "courses");
  const publicIds = [...PUBLIC].sort();
  const publicRoots = publicIds.map(id => join(dir, id) + sep);
  let serving = false;

  return {
    name: "courses",
    configResolved(cfg) { serving = cfg.command === "serve"; },
    resolveId(id) {
      if (id === VID) return RESOLVED;
      if (id === BLOCKS_VID) return BLOCKS_RESOLVED;
      return null;
    },
    load(id) {
      /* Only bundled courses contribute executable code. An imported course is
         data, and a blocks.js beside one on the author's machine must never be
         pulled into the application merely because Vite can see the folder. */
      if (id === BLOCKS_RESOLVED) {
        const imports = [], names = [];
        publicIds.forEach((courseId, i) => {
          const file = join(dir, courseId, "blocks.js");
          if (!existsSync(file)) return;
          const name = `courseBlocks${i}`;
          imports.push(`import * as ${name} from ${JSON.stringify(file)};`);
          names.push(name);
        });
        return `${imports.join("\n")}\nexport default [${names.join(",")}];`;
      }
      if (id !== RESOLVED) return null;

      const index = {}, order = [];
      for (const c of publicIds) {
        if (!existsSync(join(dir, c))) this.error(`public course ${c} does not exist`);
        const { course, errors } = loadCourse(join(dir, c));
        if (errors.length) this.error(`${c}: ${errors.join("; ")}`);

        index[c] = indexOf(course, c);
        order.push(c);
        /* emitFile is build-only; the dev server answers the same URLs from
           disk in configureServer below. */
        if (!serving) this.emitFile({
          type: "asset",
          fileName: `courses/${c}.json`,
          source: JSON.stringify(courseFiles(join(dir, c), m => this.error(`${c}: ${m}`)))
        });
      }
      return `export const INDEX = ${JSON.stringify(index)};\n` +
             `export const ORDER = ${JSON.stringify(order)};\n`;
    },
    configureServer(server) {
      /* Without this, `vite dev` falls through to the SPA handler and answers
         a course request with index.html — a 200 that is not JSON, which fails
         far from its cause. */
      server.middlewares.use((req, res, next) => {
        const m = /^\/courses\/([\w-]+)\.json$/.exec((req.url || "").split("?")[0]);
        if (!m || !PUBLIC.has(m[1]) || !existsSync(join(dir, m[1]))) return next();
        res.setHeader("content-type", "application/json");
        res.setHeader("cache-control", "no-store");
        res.end(JSON.stringify(courseFiles(join(dir, m[1]), console.error)));
      });

      publicRoots.forEach(root => server.watcher.add(root));
      server.watcher.on("all", (_e, file) => {
        if (!publicRoots.some(root => file.startsWith(root))) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      });
    }
  };
}

/* Font stylesheets list woff2, woff and sometimes truetype for every face, and
   the bundler inlines whatever it finds. Shipping all three put roughly a
   megabyte of duplicate fonts in a page that only ever runs in a browser new
   enough for woff2 — the same browser the oklch palette already requires. */
function woff2Only() {
  return {
    name: "woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes(".css") || !code.includes("@font-face")) return null;
      /* minified CSS ends the last declaration of a block with `}`, not `;`,
         and `src` is the last one in every @font-face KaTeX ships */
      return code.replace(/src:([^;}]*)([;}])/g, (whole, list, end) => {
        const w2 = /url\(([^)]*\.woff2)\)/.exec(list);
        return w2 ? `src:url(${w2[1]}) format("woff2")${end}` : whole;
      });
    }
  };
}

export default defineConfig({
  root: "src",
  plugins: [woff2Only(), preact(), coursesPlugin()],
  build: { outDir: "../dist", emptyOutDir: true, cssCodeSplit: false }
});
