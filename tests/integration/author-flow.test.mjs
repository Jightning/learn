import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as YAML from "js-yaml";
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

for (const engine of ["tools", "plugin/scripts"]) for (const mode of ["paired", "single"])
  test(`${engine}: ${mode} resumes stages and roles without phase instructions`, () => {
  const ws = mkdtempSync(join(tmpdir(), "flow-"));
  const course = join(ws, "courses", "probe");
  const state = join(ws, ".author", "probe");
  const put = (file, body) => { mkdirSync(dirname(file), {recursive:true}); writeFileSync(file, body); };
  put(join(ws, "reader.yaml"), "reader:\n  background: arithmetic\n  goal: learn\n");
  const call = (...args) => spawnSync(process.execPath, [join(root,engine,"author.mjs"), args[0], "probe", ...args.slice(1)],
    {encoding:"utf8",env:{...process.env,AUTHOR_WORKSPACE:ws,AUTHOR_READER:join(ws,"reader.yaml")}});
  const run = (...args) => { const r=call(...args); assert.equal(r.status,0,r.stdout+r.stderr); return r.stdout; };
  const expect = (stage, role) => assert.match(run("status"), new RegExp(`Flow: ${mode} · stage: ${stage} · role: ${mode === "single" ? "single" : role}`));
  const packet = (stage, phase, role, sub) => {
    run("packet");
    const p=YAML.load(readFileSync(join(state,"packets",`${phase}${sub ? "-s1-1" : ""}.yaml`),"utf8"));
    assert.equal(p.mode,mode); assert.equal(p.phase,phase);
    assert.equal(p.role,mode === "single" ? "single" : role);
    assert.equal(p.workflow.stage,stage);
  };
  try {
    cpSync(join(root,"tests/fixtures/coverage-review"),course,{recursive:true});
    put(join(course,"concepts/resistor.yaml"), "term: Resistor\nbody: <p>Relates voltage and current.</p>\n");
    const lessonFile=join(course,"sections/01-one/1-start.yaml");
    writeFileSync(lessonFile,readFileSync(lessonFile,"utf8").replace("  - type: recall", "  - type: recall\n    concept: resistor"));
    run("begin","--mode",mode === "paired" ? "paried" : mode);
    expect("plan","planner"); packet("plan","plan","planner",false);
    put(join(course,"materials/plan.yaml"), "objectives:\n  - {id: a, outcome: Recall}\nlessons:\n  - {id: s1-1, objectives: [a]}\n");
    expect("setup","writer");
    put(join(course,"materials/expectations.md"),"Learn the fixture.\n");
    run("write"); expect("write","writer"); packet("write","write","writer",true);
    run("done","s1-1"); expect("review","reviewer"); packet("review","review","reviewer",true);
    assert.equal(call("reviewed","s1-1","--corrections").status,1);
    put(join(course,"materials/review/s1-1.yaml"), "items:\n  - {target: 'quiz:1', issue: Explain answer, done: Reasoning is explicit}\n");
    run("reviewed","s1-1","--corrections"); expect("correct","writer"); packet("correct","write","writer",true);
    writeFileSync(lessonFile,readFileSync(lessonFile,"utf8")+"\n");
    expect("correct","writer");
    run("done","s1-1"); expect("review","reviewer");
    run("reviewed","s1-1"); expect("finish","reviewer");
    // Relevant plan changes reopen writing even when the course bytes are unchanged.
    put(join(course,"materials/plan.yaml"), "objectives:\n  - {id: a, outcome: Derive}\nlessons:\n  - {id: s1-1, objectives: [a]}\n");
    expect("write","writer");
    run("done","s1-1"); run("reviewed","s1-1"); expect("finish","reviewer");
    // A later mode request persists even on status, without requiring begin again.
    const other=mode === "paired" ? "single" : "paired";
    run("status","--mode",other); assert.match(run("status"),new RegExp(`Flow: ${other}`));
    run("status","--mode",mode);
    run("finish"); expect("complete","reviewer");
    writeFileSync(lessonFile,readFileSync(lessonFile,"utf8")+"\n");
    expect("write","writer");
    run("done","s1-1"); expect("review","reviewer");
    run("reviewed","s1-1"); expect("finish","reviewer");
    run("redo","s1-1"); expect("write","writer");
  } finally {rmSync(ws,{recursive:true,force:true});}
});

for (const engine of ["tools", "plugin/scripts"]) test(`${engine}: paired batch dispatch, narrow corrections and legacy resume`, () => {
  const ws=mkdtempSync(join(tmpdir(),"batch-cli-")), course=join(ws,"courses/probe"), state=join(ws,".author/probe");
  const put=(path,body)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,body);};
  const call=(...args)=>spawnSync(process.execPath,[join(root,engine,"author.mjs"),args[0],"probe",...args.slice(1)],
    {encoding:"utf8",env:{...process.env,AUTHOR_WORKSPACE:ws,AUTHOR_READER:join(ws,"reader.yaml")}});
  const run=(...args)=>{const r=call(...args);assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;};
  const load=file=>YAML.load(readFileSync(file,"utf8"));
  const batch=()=>{const stdout=run("batch");assert.ok(!stdout.includes("UNRELATED_SOURCE"));return load(join(state,"batch.yaml"));};
  try {
    cpSync(join(root,"tests/fixtures/coverage-review"),course,{recursive:true});
    put(join(ws,"reader.yaml"),"reader:\n  background: arithmetic\n  goal: learn\n");
    put(join(course,"concepts/resistor.yaml"),"term: Resistor\nbody: <p>Relates voltage and current.</p>\n");
    const body=readFileSync(join(course,"sections/01-one/1-start.yaml"),"utf8").replace("  - type: recall","  - type: recall\n    concept: resistor");
    put(join(course,"sections/01-one/1-start.yaml"),body);
    put(join(course,"sections/01-one/2-next.yaml"),body.replace("title: Start","title: Next"));
    put(join(course,"sections/02-two/_section.yaml"),"title: Two\nblurb: More.\n");
    put(join(course,"sections/02-two/1-last.yaml"),body.replace("title: Start","title: Last"));
    const source=join(ws,"evidence.txt");put(source,"needed evidence\nUNRELATED_SOURCE\n");
    put(join(course,"materials/plan.md"),"Approved plan; preserve it.\n");
    run("begin","--mode","paired","--source",source);
    assert.match(run("status"),/stage: migrate · role: writer/);
    const migration=batch();assert.equal(migration.stage,"migrate");assert.equal(migration.legacy.length,1);
    assert.equal(migration.workspace,ws);assert.match(migration.command,/author\.mjs$/);
    assert.deepEqual(migration.status_command.slice(-2),["--workspace",ws]);
    const explicit=(...args)=>spawnSync(process.execPath,[join(root,engine,"author.mjs"),args[0],"probe",...args.slice(1),"--workspace",ws],
      {cwd:root,encoding:"utf8",env:{...process.env,AUTHOR_WORKSPACE:join(ws,"wrong"),AUTHOR_READER:join(ws,"reader.yaml")}});
    assert.equal(explicit("status").status,0);
    const relativeSource=explicit("begin","--source","evidence.txt");
    assert.equal(relativeSource.status,0,relativeSource.stdout+relativeSource.stderr);
    assert.equal(call("status","--root",ws).status,1);
    assert.equal(migration.profile.writer,"gpt-6-luna");assert.equal(migration.profile.reasoning,"medium");
    const catalog=load(join(state,"sources/catalog.yaml"));const src=catalog.sources.find(s=>s.path.endsWith("/evidence.txt"));
    const ref={source:src.id,unit:src.units[0].id,lines:[1,2]};
    put(join(course,"materials/plan.yaml"),YAML.dump({objectives:[{id:"a",outcome:"Recall",sources:[ref]}],lessons:["s1-1","s1-2","s2-1"].map(id=>({id,objectives:["a"],sources:[ref]}))}));
    put(join(course,"materials/expectations.md"),"Learn.\n");run("write");
    const writing=batch();assert.deepEqual(writing.members,["s1-1","s1-2"]);assert.equal(writing.tasks.length,2);
    const excerpt=load(writing.tasks[0].packet).sources[0].excerpt;
    assert.ok(load(excerpt).text.includes("UNRELATED_SOURCE"));
    assert.equal(load(writing.tasks[1].packet).sources[0].excerpt,excerpt);
    assert.ok(!JSON.stringify(load(writing.tasks[0].packet)).includes("UNRELATED_SOURCE"));
    run("packet", "--phase", "review", "--sub", "s1-1", "--item", "quiz:1", "--source", `${src.id}/${src.units[0].id}`);
    const narrowReview=load(join(state,"packets/review-s1-1-quiz-1.yaml"));
    assert.equal(narrowReview.sources,undefined);
    assert.equal(narrowReview.plan,undefined);
    assert.equal(narrowReview.workflow.batch,undefined);
    assert.ok(narrowReview.warnings.some(w=>w.includes("no exact line span")));
    run("packet", "--phase", "review", "--sub", "s1-1", "--item", "quiz:1", "--source", `${src.id}/${src.units[0].id}@L1-L1`);
    const exactReview=load(join(state,"packets/review-s1-1-quiz-1.yaml"));
    assert.equal(exactReview.sources[0].text,"needed evidence\n");
    assert.ok(!JSON.stringify(exactReview).includes("UNRELATED_SOURCE"));
    const firstDone=explicit("done","s1-1");assert.equal(firstDone.status,0,firstDone.stdout+firstDone.stderr);
    assert.match(run("status"),/stage: write.*subsection: s1-2/);
    run("done","s1-2");assert.equal(batch().stage,"write");
    run("done","s2-1");assert.equal(batch().stage,"review");
    assert.ok(batch().review_packets.length >= 2);
    run("reviewed","s2-1");
    for(const sub of ["s1-1","s1-2"]) {
      const finding={target:"quiz:1",issue:"Explain",done:"Reason explicit",sourceRefs:[{...ref,lines:[1,1]}]};
      put(join(course,`materials/review/${sub}.yaml`),YAML.dump(engine==="tools"&&sub==="s1-1"?{findings:[finding]}:{items:[finding]}));
      run("reviewed",sub,"--corrections");
      if(sub==="s1-1")assert.match(run("status"),/stage: review.*subsection: s1-2/);
    }
    const corrections=batch();assert.equal(corrections.stage,"correct");assert.equal(corrections.tasks.length,2);
    const packet=load(corrections.tasks[0].packet);assert.equal(packet.sources[0].text,"needed evidence\n");
    assert.ok(!JSON.stringify(packet).includes("UNRELATED_SOURCE"));assert.equal(packet.families,undefined);
    run("done","s1-1");assert.match(run("status"),/stage: correct.*subsection: s1-2/);
    run("done","s1-2");const recheck=batch();assert.equal(recheck.stage,"review");assert.equal(recheck.tasks.length,2);
    run("reviewed","s1-1");run("reviewed","s1-2");assert.match(run("status"),/stage: finish/);
    put(join(course,"sections/01-one/1-start.yaml"),body+"\n");
    assert.match(run("status"),/stage: write.*subsection: s1-1/);
    run("status","--mode","single");assert.equal(batch().mode,"single");assert.equal(batch().tasks.length,1);
  } finally {rmSync(ws,{recursive:true,force:true});}
});

for (const engine of ["tools", "plugin/scripts"]) test(`${engine}: manual whole-course completion persists without per-section handoffs`, () => {
  const ws = mkdtempSync(join(tmpdir(), "manual-flow-")), course = join(ws, "courses/probe");
  const put = (path, body) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, body); };
  const call = (...args) => spawnSync(process.execPath, [join(root, engine, "author.mjs"), args[0], "probe", ...args.slice(1)],
    { cwd: ws, encoding: "utf8", env: { ...process.env, AUTHOR_WORKSPACE: ws, AUTHOR_READER: join(ws, "reader.yaml") } });
  const run = (...args) => { const r = call(...args); assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout; };
  try {
    cpSync(join(root, "tests/fixtures/coverage-review"), course, { recursive: true });
    put(join(ws, "reader.yaml"), "reader:\n  background: arithmetic\n  goal: learn\n");
    put(join(course, "concepts/resistor.yaml"), "term: Resistor\nbody: <p>Relates voltage and current.</p>\n");
    const file = join(course, "sections/01-one/1-start.yaml");
    const body = readFileSync(file, "utf8").replace("  - type: recall", "  - type: recall\n    concept: resistor");
    writeFileSync(file, body);
    put(join(course, "sections/02-two/_section.yaml"), "title: Two\nblurb: More.\n");
    put(join(course, "sections/02-two/1-last.yaml"), body.replace("title: Start", "title: Last"));
    const sourcePath = join(ws, "source.txt"); put(sourcePath, "Relevant evidence.\n");
    run("begin", "--mode", "paired", "--handoff", "manual", "--source", sourcePath);
    const catalog = YAML.load(readFileSync(join(ws, ".author/probe/sources/catalog.yaml"), "utf8"));
    const src = catalog.sources.find(s => s.path.endsWith("/source.txt"));
    const sources = [{ source: src.id, unit: src.units[0].id, lines: [1, 1] }];
    put(join(course, "materials/plan.yaml"), YAML.dump({ lessons: [{id:"s1-1", sources}, {id:"s2-1", sources}] }));
    put(join(course, "materials/expectations.md"), "Learn the fixture.\n");
    run("write");
    // Check publish fields before copying the pattern to the rest of the course.
    writeFileSync(file, body.replace("    sourceReview: sourced\n", ""));
    assert.match(run("pilot", "--sub", "s1-1"), /Pilot needs attention/);
    assert.equal(YAML.load(readFileSync(join(ws,".author/probe/pilot.yaml"),"utf8")).ready,false);
    writeFileSync(file,body);
    const other = join(course,"sections/02-two/1-last.yaml");
    writeFileSync(other,body.replace("    sourceReview: sourced\n", ""));
    assert.match(run("pilot", "--sub", "s1-1"), /Pilot ready/);
    const localPlan = { objectives: [{id:"a",outcome:"Recall",families:["f"]}], families:[{id:"f"}],
      lessons:[{id:"s1-1",objectives:["a"],families:["f"],sources},{id:"s2-1",sources}] };
    put(join(course,"materials/plan.yaml"),YAML.dump(localPlan));
    const tagPilot=run("pilot","--sub","s1-1");
    assert.match(tagPilot,/missing teaching objective tag a/);
    assert.match(tagPilot,/missing question objective tag a/);
    assert.match(tagPilot,/missing assessed family tag f/);
    const tagged=YAML.load(body); tagged.blocks[0].objectives=["a"];
    tagged.quiz[0].objectives=["a"]; tagged.quiz[0].families=["f"];
    writeFileSync(file,YAML.dump(tagged)); assert.match(run("pilot","--sub","s1-1"),/Pilot ready/);
    writeFileSync(file,YAML.dump({...tagged,quiz:[]}));
    assert.match(run("pilot","--sub","s1-1"),/missing quiz/);
    writeFileSync(file,body);
    put(join(course,"materials/plan.yaml"),YAML.dump({lessons:[{id:"s1-1",sources},{id:"s2-1",sources}]}));
    assert.match(run("status"), /stage: write/); // Pilot does not mark lessons complete.
    writeFileSync(other,body);
    run("done", "s1-1");
    assert.match(run("status"), /stage: write/);
    assert.match(run("done", "--all"), /Checked 2 subsections in one validation pass/);
    assert.match(run("status"), /stage: review/);
    assert.ok(readFileSync(join(ws, ".author/probe/map.txt"), "utf8").includes(src.path));
    assert.equal(call("reviewed", "--all", "--corrections").status, 1);
    run("reviewed", "--all"); assert.match(run("status"), /stage: finish/);
    const settings = YAML.load(readFileSync(join(ws, ".author/probe/settings.yaml"), "utf8"));
    assert.equal(settings.handoff, "manual");
    // A broken item prevents bulk completion; unchanged files are not silently accepted.
    writeFileSync(file, "title: Broken\nblocks: nonsense\n");
    assert.notEqual(call("done", "--all").status, 0);
  } finally { rmSync(ws, { recursive: true, force: true }); }
});
