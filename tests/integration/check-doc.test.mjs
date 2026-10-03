import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root=join(dirname(fileURLToPath(import.meta.url)),"../..");

test("documentation accepts checked source metadata but still rejects unknown block fields",()=>{
  const ws=mkdtempSync(join(tmpdir(),"doc-check-"));
  try {
    for(const path of ["package.json","tools/check-doc.mjs","tools/lib","src"]){
      mkdirSync(dirname(join(ws,path)),{recursive:true});cpSync(join(root,path),join(ws,path),{recursive:true});
    }
    symlinkSync(join(root,"node_modules"),join(ws,"node_modules"),"dir");mkdirSync(join(ws,"authoring"));
    const example="```yaml\nt: def\nterm: Relation\nsource: Handbook\nsourceReview: sourced\ncore: Checked relation.\nh: <p>Explanation.</p>\n```\n";
    const doc=join(ws,"authoring/example.md");writeFileSync(doc,example);
    const run=()=>spawnSync(process.execPath,[join(ws,"tools/check-doc.mjs")],{encoding:"utf8"});
    let result=run();assert.equal(result.status,0,result.stdout+result.stderr);
    writeFileSync(doc,example.replace("sourceReview:","sourceReveiw:"));
    result=run();assert.equal(result.status,1);assert.match(result.stdout,/sourceReveiw/);
  } finally {rmSync(ws,{recursive:true,force:true});}
});
