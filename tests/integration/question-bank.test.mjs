import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { parseCourse } from "../../src/lib/parse.js";
import { loadCourse } from "../../tools/lib/load.mjs";
import { buildIndex } from "../../src/lib/index.js";
test("disk, deployed/import file map and packed roundtrip derive the same bank", () => {
  const files = {
    "course.json": JSON.stringify({ code: "fixture", concepts: { c: { term: "Concept" } } }),
    "categorize/objectives.json": JSON.stringify([{ id: "o", title: "Outcome" }]),
    "categorize/families.json": JSON.stringify([{ id: "f", title: "Family" }]),
    "sections/01-one/1-lesson.json": JSON.stringify({ title: "Lesson", blocks: [], quiz: ["q"] }),
    "questions/types.json": JSON.stringify([{ id: "t", task: "Explain", concept: "c", objectives: ["o"], families: ["f"] }]),
    "questions/variants.json": JSON.stringify([{ id: "q", typeId: "t", q: "Explain", response: { kind: "self", model: "Use the definition" }, verified: true }, { id: "check", typeId: "t", q: "Apply", use: "check", response: { kind: "self", model: "Explain each step" }, verified: true }]),
    "questions/assessment.json": JSON.stringify([{ scope: "s1", criteria: "Explain and apply" }])
  };
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const unpackId = `question-bank-roundtrip-${process.pid}`;
  const dir = mkdtempSync(join(tmpdir(), "bank-fixture-"));
  try {
    for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), text); }
    const workspace = join(dir, "workspace"), sourceDir = join(workspace, "courses", "fixture");
    for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(sourceDir, path)), { recursive: true }); writeFileSync(join(sourceDir, path), text); }
    const pack = spawnSync(process.execPath, [join(root, "tools/pack.mjs"), "fixture", "--workspace", workspace], { cwd: root, encoding: "utf8" });
    assert.equal(pack.status, 0, pack.stderr);
    const packedFile = join(workspace, "packed", "fixture.course.json");
    const unpack = spawnSync(process.execPath, [join(root, "tools/unpack.mjs"), packedFile, unpackId, "--workspace", workspace], { cwd: root, encoding: "utf8" });
    assert.equal(unpack.status, 0, unpack.stderr);
    const unpacked = loadCourse(join(workspace, "courses", unpackId));
    assert.deepEqual(unpacked.errors, []);
    const disk = loadCourse(dir), browser = parseCourse(files), packed = parseCourse(JSON.parse(readFileSync(packedFile, "utf8")));
    assert.deepEqual(disk.errors, []); assert.deepEqual(browser.errors, []);
    for (const C of [browser.course, packed.course, unpacked.course]) {
      assert.deepEqual(C.questionBank, disk.course.questionBank);
      assert.deepEqual(C.assessmentBlueprints, disk.course.assessmentBlueprints);
      assert.deepEqual(buildIndex(C).QALL, buildIndex(disk.course).QALL);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("disk teaching exceptions require matching accepted type content and never travel in packs", () => {
  const root = mkdtempSync(join(tmpdir(), "bank-exception-"));
  const dir = join(root, "courses", "fixture");
  const type = { id: "t", task: "Perform an externally taught task", concept: "c", objectives: ["o"], families: ["f"], scope: ["course"] };
  const files = {
    "course.json": JSON.stringify({ code: "fixture", concepts: { c: {} } }),
    "categorize/objectives.json": JSON.stringify([{ id: "o" }]),
    "categorize/families.json": JSON.stringify([{ id: "f" }]),
    "sections/01-one/1-lesson.json": JSON.stringify({ title: "Lesson", blocks: [], quiz: [] }),
    "questions/types.json": JSON.stringify([type]),
    "questions/bank.json": JSON.stringify([{ id: "q", typeId: "t", q: "Perform", response: { kind: "self", model: "Compare with rubric" }, verified: true }])
  };
  try {
    for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), text); }
    const reviewPath = join(root, ".author", "fixture", "review.yaml");
    mkdirSync(dirname(reviewPath), { recursive: true });
    const review = { status: "accepted", accepted: { entries: [{ id: "type-t", kind: "question-type", content: type, hash: "current-type-hash" }] }, exceptionVersions: { t: "current-type-hash" }, exceptions: { t: { kind: "assessment-only", reason: "External authentic task; rubric and prerequisite course reviewed." } } };
    writeFileSync(reviewPath, JSON.stringify(review));
    assert.equal(loadCourse(dir).course.questionTypes.t.teachingStatus, "reviewed-exception");
    assert.equal(parseCourse(files).course.questionTypes.t.teachingStatus, "unreviewed-exception");
    type.task = "Changed task";
    writeFileSync(join(dir, "questions/types.json"), JSON.stringify([type]));
    assert.equal(loadCourse(dir).course.questionTypes.t.teachingStatus, "unreviewed-exception");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
