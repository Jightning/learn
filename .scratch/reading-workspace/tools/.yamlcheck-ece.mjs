import {readFileSync, readdirSync} from 'fs';
import * as yaml from 'js-yaml';
import {join} from 'path';
const roots=['courses/ece20001/sections','courses/ece20001/concepts','courses/ece20001/categories','courses/ece20001/drills'];
let bad=0;
for (const r of roots) {
  let entries; try { entries=readdirSync(r,{withFileTypes:true}); } catch { continue; }
  for (const e of entries) {
    const files = e.isDirectory() ? readdirSync(join(r,e.name)).map(f=>join(r,e.name,f)) : [join(r,e.name)];
    for (const f of files) {
      if (!f.endsWith('.yaml')) continue;
      try { const d=yaml.load(readFileSync(f,'utf8'));
        if (f.includes('/sections/') && !f.endsWith('_section.yaml') && d.blocks && !d.quiz) console.log('NO QUIZ', f);
      } catch(err){ bad++; console.log('PARSE FAIL', f, err.message); }
    }
  }
}
console.log(bad? 'BAD '+bad : 'yaml ok');
if (bad) process.exit(1);
