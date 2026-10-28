import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as YAML from "js-yaml";
import { parseCourse } from "../../src/lib/parse.js";
import { loadCourse } from "../../tools/lib/load.mjs";
import { courseFiles } from "../../tools/lib/files.mjs";
import { strictCurrentIssues } from "../../tools/lib/current-schema.mjs";
import { importCourse, filesOf, removeCourse } from "../../src/lib/courses.js";
import { masteryCourseFiles } from "../fixtures/mastery/course.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const write = (dir, files) => {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), text);
  }
};
const edit = (files, path, fn) => {
  const value = JSON.parse(files[path]); fn(value); files[path] = JSON.stringify(value);
};
const parsed = files => {
  const result = parseCourse(files);
  assert.deepEqual(result.errors, []);
  return result.course;
};
const run = (workspace, tool, args) => spawnSync(process.execPath, [join(ROOT, "tools", tool), ...args, "--workspace", workspace], { cwd: ROOT, encoding: "utf8" });

test("CLI, browser, pack, import and unpack retain identical mastery indexes and external references", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "mastery-loading-"));
  try {
    const files = masteryCourseFiles(), dir = join(workspace, "courses", "pilot");
    write(dir, files);
    // Private material belongs to a separate evaluator package, outside courses/.
    write(workspace, { "evaluator/private-tests.json": '{"secret":"DO-NOT-DISTRIBUTE"}', "evaluator/issuer.key": "PRIVATE-KEY" });
    const disk = loadCourse(dir), browser = parsed(files);
    assert.deepEqual(disk.errors, []);
    assert.deepEqual(browser.mastery, disk.course.mastery);
    assert.deepEqual(browser.activityIndex, disk.course.activityIndex);
    assert.deepEqual(strictCurrentIssues(disk.course), []);
    const pack = run(workspace, "pack.mjs", ["pilot"]);
    assert.equal(pack.status, 0, pack.stdout + pack.stderr);
    const packedPath = join(workspace, "packed/pilot.course.json"), text = readFileSync(packedPath, "utf8"), packed = JSON.parse(text);
    assert.doesNotMatch(text, /DO-NOT-DISTRIBUTE|PRIVATE-KEY|private-tests|issuer.key/);
    assert.deepEqual(packed, courseFiles(dir, msg => { throw new Error(msg); }));
    const imported = await importCourse("mastery-loading-pilot", packed);
    assert.equal(imported.ok, true, imported.errors.join("\n"));
    assert.deepEqual(imported.course.activityIndex, browser.activityIndex);
    assert.deepEqual(filesOf("mastery-loading-pilot"), files);
    assert.equal(imported.course.activityIndex.activities.lab.lab.url, "https://example.invalid/ledger-v1.zip");
    assert.equal(imported.course.activityIndex.activities["future-audio"].availability, "unavailable");
    assert.deepEqual(imported.course.mastery.manifest.unavailable.map(x => x.id), ["adapter.audio", "adapter.trusted-evaluation"]);
    assert.equal(run(workspace, "unpack.mjs", [packedPath, "restored"]).status, 0);
    const restored = loadCourse(join(workspace, "courses/restored"));
    assert.deepEqual(restored.errors, []);
    assert.deepEqual(restored.course.mastery, browser.mastery);
    assert.deepEqual(restored.course.activityIndex, browser.activityIndex);
  } finally { await removeCourse("mastery-loading-pilot"); rmSync(workspace, { recursive: true, force: true }); }
});

for (const [name, change, pattern] of [
  ["unsupported required schema", f => edit(f, "mastery/manifest.json", m => { m.schemaVersion = 2; }), /unsupported schemaVersion/],
  ["unsupported target schema", f => edit(f, "mastery/targets.json", d => { d.schemaVersion = 2; }), /unsupported schemaVersion/],
  ["unsupported required capability", f => edit(f, "mastery/manifest.json", m => { m.required["adapter.external-submission"] = 2; }), /unsupported required capability/],
  ["missing document", f => { delete f["mastery/targets.json"]; }, /targets.*required document/],
  ["duplicate document", f => { f["mastery/targets.yaml"] = f["mastery/targets.json"]; }, /duplicate mastery targets/],
  ["malformed document", f => { f["mastery/targets.json"] = "{"; }, /mastery\/targets.json:/],
  ["dangling reference", f => edit(f, "mastery/activities.json", d => { d.activities[0].question = "missing"; }), /unknown or misplaced question/],
  ["missing declared collection", f => { delete f["mastery/activities.json"]; }, /declared collection is missing/],
  ["embedded executable", f => { f["mastery/run.py"] = "print('no')"; }, /unsupported mastery file/],
  ["private fixture inside course", f => { f["assets/private/tests.json"] = '{"secret":true}'; }, /outside the course tree/],
  ["competing activity manifest", f => edit(f, "mastery/activities.json", d => { d.manifest = {}; }), /shared mastery\/manifest/],
  ["injected normalized metadata", f => edit(f, "course.json", d => { d.mastery = { certified: true }; }), /mastery is derived/]
]) test(`both loaders fail closed: ${name}`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "mastery-invalid-"));
  try {
    const files = masteryCourseFiles(); change(files); write(dir, files);
    for (const result of [loadCourse(dir), parseCourse(files)]) {
      assert.match(result.errors.join("\n"), pattern);
      assert.equal(result.course.mastery, undefined);
      assert.equal(result.course.activityIndex, undefined);
    }
    const imported = await importCourse("invalid-pilot", files);
    assert.equal(imported.ok, false); assert.match(imported.errors.join("\n"), pattern);
    assert.equal(filesOf("invalid-pilot"), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("pack refuses unsupported versions and in-tree private evaluator data", () => {
  const workspace = mkdtempSync(join(tmpdir(), "mastery-pack-invalid-"));
  try {
    const files = masteryCourseFiles(), dir = join(workspace, "courses/pilot");
    edit(files, "mastery/manifest.json", m => { m.required["mastery.targets"] = 2; });
    write(dir, files);
    const unsupported = run(workspace, "pack.mjs", ["pilot"]);
    assert.equal(unsupported.status, 1); assert.match(unsupported.stderr, /unsupported required capability/);
    write(dir, masteryCourseFiles());
    write(dir, { "private/checks.json": '{"private":true}' });
    const privatePack = run(workspace, "pack.mjs", ["pilot"]);
    assert.equal(privatePack.status, 1); assert.match(privatePack.stderr, /outside the course tree/);
    assert.throws(() => courseFiles(dir, msg => { throw new Error(msg); }), /outside the course tree/);
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});

test("YAML documents and root/policy-only opt-in share the same contract", () => {
  const files = masteryCourseFiles(), full = parsed(files);
  for (const path of Object.keys(files).filter(p => p.startsWith("mastery/"))) {
    files[path.replace(/json$/, "yaml")] = YAML.dump(JSON.parse(files[path])); delete files[path];
  }
  assert.deepEqual(parsed(files).activityIndex, full.activityIndex);
  delete files["mastery/activities.yaml"];
  files["mastery/manifest.yaml"] = YAML.dump({ schemaVersion: 1, required: { "mastery.targets": 1, "mastery.policies": 1 } });
  assert.equal(parsed(files).activityIndex, null);
});

test("legacy course loads identically with no mastery state or signature side effects", () => {
  const dir = join(ROOT, "tests/fixtures/audit-incomplete");
  const files = courseFiles(dir, msg => { throw new Error(msg); });
  const disk = loadCourse(dir), browser = parsed(files);
  assert.deepEqual(disk.errors, []);
  assert.equal(browser.mastery, undefined); assert.equal(disk.course.mastery, undefined);
  assert.deepEqual(browser.questionBank, disk.course.questionBank);
  assert.deepEqual(browser.sections, disk.course.sections);
});

test("organization, help, importance and target-R edits preserve activity evidence signatures", () => {
  const files = masteryCourseFiles(), before = parsed(files);
  files["sections/01-ledger/2-help.json"] = JSON.stringify({ title: "Help", blocks: [], quiz: [] });
  edit(files, "questions/skills.json", s => { s[0].teach = ["s1-2"]; s[0].importance = 7; });
  edit(files, "mastery/targets.json", d => { d.roots[0].importance = 9; d.roots[0].label = "New label"; });
  edit(files, "mastery/activities.json", d => { d.activities.reverse(); d.activities.forEach(a => { a.lesson = "s1-2"; a.wave = 2; }); });
  const after = parsed(files);
  for (const [id, activity] of Object.entries(before.activityIndex.activities)) {
    for (const field of ["contentSignature", "evidenceSignature", "rubricSignature"]) assert.equal(after.activityIndex.activities[id][field], activity[field], `${id} ${field}`);
  }
  assert.notEqual(after.mastery.organizationSignature, before.mastery.organizationSignature);
  assert.notEqual(after.mastery.rootWeights.simple, before.mastery.rootWeights.simple);
  // R may select a different already-defined anchor without rewriting old ones.
  edit(files, "mastery/targets.json", d => {
    const root = d.roots[0]; root.anchors.push({ ...root.anchors[0], level: 2 });
    root.facets[0].anchors.push({ ...root.facets[0].anchors[0], level: 2 });
    root.requiredAnchor = 2;
  });
  const lower = parsed(files);
  edit(files, "mastery/targets.json", d => { d.roots[0].requiredAnchor = 3; });
  const raised = parsed(files);
  assert.equal(raised.mastery.roots.simple.contentSignature, lower.mastery.roots.simple.contentSignature);
  assert.equal(raised.activityIndex.activities.lab.evidenceSignature, lower.activityIndex.activities.lab.evidenceSignature);
});

test("explicit content/evidence/rubric versions participate without reusing old compatibility identities", () => {
  for (const [version, changed, same] of [
    ["contentVersion", "contentSignature", "rubricSignature"],
    ["evidenceVersion", "evidenceSignature", "contentSignature"],
    ["rubricVersion", "rubricSignature", "evidenceSignature"]
  ]) {
    const files = masteryCourseFiles(), before = parsed(files);
    edit(files, "mastery/activities.json", d => { d.activities[0][version]++; });
    const after = parsed(files);
    assert.notEqual(after.activityIndex.activities.ordinary[changed], before.activityIndex.activities.ordinary[changed]);
    assert.equal(after.activityIndex.activities.ordinary[same], before.activityIndex.activities.ordinary[same]);
    assert.deepEqual(after.activityIndex.activities.lab, before.activityIndex.activities.lab);
  }
});

for (const [name, change, changed, unchanged] of [
  ["question answer", f => edit(f, "questions/bank.json", q => { q[0].response.value = 6; }), ["ordinary", "repair", "delayed"], ["lab", "defense"]],
  ["package fixture hash", f => edit(f, "mastery/activities.json", d => { d.activities.find(a => a.id === "lab").lab.sha256 = "1".repeat(64); }), ["lab"], ["ordinary", "defense"]],
  ["target capability", f => edit(f, "mastery/targets.json", d => { d.roots[0].facets[0].anchors[0].standard = "Defend changed behavior"; }), ["ordinary", "lab", "defense"], []]
]) test(`semantic signatures follow only affected activities: ${name}`, () => {
  const files = masteryCourseFiles(), before = parsed(files); change(files); const after = parsed(files);
  for (const id of changed) assert.notEqual(after.activityIndex.activities[id].contentSignature, before.activityIndex.activities[id].contentSignature, id);
  for (const id of unchanged) assert.equal(after.activityIndex.activities[id].evidenceSignature, before.activityIndex.activities[id].evidenceSignature, id);
});

test("assistance/group revisions change evidence; rubric revisions change only the applicable rubric", () => {
  const files = masteryCourseFiles(), before = parsed(files);
  edit(files, "mastery/activities.json", d => { const a = d.activities[0]; a.support = "reference"; a.group = "new"; a.evidenceVersion++; });
  const evidence = parsed(files);
  assert.equal(evidence.activityIndex.activities.ordinary.contentSignature, before.activityIndex.activities.ordinary.contentSignature);
  assert.notEqual(evidence.activityIndex.activities.ordinary.evidenceSignature, before.activityIndex.activities.ordinary.evidenceSignature);
  edit(files, "mastery/policies.json", d => { d.policies[0].criteria[0].standard = "Revised rubric"; });
  const rubric = parsed(files);
  assert.notEqual(rubric.activityIndex.activities.lab.rubricSignature, before.activityIndex.activities.lab.rubricSignature);
  assert.equal(rubric.activityIndex.activities.lab.contentSignature, before.activityIndex.activities.lab.contentSignature);
  assert.equal(rubric.activityIndex.activities.lab.evidenceSignature, before.activityIndex.activities.lab.evidenceSignature);
  assert.equal(rubric.mastery.roots.advanced.rubricSignature, before.mastery.roots.advanced.rubricSignature);
});
