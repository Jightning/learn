import { createRequire } from "node:module"; import fs from "node:fs";
const yaml = createRequire(import.meta.url)("js-yaml");
let bad = 0;
for (const f of process.argv.slice(2)) {
  try {
    const d = yaml.load(fs.readFileSync(f, "utf8"));
    const b = (d.blocks || []).length, q = (d.quiz || []).length;
    if (!b || !q) { console.log(`EMPTY ${f}: blocks=${b} quiz=${q}`); bad++; }
    else console.log(`ok ${f.split("/").pop().padEnd(44)} blocks=${b} quiz=${q}`);
  } catch (e) { console.log(`PARSE ${f}: ${e.reason} at line ${(e.mark?.line ?? 0) + 1}`); bad++; }
}
process.exit(bad ? 1 : 0);
