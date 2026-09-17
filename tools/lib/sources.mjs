/* ============================================================================
 * tools/lib/sources.mjs — what a course is written from, wherever it lives
 *
 * A course's material is its own `sources/` folder plus any `--source` paths:
 * a textbook export, a folder of notes, a whole repository. None of it has a
 * required shape, and code never reads meaning into a name. This file finds,
 * lists and indexes it, safely; the authoring model decides what belongs where.
 *
 *   roots(courseDir, paths, base)  -> validated absolute roots (throws on unsafe)
 *   list(roots)                    -> [{ root, rel, path, text, doc, bytes }]
 *   index(roots)                   -> files, or folders when there are many
 *   outline(roots)                 -> headings of the document files
 *   topics(md), prose(md)          -> text split at headings / figure text removed
 *   loadMap(repo, id)              -> { subsection file: [source names] }
 * ==========================================================================*/
import { readdirSync, existsSync, readFileSync, statSync, realpathSync, lstatSync } from "node:fs";
import { join, relative, extname, basename, resolve, sep, dirname } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";

/* ----------------------------------------------------------------- roots --
 * A --source path is handed to a model with read access, so it is checked
 * before anything is read: it must exist, and it must not be so broad that
 * "read the sources" means "read the machine". The repo's own courses/ holds
 * other, private courses, so only this course's corner of it is allowed.
 */
const SYSTEM = ["/bin", "/boot", "/dev", "/etc", "/lib", "/proc", "/sbin", "/sys", "/usr",
                "/private/etc", "/System", "/Library", "/Applications"];
/* Refused as a whole, but a folder inside may be fine: per-user temp space
   lives under /var/folders on macOS, and /tmp under /private. */
const BROAD = ["/var", "/private", "/private/var", "/Users", "/home", "/opt", "/Volumes", "/mnt"];

const within = (child, parent) => child === parent || child.startsWith(parent + sep);

export function roots(courseDir, paths = [], base = process.cwd()) {
  const repo = resolve(courseDir, "..", "..");
  const courses = join(repo, "courses");
  const own = join(courseDir, "sources");
  const out = existsSync(own) ? [realpathSync(own)] : [];
  for (const p of paths) {
    const abs = resolve(base, p.replace(/^~(?=$|\/)/, homedir()));
    if (!existsSync(abs)) throw new Error(`--source ${p}: ${abs} does not exist`);
    const real = realpathSync(abs);
    const home = realpathSync(homedir());
    const refuse = why => { throw new Error(`--source ${p}: refused, ${why}`); };
    if (real === sep || real === home || within(home, real)) refuse("it contains your whole home folder or more");
    if (SYSTEM.some(s => within(real, s))) refuse("it is a system folder");
    if (BROAD.includes(real)) refuse("it is too broad; name the folder you mean");
    if (within(realpathSync(repo), real)) refuse("it contains this repository, and with it every private course");
    if (within(real, realpathSync(courses)) && !within(real, realpathSync(courseDir)))
      refuse("it is inside another course");
    if (!out.some(r => within(real, r))) out.push(real);
  }
  return out;
}

/* ------------------------------------------------------------------ list --*/
/* Documents are what a heading outline and a coverage score make sense for.
   Code is readable too, for courses about a codebase, but has no headings. */
const DOC = new Set([".md", ".markdown", ".mdx", ".txt", ".tex", ".html", ".htm", ".rst", ".adoc", ".org"]);
const CODE = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".py", ".rb", ".go", ".rs",
  ".java", ".kt", ".swift", ".c", ".h", ".cc", ".cpp", ".hpp", ".cs", ".php", ".scala", ".sh",
  ".sql", ".r", ".jl", ".lua", ".dart", ".vue", ".svelte", ".css", ".scss", ".json", ".yaml",
  ".yml", ".toml", ".ini", ".csv", ".xml", ".proto", ".graphql", ".ipynb"]);

/* Never listed, never offered: credentials by name, and bulk that is not
   material (dependencies, build output, lockfiles, minified bundles). The
   authoring session's permissions deny the credential patterns as well. */
export const SECRET = /(^|\/)(\.env[^/]*|.*\.(pem|key|p12|pfx|keystore|jks)|id_(rsa|dsa|ecdsa|ed25519)[^/]*|\.?(credentials|secrets?)(\.[^/]*)?|\.netrc|\.npmrc|\.pypirc)$/i;
const BULK_DIR = /(^|\/)(node_modules|vendor|dist|build|out|target|coverage|__pycache__|\.[^/]*)(\/|$)/;
const BULK_FILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|poetry\.lock|go\.sum|[^/]*\.min\.(js|css)|[^/]*\.map)$/;
const LIMIT = 20000;   /* files per root; past this the tree is not "material" */

const skip = rel => SECRET.test(rel) || BULK_DIR.test(rel) || BULK_FILE.test(rel);

/* In a git repository the author already said what is not material:
   .gitignore. Tracked plus untracked-but-not-ignored files, nothing else.
   A folder the enclosing repo ignores (a course's own sources/ is one) is
   not that repo's material, so it is walked instead. */
function gitFiles(dir) {
  const git = args => execFileSync("git", ["-C", dir, ...args],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  try { git(["rev-parse", "--show-toplevel"]); } catch { return null; }
  try { git(["check-ignore", "-q", "."]); return null; } catch { /* not ignored */ }
  try {
    return git(["ls-files", "-co", "--exclude-standard", "-z", "--", "."]).split("\0").filter(Boolean);
  } catch { return null; }
}

function walk(dir) {
  const out = [];
  const go = d => {
    for (const f of readdirSync(d).sort()) {
      if (out.length >= LIMIT) return;
      const path = join(d, f);
      const rel = relative(dir, path);
      if (skip(rel)) continue;
      const st = lstatSync(path);
      if (st.isDirectory()) go(path);
      else if (st.isFile() || st.isSymbolicLink()) out.push(rel);
    }
  };
  go(dir);
  return out;
}

/** Every material file under the roots, sorted, each checked to stay inside
    its root (a symlink pointing out is dropped, not followed). */
export function list(rootsList) {
  const out = [];
  for (const root of rootsList) {
    if (statSync(root).isFile()) {
      out.push(entry(dirname(root), basename(root), root));
      continue;
    }
    const rels = (gitFiles(root) || walk(root)).filter(r => !skip(r)).sort().slice(0, LIMIT);
    for (const rel of rels) {
      const path = join(root, rel);
      let real;
      try { real = realpathSync(path); } catch { continue; }
      if (!within(real, root) || !statSync(real).isFile()) continue;
      out.push(entry(root, rel, path));
    }
  }
  return out;
}

function entry(root, rel, path) {
  const ext = extname(rel).toLowerCase();
  return { root, rel, path, doc: DOC.has(ext), text: DOC.has(ext) || CODE.has(ext),
           bytes: statSync(path).size };
}

const tok = bytes => Math.round(bytes / 4);

/* What a person glances at when a name does not say what a file is. */
const opening = path =>
  readFileSync(path, "utf8").slice(0, 4000).replace(/<!--[\s\S]*?-->/g, "").split("\n")
    .map(l => l.trim()).filter(Boolean).slice(0, 2)
    .map(l => l.length > 110 ? l.slice(0, 110) + "…" : l);

/* Past this many files a per-file index costs more than it tells; folders
   (with their size and README's first line) say where to look instead. */
const PER_FILE = 300;

/** The material at a glance: every file with its opening lines, or, for a
    large root, every folder two levels deep with its size. */
export function index(rootsList, files = list(rootsList)) {
  return rootsList.map(root => {
    const mine = files.filter(f => f.root === root || (f.path === root));
    const head = `${root}  (${mine.length} files, ~${tok(mine.reduce((n, f) => n + f.bytes, 0))} tok)`;
    if (mine.length <= PER_FILE) {
      return [head, ...mine.map(f => f.text
        ? `  ${f.rel}  (~${tok(f.bytes)} tok)  | ${opening(f.path).join(" / ")}`
        : `  ${f.rel}  (not text)`)].join("\n");
    }
    const dirs = new Map();
    for (const f of mine) {
      const key = f.rel.split("/").slice(0, 2).join("/");
      const d = f.rel.includes("/") ? (f.rel.split("/").length > 2 ? key + "/" : dirname(f.rel) + "/") : f.rel;
      const x = dirs.get(d) || { n: 0, bytes: 0, readme: null };
      x.n++; x.bytes += f.bytes;
      if (!x.readme && /(^|\/)readme(\.[a-z]+)?$/i.test(f.rel) && f.rel.split("/").length <= 3)
        x.readme = opening(f.path)[0];
      dirs.set(d, x);
    }
    return [head + "  — large: folders two levels deep; use Glob/Grep inside them",
      ...[...dirs].map(([d, x]) => `  ${d}  (${x.n} files, ~${tok(x.bytes)} tok)` +
        (x.readme ? `  | ${x.readme}` : ""))].join("\n");
  }).join("\n\n");
}

/* The outline is a table of contents, not a copy: past this it is cut. */
const OUTLINE_LIMIT = 60000;   /* characters */

/** Headings of every document file: the material's table of contents,
    whatever shape its files take. */
export function outline(rootsList, files = list(rootsList)) {
  const parts = [];
  let size = 0;
  for (const f of files.filter(x => x.doc)) {
    const [first, ...rest] = topics(readFileSync(f.path, "utf8"));
    const block = [`${f.path} — ${first.heading}`, ...rest.map(t => `  - ${t.heading}`)].join("\n");
    if (size + block.length > OUTLINE_LIMIT) {
      parts.push(`(outline cut at ${OUTLINE_LIMIT} characters; Grep for headings in the rest)`);
      break;
    }
    parts.push(block); size += block.length;
  }
  return parts.join("\n");
}

/* ------------------------------------------------------------------- map --
 * One line per finished subsection, written by the authoring session:
 *
 *   sections/01-first/6-subs.yaml: /abs/book.md#Bernoulli Equations | /abs/notes.md
 *
 * It is progress (a listed subsection is done) and the one thing coverage
 * needs to score a topic against the subsection it was meant for. Nobody
 * reads it, so it is plain lines and nothing more.
 */
export const mapPath = (repo, id) => join(repo, ".author", id, "map.txt");

export function loadMap(repo, id) {
  const p = mapPath(repo, id);
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^(\S[^:]*\.(?:ya?ml|json)):\s*(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].split("|").map(x => x.trim()).filter(x => x && !/^none$/i.test(x));
  }
  return out;
}

/** Does map entry `name` ("/abs/f.md" or "/abs/f.md#Heading") cover this topic? */
export const names = (name, path, heading) => {
  const [file, head] = splitName(name);
  return file === path && (!head || bare(head) === bare(heading));
};

export const splitName = name => {
  const i = name.indexOf("#");
  return i < 0 ? [name, null] : [name.slice(0, i), name.slice(i + 1)];
};

/* The reader's long descriptions of figures ("The horizontal axis is labeled
   x…", "The curve … starts from (0, 1), rises toward the upper right") are
   accessibility text: a fifth of ma26600's pages. A model writing the course
   does not need them, and a word count mistakes them for teaching. The short
   "[figure: …]" caption before them is kept. */
const FIGURE = /^(Figure \d|The (horizontal|vertical) axis|The (graph|differential equation) (is|shows)|.{0,40}is shown below)|axis is labeled|is marked on|\b(starts|ends) (from|at) \(|toward (the )?(upper|lower) (left|right)/i;

export const describesFigure = paragraph => FIGURE.test(paragraph.trim());

export const prose = md =>
  md.split(/\n\s*\n/).filter(p => !describesFigure(p)).join("\n\n");

/* ------------------------------------------------------------- headings --
 * Headings reach a text file three ways, depending on how it was made:
 *
 *   "## Bernoulli Equations"                          marked
 *   "Bounded Populations and the Logistic Equation"   a line of its own
 *   "Bernoulli EquationsA first-order equation…"      glued to the next sentence
 *
 * The last two are recognised by shape: Title Case, no closing punctuation.
 */
const SMALL = /^(a|an|and|as|at|by|for|from|in|of|on|or|the|to|vs\.?|with)$/;
/* Named results (Theorem 1, Rule 2) sit inside a topic rather than opening
   one, and splitting at them leaves topics too small to score. */
const NOT_TOPIC = /^(Figure|Example|Solution|Remark|Table|Interactive|Continued|Historical|Note|Theorem|Definition|Rule|Algorithm|Principle|Proof|Corollary)\b/;

const titleCase = s => {
  const w = s.trim().split(/\s+/);
  if (w.length < 2 || w.length > 9 || NOT_TOPIC.test(s)) return false;
  if (/[.,;:!?)]$/.test(s) || !/^[\w\s’'\-–,&]+$/.test(s)) return false;
  return /^[A-Z0-9]/.test(w[0]) && /^[A-Z]/.test(w[w.length - 1]) &&
         w.every(x => /^[A-Z0-9]/.test(x) || SMALL.test(x));
};

/** A line's heading and the prose it runs into, or null when it is not one. */
function headingOf(line) {
  const marked = /^##+\s+(.+?)\s*$/.exec(line);
  if (marked) return { heading: marked[1], rest: "" };
  if (titleCase(line)) return { heading: line.trim(), rest: "" };
  /* Glued: a lowercase letter directly followed by a capital. The shortest
     Title Case prefix wins, so "Exact Differential EquationsWe have seen" splits
     after "Equations" and not inside "EquationsWe". */
  for (const m of line.matchAll(/[a-z](?=[A-Z])/g)) {
    const head = line.slice(0, m.index + 1);
    if (titleCase(head.replace(/^\d+(\.\d+)*\s+/, "X "))) {
      return { heading: head, rest: line.slice(m.index + 1) };
    }
  }
  return null;
}

const bare = s => s.replace(/^\d+(\.\d+)*\s+/, "").replace(/\s+/g, " ").trim();

/** Text split into the topics its headings name. Text before any heading
    belongs to the `# ` title, or to "(untitled)". */
export function topics(md) {
  const title = /^#\s+(.+)$/m.exec(md)?.[1] || "(untitled)";
  const out = [{ heading: title, lines: [] }];
  for (const line of md.replace(/^#\s.*$/m, "").replace(/<!--[\s\S]*?-->/g, "").split("\n")) {
    const h = headingOf(line);
    /* A glued page title ("1.6 Substitution …EquationsThe first") repeats the
       `#` line: keep its prose under the title rather than opening a twin. */
    if (h && bare(h.heading) !== bare(title)) {
      out.push({ heading: h.heading, lines: [h.rest] });
    } else {
      out[out.length - 1].lines.push(h ? h.rest : line);
    }
  }
  return out.map(t => ({ heading: t.heading, body: t.lines.join("\n").trim() }))
            .filter((t, i) => i === 0 || t.body);
}
