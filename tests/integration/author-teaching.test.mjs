import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import * as YAML from "js-yaml";

const root = new URL("../..", import.meta.url).pathname;
for (const engine of ["tools", "plugin/scripts"])
for (const [mode, handoff] of [["single", "direct"], ["paired", "auto"], ["paired", "manual"]])
  test(`${engine} ${mode}/${handoff}: teaching plan, source packets, reading preview and clean completion`, () => {
    const ws = mkdtempSync(join(tmpdir(), "teaching-course-")), course = join(ws, "courses/probe");
    const load = path => YAML.load(readFileSync(path, "utf8"));
    const call = (...args) => spawnSync(process.execPath, [join(root, engine, "author.mjs"), args[0], "probe", ...args.slice(1)],
      { cwd: ws, encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws, AUTHOR_READER: join(ws, "reader.yaml") } });
    const run = (...args) => { const r = call(...args); assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout; };
    try {
      cpSync(join(root, "tests/fixtures/author-teaching"), course, { recursive: true });
      writeFileSync(join(ws, "reader.yaml"), "reader:\n  goal: Understand the synthetic examples\n  background: Arithmetic\n");
      run("begin", "--mode", mode, "--handoff", handoff, "--source", join(course, "sources/benchmark.md"));
      const catalog = load(join(ws, ".author/probe/sources/catalog.yaml"));
      const source = catalog.sources.find(s => s.path.endsWith("benchmark.md"));
      const planPath = join(course, "materials/plan.yaml"), plan = load(planPath);
      for (const [i, lesson] of plan.lessons.entries()) {
        const lines = [[9, 12], [16, 20], [24, 28]][i];
        const unit = source.units.find(u => {
          const span = /:lines (\d+)-(\d+)$/.exec(u.locator);
          return span && +span[1] <= lines[0] && +span[2] >= lines[1];
        });
        assert.ok(unit, "source span belongs to its actual heading unit");
        lesson.sources = [{ source: source.id, unit: unit.id, lines }];
      }
      for (const lesson of plan.lessons) delete lesson.sourceRefs;
      // A real assessment obligation exercises the finish, audit and pack gates.
      const familyPath = join(course, "categorize/families.yaml");
      const requiredFamily = { id: "required-dilution", disposition: "teach", assessmentRequired: true,
        sources: plan.lessons[0].sources, teach: ["s1-1"], questions: ["dilution-task"] };
      writeFileSync(familyPath, YAML.dump([requiredFamily]));
      plan.families = [requiredFamily.id]; plan.lessons[0].families = [requiredFamily.id];
      mkdirSync(join(course, "questions"));
      writeFileSync(join(course, "questions/types.yaml"), YAML.dump([{ id: "dilution-task", task: "Compute a diluted concentration",
        concept: "concentration-dilution", objectives: ["mix-concentration"], families: [requiredFamily.id],
        teach: ["s1-1"], practiceCritical: false }]));
      const originalUnitPath = join(course, "sections/01-mixing/1-dilution.yaml"), originalUnit = load(originalUnitPath);
      const question = originalUnit.quiz[0];
      writeFileSync(join(course, "questions/dilution.yaml"), YAML.dump([{ id: "q-required-dilution", typeId: "dilution-task",
        q: question.q, response: { kind: "number", value: question.response.value }, why: question.why, verified: true }]));
      originalUnit.quiz = ["q-required-dilution"]; originalUnit.blocks[1].family = requiredFamily.id;
      writeFileSync(originalUnitPath, YAML.dump(originalUnit));
      writeFileSync(planPath, YAML.dump(plan));
      run("write"); run("index"); run("batch");
      const task = load(join(ws, ".author/probe/batch.yaml"));
      assert.ok(task.shared_rules.length);
      const packet = load(task.tasks[0].packet);
      assert.ok(packet.teaching.reasoning);
      assert.ok(packet.outline.path);
      assert.ok(packet.sources?.[0]?.excerpt, JSON.stringify(packet.warnings));
      assert.ok(packet.contextSize.rules > 0);
      const validSources = plan.lessons[0].sources;
      plan.lessons[0].sources = [{ ...validSources[0], lines: [9, 999] }];
      writeFileSync(planPath, YAML.dump(plan));
      const invalidSpan = call("packet", "--phase", "write", "--sub", "s1-1");
      assert.notEqual(invalidSpan.status, 0);
      assert.match(invalidSpan.stdout, /resolve lesson source evidence before writing/);
      plan.lessons[0].sources = validSources;
      writeFileSync(planPath, YAML.dump(plan));
      assert.match(run("preview", "--sub", "s1-1"), /Composition preview/);
      const view = load(join(ws, ".author/probe/preview-s1-1.yaml"));
      const full = view.views[0].runs.flatMap(r => r.items).map(i => i.html || "").join("\n");
      assert.match(full, /2,000/);
      assert.ok(!full.includes("Notes-only"));
      // A standalone packet cannot borrow unfinished work assigned to another batch.
      plan.lessons[1].teaching.requires = ["concentration-dilution"];
      writeFileSync(planPath, YAML.dump(plan));
      const firstPath = join(course, "sections/01-mixing/1-dilution.yaml"), first = load(firstPath);
      const original = readFileSync(firstPath, "utf8");
      for (const block of first.blocks) delete block.introduces;
      writeFileSync(firstPath, YAML.dump(first));
      const blocked = call("packet", "--phase", "write", "--sub", "s2-1");
      if (handoff === "manual") {
        assert.equal(blocked.status, 0, blocked.stdout + blocked.stderr);
        const pending = load(join(ws, ".author/probe/packets/write-s2-1.yaml"));
        assert.equal(pending.prerequisiteEvidence[0].status, "planned");
        assert.equal(pending.prerequisiteEvidence[0].assigned, true);
      } else {
        assert.notEqual(blocked.status, 0); assert.match(blocked.stdout, /write prerequisite teaching first/);
      }
      writeFileSync(firstPath, original);
      delete plan.lessons[1].teaching.requires;
      writeFileSync(planPath, YAML.dump(plan));
      run("done", "--all");
      assert.match(run("status"), /stage: review/);
      run("screen");
      const reviewPath = join(ws, "review.yaml");
      writeFileSync(reviewPath, YAML.dump({ inventoryExceptions: { "dilution-task": {
        reason: "Synthetic source-routing regression uses one numeric task; this is not a mastery-readiness inventory." } } }));
      run("reviewed", "--all", "--report", reviewPath);
      assert.match(run("status"), /stage: finish/);
      run("finish");
      assert.match(run("status"), /stage: complete/);
      requiredFamily.assessmentRequired = false;
      writeFileSync(familyPath, YAML.dump([requiredFamily]));
      const pack = spawnSync(process.execPath, [join(root, engine, "pack.mjs"), "probe"],
        { cwd: ws, encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws } });
      assert.notEqual(pack.status, 0); assert.match(pack.stderr, /flag was cleared/);
      const audit = spawnSync(process.execPath, [join(root, engine, "audit-content.mjs"), "--profile", "publish", "probe"],
        { cwd: ws, encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws } });
      assert.notEqual(audit.status, 0); assert.match(audit.stdout, /flag was cleared/);
      requiredFamily.assessmentRequired = true;
      writeFileSync(familyPath, YAML.dump([requiredFamily]));
      const readyUnit = readFileSync(firstPath, "utf8"), missingTeaching = load(firstPath);
      delete missingTeaching.blocks[1].family;
      writeFileSync(firstPath, YAML.dump(missingTeaching));
      const packMissing = spawnSync(process.execPath, [join(root, engine, "pack.mjs"), "probe"],
        { cwd: ws, encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws } });
      assert.notEqual(packMissing.status, 0); assert.match(packMissing.stderr, /main-path block/);
      writeFileSync(firstPath, readyUnit);
      requiredFamily.sources = [{ source: source.id, unit: source.units[0].id }];
      writeFileSync(familyPath, YAML.dump([requiredFamily]));
      const headingOnly = spawnSync(process.execPath, [join(root, engine, "pack.mjs"), "probe"],
        { cwd: ws, encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws } });
      assert.notEqual(headingOnly.status, 0); assert.match(headingOnly.stderr, /source|heading/i);
    } finally { rmSync(ws, { recursive: true, force: true }); }
  });
