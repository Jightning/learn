/* ============================================================================
 * src/lib/intake.js — turn what a reader hands over into a course file map
 *
 * A course is a folder of YAML, and that is what a model writes when it follows
 * docs/create_course.md. So the app has to accept a folder, not a format of its
 * own invention — otherwise every edit needs a build step the reader may not
 * have.
 *
 * Three ways in, because no single one works everywhere:
 *
 *   folder   `webkitdirectory` — the best desktop experience, and unsupported
 *            on *every* mobile browser, iOS Safari included
 *   zip      the universal path: Finder and the iOS Files app both create them
 *            from a folder with one gesture
 *   json     one file of {path: text}, which is what `npm run pack` writes
 *
 * All three produce the same thing, so nothing downstream knows the difference.
 * ==========================================================================*/
import { Unzip, UnzipInflate, strFromU8 } from "fflate";
import { MAX_BYTES, MAX_FILES, MAX_ENTRY, kb, tooManyFiles, oversizedEntry, oversizedCourse } from "./intake-limits.js";

const TEXT = /\.(ya?ml|json|md|txt)$/i;
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
               gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };

const ext = p => (p.split(".").pop() || "").toLowerCase();

const b64 = bytes => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/* A folder zipped on any platform carries its own name on every entry, and a
   folder picked with webkitdirectory does too. Strip it, so "ma26600/" and a
   bare set of files produce the same map — and remember it, because it is the
   course id the reader chose by naming the folder. */
function splitPrefix(paths) {
  const parts = paths.map(p => p.split("/"));
  if (parts.some(p => p.length < 2)) return { prefix: "", id: "" };
  const first = parts[0][0];
  return parts.every(p => p[0] === first) ? { prefix: first + "/", id: first } : { prefix: "", id: "" };
}

const clean = p => p.replace(/^\.?\//, "").replace(/\\/g, "/");

/* Archives and pickers both carry entries a course has no use for, and some
   are actively hostile. Refuse rather than sanitise: a path trying to escape
   is not a mistake worth guessing the intent of. */
const junk = p => !p || p.endsWith("/") || /(^|\/)(\.|__MACOSX|node_modules)/.test(p);
const hostile = p => p.startsWith("/") || p.split("/").includes("..");

function build(entries) {
  const kept = entries.filter(e => !junk(clean(e.path)));
  for (const e of kept) if (hostile(clean(e.path))) throw new Error(`unsafe path: ${e.path}`);

  const { prefix, id } = splitPrefix(kept.map(e => clean(e.path)));
  const files = {};
  for (const e of kept) {
    const rel = clean(e.path).slice(prefix.length);
    if (!rel) continue;
    if (typeof e.text === "string") { files[rel] = e.text; continue; }
    if (TEXT.test(rel)) { files[rel] = strFromU8(e.bytes); continue; }
    const type = MIME[ext(rel)];
    if (type) files[rel] = `data:${type};base64,${b64(e.bytes)}`;
  }
  return { id, files };
}

/** A directory chosen with `webkitdirectory`, or any FileList with paths. */
export async function fromFolder(fileList) {
  /* A picker exposes sizes without reading contents. Check the entire
     selection first so even an oversized last file leaves every file unread. */
  const selected = [];
  let count = 0, total = 0;
  for (const f of fileList) {
    const path = f.webkitRelativePath || f.name;
    if (++count > MAX_FILES) throw new Error(tooManyFiles(count));
    if (f.size > MAX_ENTRY) throw new Error(oversizedEntry(path));
    total += f.size;
    if (total > MAX_BYTES) throw new Error(oversizedCourse(total));
    if (junk(clean(path))) continue;
    if (hostile(clean(path))) throw new Error(`unsafe path: ${path}`);
    selected.push({ f, path });
  }
  const entries = [];
  for (const { f, path } of selected) {
    entries.push(TEXT.test(path)
      ? { path, text: await f.text() }
      : { path, bytes: new Uint8Array(await f.arrayBuffer()) });
  }
  return build(entries);
}

/** A .zip of the course folder. */
export async function fromZip(file) {
  if (file.size > MAX_BYTES) throw new Error(`${kb(file.size)} exceeds the ${kb(MAX_BYTES)} limit`);
  const entries = [];
  let count = 0, declaredTotal = 0, actualTotal = 0;
  const limit = message => { const error = new Error(message); error.intakeLimit = true; throw error; };
  const unzip = new Unzip(entry => {
    const path = entry.name;
    if (++count > MAX_FILES) limit(tooManyFiles(count));
    const ignored = junk(clean(path));
    if (!ignored && hostile(clean(path))) throw new Error(`unsafe path: ${path}`);
    /* Local ZIP headers normally declare the uncompressed size. Reject it
       before starting inflation, then also count output for descriptor-based
       or dishonest headers. */
    if (entry.originalSize !== undefined) {
      if (entry.originalSize > MAX_ENTRY) limit(oversizedEntry(path));
      declaredTotal += entry.originalSize;
      if (declaredTotal > MAX_BYTES) limit(oversizedCourse(declaredTotal));
    }
    const chunks = [];
    let size = 0;
    entry.ondata = (error, bytes, final) => {
      if (error) throw error;
      if (bytes) {
        size += bytes.length;
        if (size > MAX_ENTRY) limit(oversizedEntry(path));
        actualTotal += bytes.length;
        if (actualTotal > MAX_BYTES) limit(oversizedCourse(actualTotal));
        if (!ignored) chunks.push(bytes);
      }
      if (final && !ignored) {
        const combined = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
        entries.push({ path, bytes: combined });
      }
    };
    entry.start();
  });
  unzip.register(UnzipInflate);
  const reader = file.stream().getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      unzip.push(value, false);
    }
    unzip.push(new Uint8Array(0), true);
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error.intakeLimit || /^unsafe path: /.test(error.message)) throw error;
    throw new Error(`could not read that zip: ${error.message}`);
  } finally {
    reader.releaseLock();
  }
  const out = build(entries);
  if (!out.id) out.id = file.name.replace(/\.zip$/i, "");
  return out;
}

/** One JSON file of {path: text}, as `npm run pack` writes. */
export async function fromJSON(file) {
  let files;
  try { files = JSON.parse(await file.text()); }
  catch { throw new Error("that file is not valid JSON"); }
  if (!files || typeof files !== "object" || Array.isArray(files))
    throw new Error("expected a map of file paths to text");
  for (const p of Object.keys(files)) if (hostile(p)) throw new Error(`unsafe path: ${p}`);
  return { id: file.name.replace(/\.course\.json$/, "").replace(/\.json$/, ""), files };
}
