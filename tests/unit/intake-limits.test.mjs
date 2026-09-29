import test from "node:test";
import assert from "node:assert/strict";
import { zipSync } from "fflate";
import { fromFolder, fromZip } from "../../src/lib/intake.js";

const MB = 1024 * 1024;
const zipFile = entries => new File([zipSync(entries)], "course.zip");
const folderFile = (name, size, read) => ({
  name, webkitRelativePath: `course/${name}`, size,
  text: read, arrayBuffer: read
});

test("a valid ZIP still imports text and images under its folder name", async () => {
  const course = await fromZip(zipFile({
    "course/course.yaml": new TextEncoder().encode("title: Test\n"),
    "course/assets/dot.png": new Uint8Array([1, 2, 3])
  }));
  assert.equal(course.id, "course");
  assert.equal(course.files["course.yaml"], "title: Test\n");
  assert.equal(course.files["assets/dot.png"], "data:image/png;base64,AQID");
});

test("a highly compressible ZIP entry is refused before inflation", async () => {
  const file = zipFile({ "course/course.yaml": new Uint8Array(2 * MB + 1) });
  assert.ok(file.size < MB);
  await assert.rejects(fromZip(file), /entry "course\/course.yaml" is larger than 2048KB/);
});

test("ZIP output is bounded even when a local header understates its size", async () => {
  const bytes = zipSync({ "course/course.yaml": new Uint8Array(2 * MB + 1) });
  new DataView(bytes.buffer, bytes.byteOffset).setUint32(22, 1, true);
  await assert.rejects(fromZip(new File([bytes], "course.zip")),
    /entry "course\/course.yaml" is larger than 2048KB/);
});

test("ZIP total uncompressed size and entry count are bounded", async () => {
  const large = Object.fromEntries(Array.from({ length: 5 }, (_, i) =>
    [`course/${i}.txt`, new Uint8Array(1800 * 1024)]));
  await assert.rejects(fromZip(zipFile(large)), /that course is 9000KB; the limit is 8192KB/);

  const many = Object.fromEntries(Array.from({ length: 501 }, (_, i) =>
    [`course/${i}.txt`, new Uint8Array(1)]));
  await assert.rejects(fromZip(zipFile(many)), /too many files \(501\); the limit is 500/);
});

test("ignored ZIP metadata still counts toward intake limits", async () => {
  const file = zipFile({ "course/.cache/large.txt": new Uint8Array(2 * MB + 1) });
  await assert.rejects(fromZip(file), /entry "course\/\.cache\/large.txt" is larger than 2048KB/);
});

test("oversized folder selection is refused before reading any contents", async () => {
  let reads = 0;
  const read = () => { reads++; throw new Error("content was read"); };
  const files = [folderFile("course.yaml", 1, read), folderFile("big.txt", 2 * MB + 1, read)];
  await assert.rejects(fromFolder(files), /entry "course\/big.txt" is larger than 2048KB/);
  assert.equal(reads, 0);
});

test("folder total size and entry count are checked before reading", async () => {
  let reads = 0;
  const read = () => { reads++; throw new Error("content was read"); };
  const large = Array.from({ length: 5 }, (_, i) => folderFile(`${i}.txt`, 1800 * 1024, read));
  await assert.rejects(fromFolder(large), /that course is 9000KB; the limit is 8192KB/);
  const many = Array.from({ length: 501 }, (_, i) => folderFile(`${i}.txt`, 1, read));
  await assert.rejects(fromFolder(many), /too many files \(501\); the limit is 500/);
  assert.equal(reads, 0);
});

test("ignored folder files still count before any read", async () => {
  let reads = 0;
  const read = () => { reads++; throw new Error("content was read"); };
  await assert.rejects(fromFolder([folderFile(".cache/large.txt", 2 * MB + 1, read)]),
    /entry "course\/\.cache\/large.txt" is larger than 2048KB/);
  assert.equal(reads, 0);
});
