#!/usr/bin/env node
/* Sources and coverage: any layout is read, safely, and a skipped topic shows.
 *
 *   node tools/test-coverage.mjs
 *
 * 1. Sources have no required shape: the course's own folder and any --source
 *    path, at any depth, a whole book in one file, a repository. Nothing is
 *    inferred from a name. (A naming rule once sent every prompt out with no
 *    source, and §1.6's "Reducible Second-Order Equations" was never written.)
 * 2. A --source path cannot widen the session past what was meant: no system
 *    folders, no home folder, no repo or other course, no credentials, no
 *    symlink out of its root, and .gitignore is honoured.
 * 3. Headings are recovered however a file carries them, and a topic the
 *    course never mentions scores far below one it teaches.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, realpathSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { roots, list, index, outline, topics, names, loadMap } from "./lib/sources.mjs";
import { terms, bag, idf, score } from "./lib/coverage.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = [];
const ck = (n, ok, x = "") => R.push({ n, ok, x });
const threw = fn => { try { fn(); return null; } catch (e) { return e.message; } };

const tmp = realpathSync(mkdtempSync(join(tmpdir(), "coverage-")));
const put = (base, rel, body) => {
  const p = join(base, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
};

/* -------------------------------------------------------------- headings --*/
const page = `# 1.6 Substitution Methods and Exact Equations

<!-- source: x -->

1.6 Substitution Methods and Exact EquationsThe first-order equations we have solved.

## Homogeneous Equations

A homogeneous equation is solved with v equals y over x.

Bernoulli EquationsA first-order equation of the Bernoulli form.

Theorem 1: Existence and Uniqueness

Reducible Second-Order EquationsIf the dependent variable is missing, substitute p.

Example 10Solve the equation in which y is missing.
`;
const ts = topics(page);
ck("marked, glued and standalone headings are all found",
   ts.map(t => t.heading).join(" | ") ===
   "1.6 Substitution Methods and Exact Equations | Homogeneous Equations | " +
   "Bernoulli Equations | Reducible Second-Order Equations",
   ts.map(t => t.heading).join(" | "));
ck("a glued heading keeps the sentence it swallowed",
   /^If the dependent variable is missing/.test(ts[3].body), ts[3].body.slice(0, 40));
ck("a glued page title stays with the page, not a twin topic",
   /first-order equations we have solved/.test(ts[0].body));
ck("named results and examples stay inside their topic", /Theorem 1/.test(ts[2].body) &&
   /Example 10/.test(ts[3].body));

/* --------------------------------------------------------------- layout --*/
const demo = join(ROOT, "courses", "demo");   /* any real course: roots() checks against it */
const loose = join(tmp, "loose");
put(loose, "Book/whole-book.md", page);
put(loose, "notes/week 3.txt", "Lecture: exact equations\nM dx + N dy = 0\n");
put(loose, "scan.pdf", "%PDF-1.4");
put(loose, ".DS_Store", "x");
put(loose, ".env", "SECRET=1\n");
put(loose, "keys/deploy.pem", "-----BEGIN");
put(loose, "node_modules/x/index.js", "x");
put(loose, "package-lock.json", "{}");
put(tmp, "outside.md", "# not yours\n");
symlinkSync(join(tmp, "outside.md"), join(loose, "escape.md"));

const rs = roots(demo, [loose]);
const files = list(rs.filter(r => r === loose));
ck("files are found at any depth; dotfiles, credentials, bulk and escaping links are not",
   files.map(f => f.rel).join() === "Book/whole-book.md,notes/week 3.txt,scan.pdf",
   files.map(f => f.rel).join());
ck("a file that is not text is listed but marked", files.find(f => f.rel === "scan.pdf").text === false);
const idx = index([loose], files);
ck("the index shows each file's opening lines",
   /notes\/week 3\.txt .*\| Lecture: exact equations \/ M dx \+ N dy = 0/.test(idx), idx);
ck("the outline lists every heading of every document",
   /whole-book\.md — 1\.6 Substitution[^\n]*\n(  - .*\n)*  - Reducible Second-Order Equations/.test(outline([loose], files)),
   outline([loose], files));

const big = join(tmp, "big");
for (let i = 0; i < 320; i++) put(big, `pkg${i % 4}/src/f${i}.js`, "// file\n");
put(big, "pkg0/README.md", "# Package zero\n");
const bigIndex = index([big], list([big]));
ck("a large tree is indexed by folder", /pkg0\/src\/  \(80 files/.test(bigIndex) &&
   !/f17\.js/.test(bigIndex), bigIndex.slice(0, 300));

/* A repository: .gitignore decides, untracked-but-not-ignored files count. */
const repo = join(tmp, "repo");
put(repo, "src/app.ts", "export const a = 1;\n");
put(repo, "generated/out.ts", "x");
put(repo, ".gitignore", "generated/\n");
put(repo, "docs/guide.md", "# Guide\n");
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { stdio: "ignore" });
git("init", "-q"); git("add", "src/app.ts", ".gitignore");
ck("a repository lists what git would, and code is readable",
   list([repo]).map(f => `${f.rel}:${f.text}`).join() === "docs/guide.md:true,src/app.ts:true",
   list([repo]).map(f => f.rel).join());

/* ----------------------------------------------------------------- roots --*/
const refused = (p, base = "/") => /refused|does not exist/.test(threw(() => roots(demo, [p], base)) || "");
ck("the filesystem root is refused", refused("/"));
ck("the home folder is refused", refused(homedir()) && refused("~"));
ck("system and top-level folders are refused", refused("/etc") && refused("/usr/lib") &&
   refused("/var") && refused("/Users"));
ck("the repository itself is refused", refused(ROOT) && refused("..", join(ROOT, "src")));
ck("another course is refused", refused(join(ROOT, "courses", "_template")));
ck("a path that does not exist is refused", refused(join(tmp, "nope")));
ck("a relative path is taken from where the command was typed",
   roots(demo, ["loose"], tmp).includes(loose));

/* ------------------------------------------------------------------- map --*/
const state = join(ROOT, ".author", `_test-map-${process.pid}`);
put(state, "map.txt", "sections/01-a/1-b.yaml: /x/book.md#Bernoulli Equations | /x/notes.md\n" +
  "sections/01-a/2-c.yaml: NONE\ngarbage line\n");
try {
  const m = loadMap(ROOT, `_test-map-${process.pid}`);
  ck("the map is one line per finished subsection",
     m["sections/01-a/1-b.yaml"]?.join() === "/x/book.md#Bernoulli Equations,/x/notes.md" &&
     m["sections/01-a/2-c.yaml"]?.length === 0 && Object.keys(m).length === 2, JSON.stringify(m));
} finally { rmSync(state, { recursive: true, force: true }); }
ck("a map entry matches its file and, if named, its heading",
   names("/x/book.md", "/x/book.md", "Anything") &&
   names("/x/book.md#Bernoulli Equations", "/x/book.md", "Bernoulli Equations") &&
   !names("/x/book.md#Bernoulli Equations", "/x/book.md", "Homogeneous Equations"));

/* ----------------------------------------------------------------- score --*/
const src = [
  ["Homogeneous Equations",
   "A homogeneous equation has the form f of y over x. The substitution v equals y over x makes it separable.\n\n" +
   "After the homogeneous substitution, separate v and x, integrate, and replace v by y over x."],
  ["Reducible Second-Order Equations",
   "A second-order equation with the dependent variable missing is reducible: substitute p for the derivative.\n\n" +
   "With the independent variable missing, the reducible equation takes p as a function of y."],
  ["Bernoulli Equations",
   "A Bernoulli equation becomes linear under the substitution v equals a power of y.\n\n" +
   "Bernoulli exponents zero and one are already linear."]
].map(([h, b]) => ({ h, tf: bag(h, b) }));
const w = idf(src.map(t => t.tf));
const course = terms("Homogeneous equations: substitute v = y/x, then the equation is separable; " +
                     "integrate and replace v. Bernoulli equations become linear with v a power of y.");
const [homog, reducible, bernoulli] = src.map(t => score(t.tf, course, w));
ck("a taught topic scores high", homog.score > 0.6, homog.score.toFixed(2));
ck("a skipped topic scores low", reducible.score < 0.25, reducible.score.toFixed(2));
ck("and names what it is about", reducible.missing.includes("reducible"), reducible.missing.join(","));
ck("a heading's words count", bag("Reducible Equations", "").has("reducible"));
ck("figure descriptions are not topic words",
   !bag("X", "The curve labeled y starts from (0, 1), rises toward the upper right, forms trough at (1, 0).").has("trough"));
ck("a partly taught topic still clears a skipped one", bernoulli.score > 2 * reducible.score, bernoulli.score.toFixed(2));

rmSync(tmp, { recursive: true, force: true });

const bad = R.filter(r => !r.ok);
for (const r of bad) console.error(`       ✗ ${r.n}  ${r.x}`);
console.log(`${bad.length ? "FAIL" : "ok  "} coverage   ${R.length - bad.length}/${R.length} checks`);
process.exitCode = bad.length ? 1 : 0;
