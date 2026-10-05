import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import * as YAML from "js-yaml";

const root = resolve(new URL("../..", import.meta.url).pathname);
for (const bank of [false, true]) for (const engine of ["tools", "plugin/scripts"]) for (const [mode, handoff] of [["single", "direct"], ["paired", "auto"], ["paired", "manual"]])
  test(`${engine}: ${mode}/${handoff} ${bank ? "bank" : "inline"} consolidated ID review, actual-delta recheck and finish gate`, () => {
    const ws = mkdtempSync(join(tmpdir(), "review-cli-")), course = join(ws, "courses/probe"), state = join(ws, ".author/probe");
    const put = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, typeof value === "string" ? value : YAML.dump(value, { lineWidth: -1 })); };
    const call = (...args) => spawnSync(process.execPath, [join(root, engine, "author.mjs"), args[0], "probe", ...args.slice(1)],
      { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws, AUTHOR_READER: join(ws, "reader.yaml") } });
    const run = (...args) => { const r = call(...args); assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout; };
    const load = path => YAML.load(readFileSync(path, "utf8"));
    try {
      cpSync(join(root, "tests/fixtures/coverage-review"), course, { recursive: true });
      put(join(ws, "reader.yaml"), "reader:\n  background: arithmetic\n  goal: learn\n");
      put(join(course, "categorize/concepts.yaml"), [{ id: "concept-resistor", term: "Resistor", body: "Voltage, current, resistance." }]);
      put(join(course, "categorize/objectives.yaml"), [{ id: "obj-resistor", outcome: "Recall quantities", families: ["family-recall"] }]);
      put(join(course, "categorize/families.yaml"), [{ id: "family-recall", description: "Recall resistor quantities" }]);
      const file = join(course, "sections/01-one/1-start.yaml"), unit = load(file);
      unit.blocks[0].objectives = ["obj-resistor"];
      unit.blocks.push({ t: "p", h: "A supporting detail. ".repeat(80) });
      unit.quiz[0].concept = "concept-resistor"; unit.quiz[0].objectives = ["obj-resistor"]; unit.quiz[0].family = "family-recall";
      if (bank) {
        const item = { ...unit.quiz[0], id: "q-recall", typeId: "recall" };
        delete item.type; delete item.concept; delete item.objectives; delete item.family;
        put(join(course, "questions/types.yaml"), [{ id: "recall", task: "Recall resistor quantities.", concept: "concept-resistor", objectives: ["obj-resistor"], families: ["family-recall"], teach: ["s1-1"] }]);
        put(join(course, "questions/bank.yaml"), [item, { ...item, id: "q-check", use: "check", group: "relation", q: "Explain the relation among resistor quantities." }]);
        put(join(course, "questions/assessment.yaml"), [{ scope: "course", criteria: "Recall quantities and explain their relation independently." }]);
        unit.quiz = ["q-recall"];
      }
      put(file, unit);
      const source = join(ws, "source.txt"); put(source, "Relevant evidence.\nUnrelated evidence.\n");
      run("begin", "--mode", mode, "--handoff", handoff, "--source", source);
      const catalog = load(join(state, "sources/catalog.yaml")), src = catalog.sources.find(s => s.path.endsWith("/source.txt"));
      const ref = { source: src.id, unit: src.units[0].id, lines: [1, 1] };
      put(join(course, "materials/plan.yaml"), { lessons: [{ id: "s1-1", objectives: ["obj-resistor"], families: ["family-recall"], sources: [ref] }] });
      put(join(course, "materials/expectations.md"), "Learn the fixture.\n");
      if (bank) {
        const check = spawnSync(process.execPath, [join(root, engine, "gen-materials.mjs"), "probe"], { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws } });
        assert.equal(check.status, 0, check.stdout + check.stderr);
        const problems = readFileSync(join(course, "materials/problems.md"), "utf8");
        assert.ok(!problems.includes("Explain the relation among resistor quantities."), "reserved check remains absent from printed practice");
        const items = load(join(course, "questions/bank.yaml")); items[1].verified = false;
        put(join(course, "questions/bank.yaml"), items);
        const audit = spawnSync(process.execPath, [join(root, engine, "audit-content.mjs"), "--profile", "publish", "probe"], { encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws } });
        assert.notEqual(audit.status, 0); assert.match(audit.stdout, /unverified/);
        items[1].verified = true; put(join(course, "questions/bank.yaml"), items);
      }
      run("write"); run("done", "--all");
      const index = load(join(state, "items.yaml")), quiz = index.entries.find(e => e.kind === (bank ? "bank" : "quiz"));
      run("screen", "--section", "s1");
      const screen = load(join(state, "packets/screen-s1-1.yaml"));
      assert.equal(screen.items.length, 3);
      assert.ok(screen.items.some(i => i.truncated));
      assert.ok(!JSON.stringify(screen).includes('"hash"'));
      run("packet", "--ids", [...screen.items.map(i => i.id), ...(bank ? [quiz.id, "assessment-course"] : [])].join(","), "--expand");
      const expanded = load(join(state, "packets/review-items.yaml"));
      assert.equal(expanded.sources.length, 1);
      assert.equal(expanded.sources[0].text, "Relevant evidence.\n");
      assert.ok(!JSON.stringify(expanded).includes("Unrelated evidence"));
      if (!bank) assert.ok(JSON.stringify(screen).length < JSON.stringify(expanded).length);
      else {
        assert.equal(expanded.items.filter(e => e.kind === "question-type").length, 1);
        assert.equal(expanded.items.filter(e => e.kind === "bank").length, 2);
        assert.ok(expanded.items.filter(e => e.kind === "bank").every(e => !e.content.objectives));
      }
      const approval = join(ws, "approval.yaml");
      if (bank) put(approval, { inventoryExceptions: { recall: { reason: "Narrow fixture covers two reviewed ordinary/reserved alternatives; transfer remains limited." } } });
      const report = join(ws, "issues.yaml");
      put(report, { items: [{ target: quiz.id, issue: "Explain how quantities relate", done: "Relation explicit", sourceRefs: [ref] }] });
      run("issues", "--report", report);
      assert.match(run("status"), /stage: correct/);
      assert.notEqual(call("reviewed", "--all").status, 0);
      const changed = load(file);
      if (bank) {
        const items = load(join(course, "questions/bank.yaml")); items[0].response.model += " Current depends on voltage and resistance.";
        put(join(course, "questions/bank.yaml"), items);
      } else changed.quiz[0].response.model += " Current depends on voltage and resistance.";
      changed.blocks[1].h = "An additional edit the corrector did not list.";
      put(file, changed);
      run("index");
      assert.equal(bank ? load(join(course, "questions/bank.yaml"))[0].id : load(file).quiz[0].authorId, quiz.id);
      const correction = join(ws, "results.yaml"), saved = load(join(state, "corrections.yaml"));
      put(correction, { results: [{ issue: saved.items[0].id, disposition: "fixed", affected: [quiz.id] }] });
      run("corrected", "--report", correction); run("done", "--all");
      assert.match(run("status"), /stage: review/);
      assert.notEqual(call("finish").status, 0);
      run("screen", "--changed");
      const recheck = load(join(state, "packets/screen-s1-1.yaml"));
      assert.ok(recheck.items.some(i => i.id === changed.blocks[1].authorId && i.change === "changed"));
      assert.equal(load(recheck.issueReport).items[0].id, saved.items[0].id);
      assert.ok(!JSON.stringify(recheck).includes('"hash"'));
      run("reviewed", "--all", ...(bank ? ["--report", approval] : [])); run("finish");
      assert.equal(load(join(state, "review.yaml")).status, "accepted");
      const concepts = load(join(course, "categorize/concepts.yaml")); concepts[0].body = "Changed after acceptance.";
      put(join(course, "categorize/concepts.yaml"), concepts);
      assert.match(call("finish").stdout, /reviewed content changed/);
      run("done", "--all");
      assert.notEqual(call("reviewed", "--all").status, 0);
      run("screen", "--changed"); run("reviewed", "--all", ...(bank ? ["--report", approval] : []));
    } finally { rmSync(ws, { recursive: true, force: true }); }
  });
