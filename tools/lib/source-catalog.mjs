import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync
} from "node:fs";
import { basename, dirname, extname, join, posix, resolve, sep } from "node:path";
import * as YAML from "js-yaml";
import { unzipSync } from "fflate";
import { SOURCE_FORMATS } from "./sources.mjs";

const EXTRACTOR_VERSION = 1;
const sha256 = value => createHash("sha256").update(value).digest("hex");
const within = (child, parent) => child === parent || child.startsWith(parent + sep);
const warning = {
  pdf: "PDF text extraction does not verify equations, diagrams, or reading order; inspect the original pages.",
  scanned: "No PDF text was extracted. Treat the pages as unresolved visual sources; empty extraction is not evidence of empty content.",
  slide: "Slide artwork or images require visual review of the original slide.",
  slideText: "Slide text extraction does not verify drawings, charts, SmartArt, layout, or visual reading order; inspect the original slide.",
  slideOrder: "Presentation order metadata was unavailable; slides are indexed in numeric filename order.",
  image: "Visual source requires review of the original image; no OCR was performed.",
  ppt: "Legacy .ppt extraction is unresolved. Convert a copy to .pptx or PDF with an available office application, then index that copy."
};

const sourceId = path => `source-${sha256(path).slice(0, 16)}`;
const unitId = (source, locator) => `unit-${sha256(`${source}\0${locator}`).slice(0, 16)}`;
const unitFile = source => `units/${source.id}.yaml`;

function formatOf(file) {
  if (file.format) return file.format;
  return SOURCE_FORMATS.get(extname(file.path || file).toLowerCase()) || "binary";
}

function safeFile(file) {
  const named = typeof file === "string" ? { path: file } : file;
  if (!named?.path) throw new Error("source entry has no path");
  const path = realpathSync(named.path);
  if (!statSync(path).isFile()) throw new Error(`source is not a file: ${path}`);
  if (named.root) {
    const root = realpathSync(named.root);
    if (!within(path, root)) throw new Error(`source escapes its registered root: ${named.path}`);
  }
  return { ...named, path, rel: named.rel || basename(path), format: formatOf({ ...named, path }) };
}

function exactTextUnits(source, raw) {
  const starts = [0];
  let offset = 0;
  let blank = false;
  for (const line of raw.split(/(?<=\n)/)) {
    if (offset && (/^\s{0,3}#{1,6}\s+\S/.test(line) || (blank && line.trim()))) starts.push(offset);
    blank = !line.trim();
    offset += line.length;
  }
  starts.push(raw.length);
  return starts.slice(0, -1).map((start, i) => {
    const end = starts[i + 1];
    const before = raw.slice(0, start);
    const lineStart = before ? (before.match(/\n/g) || []).length + 1 : 1;
    const text = raw.slice(start, end);
    const lineEnd = lineStart + (text.match(/\n/g) || []).length - (text.endsWith("\n") ? 1 : 0);
    const locator = `${source.path}:lines ${lineStart}-${Math.max(lineStart, lineEnd)}`;
    return { id: unitId(source.id, locator), locator, lineStart, lineEnd: Math.max(lineStart, lineEnd), text };
  });
}

function runPdf(source, options) {
  const exec = options.exec || execFileSync;
  let output;
  try {
    output = exec("pdftotext", ["-layout", source.path, "-"], {
      encoding: "utf8", timeout: options.timeout || 30_000, maxBuffer: Infinity,
      stdio: ["ignore", "pipe", "pipe"]
    });
    if (output && typeof output === "object" && "stdout" in output) output = output.stdout;
    output = Buffer.isBuffer(output) ? output.toString("utf8") : String(output ?? "");
  } catch (error) {
    const detail = error?.code === "ENOENT" ? "pdftotext is unavailable" : `pdftotext failed: ${error?.message || error}`;
    return { status: "unresolved", warnings: [detail, warning.scanned], units: [visualUnit(source, "PDF", `${detail}. ${warning.scanned}`)] };
  }
  const pages = output.replace(/\f$/, "").split("\f");
  if (!output.trim()) {
    return { status: "unresolved", warnings: [warning.scanned], units: [visualUnit(source, "page 1", warning.scanned)] };
  }
  let partial = false;
  const units = pages.map((text, i) => {
    const locator = `${source.path}:page ${i + 1}`;
    const unit = { id: unitId(source.id, locator), locator, lineStart: 1, lineEnd: lineCount(text), lineMode: "local", text, asset: source.path, warning: warning.pdf };
    if (!text.trim()) { unit.warning = `${warning.scanned} ${warning.pdf}`; partial = true; }
    return unit;
  });
  return { status: partial ? "partial" : "extracted", warnings: [warning.pdf], units };
}

function decodeXml(text) {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function xmlText(bytes) {
  if (!bytes) return "";
  const xml = new TextDecoder().decode(bytes);
  const runs = value => [...value.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>|<a:br\b[^>]*\/?\s*>|<a:tab\b[^>]*\/?\s*>/g)]
    .map(match => match[1] != null ? decodeXml(match[1]) : match[0].startsWith("<a:tab") ? "\t" : "\n").join("");
  const paragraphs = [...xml.matchAll(/<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g)]
    .map(m => runs(m[1])).filter(value => value !== "");
  return paragraphs.length ? paragraphs.join("\n") : runs(xml);
}

function lineCount(text) {
  return Math.max(1, text.split("\n").length - (text.endsWith("\n") ? 1 : 0));
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1], match[2] ?? match[3]]));
}

function relationships(bytes) {
  if (!bytes) return [];
  const xml = new TextDecoder().decode(bytes);
  return [...xml.matchAll(/<Relationship\b[^>]*>/g)].map(match => attributes(match[0]));
}

function zipTarget(from, target) {
  if (!target) return null;
  return target.startsWith("/") ? target.slice(1) : posix.normalize(posix.join(posix.dirname(from), target));
}

function orderedSlides(zip) {
  const presentation = zip["ppt/presentation.xml"];
  const relationList = relationships(zip["ppt/_rels/presentation.xml.rels"]);
  if (presentation && relationList.length) {
    const byId = new Map(relationList.map(rel => [rel.Id, zipTarget("ppt/presentation.xml", rel.Target)]));
    const xml = new TextDecoder().decode(presentation);
    const ordered = [...xml.matchAll(/<p:sldId\b[^>]*>/g)].map(match => byId.get(attributes(match[0])["r:id"]));
    if (ordered.length && ordered.every(name => name && zip[name])) return { slides: ordered, warned: false };
  }
  const slides = Object.keys(zip).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(/slide(\d+)/.exec(a)[1]) - Number(/slide(\d+)/.exec(b)[1]));
  return { slides, warned: true };
}

function runPptx(source) {
  try {
    const zip = unzipSync(new Uint8Array(readFileSync(source.path)));
    const ordered = orderedSlides(zip);
    const slides = ordered.slides;
    if (!slides.length) throw new Error("no slides were found in the presentation");
    const units = slides.map((name, position) => {
      const number = Number(/slide(\d+)/.exec(name)[1]);
      const slide = xmlText(zip[name]);
      const relName = `ppt/slides/_rels/slide${number}.xml.rels`;
      const rels = relationships(zip[relName]);
      const noteTarget = rels.find(rel => rel.Type?.endsWith("notesSlide"))?.Target;
      const noteName = zipTarget(name, noteTarget) || `ppt/notesSlides/notesSlide${number}.xml`;
      const notes = xmlText(zip[noteName]);
      const text = [slide, notes && `Notes:\n${notes}`].filter(Boolean).join("\n");
      const locator = `${source.path}:slide ${position + 1} (part ${number})`;
      const xml = new TextDecoder().decode(zip[name]);
      const hasImage = /<p:pic\b|<a:blip\b/.test(xml) || rels.some(rel => rel.Type?.endsWith("image"));
      const unit = { id: unitId(source.id, locator), locator, asset: source.path,
        warning: hasImage ? `${warning.slideText} ${warning.slide}` : warning.slideText };
      if (text) Object.assign(unit, { text, lineStart: 1, lineEnd: lineCount(text), lineMode: "local" });
      return unit;
    });
    const warnings = [warning.slideText, ...(ordered.warned ? [warning.slideOrder] : [])];
    return { status: "partial", warnings, units };
  } catch (error) {
    const detail = `PPTX extraction failed: ${error?.message || error}`;
    return { status: "unresolved", warnings: [detail], units: [visualUnit(source, "presentation", detail)] };
  }
}

function visualUnit(source, label, note) {
  const locator = `${source.path}:${label}`;
  return { id: unitId(source.id, locator), locator, asset: source.path, warning: note };
}

function extract(source, options) {
  if (source.format === "text") return { status: "extracted", warnings: [], units: exactTextUnits(source, readFileSync(source.path, "utf8")) };
  if (source.format === "pdf") return runPdf(source, options);
  if (source.format === "pptx") return runPptx(source);
  if (source.format === "ppt") return { status: "unresolved", warnings: [warning.ppt], units: [visualUnit(source, "presentation", warning.ppt)] };
  if (source.format === "image") return { status: "visual", warnings: [warning.image], units: [visualUnit(source, "image", warning.image)] };
  const note = `Unsupported binary source format: ${extname(source.path).toLowerCase() || "unknown"}`;
  return { status: "unresolved", warnings: [note], units: [visualUnit(source, "binary", note)] };
}

function loadCache(outDir) {
  const path = join(outDir, "catalog.yaml");
  if (!existsSync(path)) return new Map();
  try {
    const old = YAML.load(readFileSync(path, "utf8"));
    if (old?.extractorVersion !== EXTRACTOR_VERSION) return new Map();
    return new Map((old?.sources || []).map(source => [`${source.path}\0${source.hash}`, source]));
  } catch { return new Map(); }
}

function publicUnit(unit) {
  const { text: _text, lineStart: _start, lineEnd: _end, lineMode: _mode, ...descriptor } = unit;
  return descriptor;
}

export function indexSources(files, outDir, options = {}) {
  if (!Array.isArray(files)) throw new Error("indexSources files must be an array");
  const directory = resolve(outDir);
  mkdirSync(join(directory, "units"), { recursive: true });
  const cached = loadCache(directory);
  const seen = new Set();
  const sources = [];
  for (const input of files) {
    const file = safeFile(input);
    if (seen.has(file.path)) continue;
    seen.add(file.path);
    const bytes = readFileSync(file.path);
    const hash = sha256(bytes);
    const source = { id: sourceId(file.path), path: file.path, hash, format: file.format };
    const old = cached.get(`${file.path}\0${hash}`);
    const stored = old && join(directory, unitFile(old));
    let result;
    if (!options.refresh && old && existsSync(stored)) {
      try {
        const body = YAML.load(readFileSync(stored, "utf8"));
        if (body?.extractorVersion === EXTRACTOR_VERSION && body?.source === old.id && body?.path === file.path && body?.hash === hash && Array.isArray(body.units))
          result = { status: old.status, warnings: old.warnings || [], units: body.units };
      } catch { /* A damaged cache is rebuilt from the original source. */ }
    }
    if (!result) result = extract(source, options);
    const unitsPath = unitFile(source);
    writeFileSync(join(directory, unitsPath), YAML.dump({ version: 1, extractorVersion: EXTRACTOR_VERSION, source: source.id, path: source.path, hash, format: source.format, status: result.status, units: result.units }, { noRefs: true, lineWidth: -1 }));
    sources.push({ ...source, status: result.status, units: result.units.map(publicUnit), warnings: result.warnings });
  }
  const catalog = { version: 1, extractorVersion: EXTRACTOR_VERSION, directory, sources, warnings: sources.flatMap(source => source.warnings.map(message => `${source.id}: ${message}`)) };
  writeFileSync(join(directory, "catalog.yaml"), YAML.dump(catalog, { noRefs: true, lineWidth: -1 }));
  return catalog;
}

function catalogDirectory(catalog) {
  if (typeof catalog === "string") return catalog.endsWith(".yaml") ? dirname(resolve(catalog)) : resolve(catalog);
  return catalog?.directory;
}

export function readUnit(catalog, reference) {
  if (!reference?.source || !reference?.unit) throw new Error("unit reference requires source and unit IDs");
  let value = catalog;
  let directory = catalogDirectory(catalog);
  if (typeof catalog === "string") {
    const path = catalog.endsWith(".yaml") ? resolve(catalog) : join(resolve(catalog), "catalog.yaml");
    value = YAML.load(readFileSync(path, "utf8"));
    directory = resolve(path, "..");
  }
  if (!directory) throw new Error("catalog must be returned by indexSources or loaded from a catalog path");
  const source = value?.sources?.find(item => item.id === reference.source);
  if (!source) throw new Error(`unknown source: ${reference.source}`);
  const relativeFile = unitFile(source);
  const file = resolve(directory, relativeFile);
  if (!within(file, directory)) throw new Error(`unit file escapes catalog directory: ${relativeFile}`);
  let stale = false;
  try {
    const current = realpathSync(source.path);
    stale = current !== source.path || sha256(readFileSync(current)) !== source.hash;
  } catch { stale = true; }
  if (stale) {
    const descriptor = source.units.find(item => item.id === reference.unit);
    if (!descriptor) throw new Error(`unknown unit: ${reference.unit}`);
    return { reference, locator: descriptor.locator, ...(descriptor.asset ? { asset: descriptor.asset } : {}), warning: "Source changed or disappeared since indexing; re-index before reading this unit." };
  }
  const stored = YAML.load(readFileSync(file, "utf8"));
  if (stored?.extractorVersion !== EXTRACTOR_VERSION || stored?.source !== source.id || stored?.hash !== source.hash)
    throw new Error(`unit cache does not match source: ${source.id}`);
  const unit = stored.units?.find(item => item.id === reference.unit);
  if (!unit) throw new Error(`unknown unit: ${reference.unit}`);
  let text = unit.text;
  let locator = unit.locator;
  if (reference.lines) {
    if (!Array.isArray(reference.lines) || reference.lines.length !== 2 || !reference.lines.every(Number.isInteger))
      throw new Error("reference lines must be [start, end]");
    if (text == null || unit.lineStart == null) throw new Error("line narrowing is only available for text units");
    const [start, end] = reference.lines;
    if (start < unit.lineStart || end < start || end > unit.lineEnd) throw new Error(`line range is outside ${unit.locator}`);
    const lines = text.split(/(?<=\n)/);
    text = lines.slice(start - unit.lineStart, end - unit.lineStart + 1).join("");
    locator = unit.lineMode === "local" ? `${unit.locator}:lines ${start}-${end}` : `${source.path}:lines ${start}-${end}`;
  }
  return { reference, locator, ...(text != null ? { text } : {}), ...(unit.asset ? { asset: unit.asset } : {}), ...(unit.warning ? { warning: unit.warning } : {}) };
}
