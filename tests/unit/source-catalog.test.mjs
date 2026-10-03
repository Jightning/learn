import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as YAML from "js-yaml";
import { zipSync } from "fflate";
import { indexSources, readUnit } from "../../tools/lib/source-catalog.mjs";
import { list } from "../../tools/lib/sources.mjs";

const encoder = new TextEncoder();
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "source-catalog-"));
  const sourcePath = join(root, "sources");
  const catalog = join(root, "catalog");
  mkdirSync(sourcePath);
  const sources = realpathSync(sourcePath);
  return { root, sources, catalog };
};

const withFixture = (name, fn) => test(name, t => {
  const dirs = fixture();
  t.after(() => rmSync(dirs.root, { recursive: true, force: true }));
  return fn(dirs);
});

withFixture("markdown units preserve every byte and readUnit narrows exact source lines", ({ sources, catalog }) => {
  const path = join(sources, "notes.md");
  const raw = "preface\n\n# First\nalpha\nbeta\n\n## Second\nfigure detail\n";
  writeFileSync(path, raw);
  const indexed = indexSources(list([sources]), catalog);
  assert.equal(indexed.sources[0].units.some(unit => "text" in unit), false);
  const publicCatalog = YAML.load(readFileSync(join(catalog, "catalog.yaml"), "utf8"));
  assert.equal(publicCatalog.directory, catalog);
  assert.equal(publicCatalog.sources[0].units.some(unit => "text" in unit), false);
  const stored = YAML.load(readFileSync(join(catalog, "units", `${indexed.sources[0].id}.yaml`), "utf8"));
  assert.equal(stored.units.map(unit => unit.text).join(""), raw);

  const first = stored.units.find(unit => unit.text.startsWith("# First"));
  assert.deepEqual(readUnit(indexed, { source: indexed.sources[0].id, unit: first.id, lines: [4, 5] }), {
    reference: { source: indexed.sources[0].id, unit: first.id, lines: [4, 5] },
    locator: `${path}:lines 4-5`, text: "alpha\nbeta\n"
  });
  assert.equal(readUnit(join(catalog, "catalog.yaml"), { source: indexed.sources[0].id, unit: first.id }).text,
    "# First\nalpha\nbeta\n\n");
  assert.equal(readUnit(publicCatalog, { source: indexed.sources[0].id, unit: first.id }).text,
    "# First\nalpha\nbeta\n\n");
});

withFixture("PDF extraction uses layout mode and splits exact pages", ({ sources, catalog }) => {
  const path = join(sources, "book.pdf");
  writeFileSync(path, Buffer.from("pdf fixture"));
  let call;
  const indexed = indexSources(list([sources]), catalog, { exec(command, args, options) {
    call = { command, args, options };
    return "row one\nrow two\n\fpage two\n\f";
  } });
  assert.equal(call.command, "pdftotext");
  assert.deepEqual(call.args, ["-layout", path, "-"]);
  assert.equal(indexed.sources[0].status, "extracted");
  assert.deepEqual(indexed.sources[0].units.map(unit => unit.locator), [`${path}:page 1`, `${path}:page 2`]);
  const read = readUnit(indexed, { source: indexed.sources[0].id, unit: indexed.sources[0].units[1].id });
  assert.equal(read.text, "page two\n");
  assert.equal(read.asset, path);
  const narrowed = readUnit(indexed, { source: indexed.sources[0].id, unit: indexed.sources[0].units[0].id, lines: [2, 2] });
  assert.equal(narrowed.text, "row two\n");
  assert.equal(narrowed.locator, `${path}:page 1:lines 2-2`);
  assert.match(indexed.sources[0].warnings[0], /does not verify equations, diagrams/);
});

withFixture("missing PDF extractor and scanned PDF output remain explicitly unresolved", ({ sources, catalog }) => {
  const missing = join(sources, "missing.pdf");
  writeFileSync(missing, "not a real pdf");
  const unavailable = indexSources(list([sources]), catalog, { exec() {
    const error = new Error("spawn pdftotext ENOENT");
    error.code = "ENOENT";
    throw error;
  } });
  assert.equal(unavailable.sources[0].status, "unresolved");
  assert.match(unavailable.sources[0].warnings.join(" "), /unavailable/);
  assert.match(unavailable.sources[0].warnings.join(" "), /not evidence of empty content/);

  let refreshed = 0;
  const resolved = indexSources(list([sources]), catalog, { refresh: true, exec: () => { refreshed++; return "now extracted"; } });
  assert.equal(refreshed, 1);
  assert.equal(resolved.sources[0].status, "extracted");

  rmSync(catalog, { recursive: true });
  const scanned = indexSources(list([sources]), catalog, { exec: () => "\f" });
  assert.equal(scanned.sources[0].status, "unresolved");
  assert.match(scanned.sources[0].units[0].warning, /unresolved visual sources/);
});

withFixture("PPTX text and notes follow slide order and image slides require visual review", ({ sources, catalog }) => {
  const path = join(sources, "lecture.pptx");
  writeFileSync(path, zipSync({
    "ppt/presentation.xml": encoder.encode('<p:presentation><p:sldIdLst><p:sldId r:id="rSecond"/><p:sldId r:id="rFirst"/></p:sldIdLst></p:presentation>'),
    "ppt/_rels/presentation.xml.rels": encoder.encode('<Relationships><Relationship Id="rFirst" Type="slide" Target="slides/slide1.xml"/><Relationship Id="rSecond" Type="slide" Target="slides/slide2.xml"/></Relationships>'),
    "ppt/slides/slide2.xml": encoder.encode("<p:sld><a:p><a:r><a:t>Sec</a:t></a:r><a:r><a:t>ond</a:t></a:r></a:p></p:sld>"),
    "ppt/slides/slide1.xml": encoder.encode("<p:sld><a:p><a:r><a:t>First </a:t></a:r><a:r><a:t>&amp; exact</a:t></a:r></a:p><p:pic><a:blip/></p:pic></p:sld>"),
    "ppt/slides/_rels/slide1.xml.rels": encoder.encode('<Relationships><Relationship Id="notes" Type="notesSlide" Target="/ppt/notesSlides/notesSlide7.xml"/><Relationship Id="pic" Type="image" Target="../media/image1.png"/></Relationships>'),
    "ppt/notesSlides/notesSlide7.xml": encoder.encode("<p:notes><a:p><a:r><a:t>Speaker </a:t></a:r><a:r><a:t>note</a:t></a:r></a:p></p:notes>"),
    "ppt/media/image1.png": new Uint8Array([1, 2, 3])
  }));
  const indexed = indexSources(list([sources]), catalog);
  const source = indexed.sources[0];
  assert.equal(source.status, "partial");
  assert.deepEqual(source.units.map(unit => unit.locator), [`${path}:slide 1 (part 2)`, `${path}:slide 2 (part 1)`]);
  assert.doesNotMatch(source.warnings.join(" "), /numeric filename order/);
  const first = readUnit(indexed, { source: source.id, unit: source.units[1].id });
  assert.equal(first.text, "First & exact\nNotes:\nSpeaker note");
  assert.equal(first.asset, path);
  assert.match(first.warning, /visual review/);
  const note = readUnit(indexed, { source: source.id, unit: source.units[1].id, lines: [2, 3] });
  assert.equal(note.text, "Notes:\nSpeaker note");
  assert.equal(note.locator, `${path}:slide 2 (part 1):lines 2-3`);
});

withFixture("images are visual units and legacy presentations remain unresolved", ({ sources, catalog }) => {
  const image = join(sources, "diagram.svg");
  const legacy = join(sources, "slides.ppt");
  writeFileSync(image, "<svg><text>Do not claim OCR</text></svg>");
  writeFileSync(legacy, "legacy binary");
  const files = list([sources]);
  assert.equal(files.find(file => file.path === image).text, false);
  assert.equal(files.find(file => file.path === image).doc, false);
  assert.equal(files.find(file => file.path === image).format, "image");
  assert.equal(files.find(file => file.path === legacy).format, "ppt");
  const indexed = indexSources(files, catalog);
  const visual = indexed.sources.find(source => source.path === image);
  const ppt = indexed.sources.find(source => source.path === legacy);
  assert.equal(visual.status, "visual");
  assert.match(visual.warnings[0], /no OCR/);
  assert.equal(ppt.status, "unresolved");
  assert.match(ppt.warnings[0], /Convert a copy to \.pptx or PDF/);
});

withFixture("duplicate source entries collapse and unchanged hashes reuse extraction cache", ({ sources, catalog }) => {
  const path = join(sources, "book.pdf");
  writeFileSync(path, "pdf fixture");
  const file = list([sources])[0];
  let calls = 0;
  const first = indexSources([file, file], catalog, { exec: () => { calls++; return "cached page"; } });
  const second = indexSources([file], catalog, { exec: () => { calls++; throw new Error("must not run"); } });
  assert.equal(first.sources.length, 1);
  assert.equal(second.sources.length, 1);
  assert.equal(calls, 1);
  assert.equal(second.sources[0].id, first.sources[0].id);
});

withFixture("source and unaffected unit IDs remain stable across content changes", ({ sources, catalog }) => {
  const path = join(sources, "notes.md");
  writeFileSync(path, "# First\none\n\n# Stable\nkeep\n");
  const first = indexSources(list([sources]), catalog);
  const stable = first.sources[0].units.find(unit => unit.locator.endsWith("lines 4-5"));
  writeFileSync(path, "# First\ntwo\n\n# Stable\nkeep\n");
  const second = indexSources(list([sources]), catalog);
  assert.equal(second.sources[0].id, first.sources[0].id);
  assert.equal(second.sources[0].units.find(unit => unit.locator.endsWith("lines 4-5")).id, stable.id);
  assert.notEqual(second.sources[0].hash, first.sources[0].hash);
});

withFixture("readUnit refuses cached text after the original source changes", ({ sources, catalog }) => {
  const path = join(sources, "notes.txt");
  writeFileSync(path, "original\n");
  const indexed = indexSources(list([sources]), catalog);
  writeFileSync(path, "changed\n");
  const read = readUnit(indexed, { source: indexed.sources[0].id, unit: indexed.sources[0].units[0].id });
  assert.equal(read.text, undefined);
  assert.match(read.warning, /Source changed or disappeared since indexing/);
});
