#!/usr/bin/env node
/* Put the authoring workflow in a folder you want to write courses in:
 *
 *   node <kit>/any-agent/install.mjs [folder] [--name AGENTS.md,CLAUDE.md,GEMINI.md]
 *
 * It writes one file per name, each pointing at this kit. Nothing else is
 * installed, and your agent needs no plugin support: it reads the file, runs
 * the commands, and writes the course into <folder>/courses/.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const at = args.indexOf("--name");
const names = (at >= 0 ? args[at + 1] : "AGENTS.md").split(",").map(s => s.trim()).filter(Boolean);
const dir = resolve(args.find((a, i) => !a.startsWith("--") && i !== at + 1) || process.cwd());
const text = readFileSync(join(KIT, "AGENTS.md"), "utf8").replaceAll("<KIT>", KIT);
for (const name of names) {
  const p = join(dir, name);
  if (existsSync(p) && !args.includes("--force")) {
    console.error(`${p} exists; --force to overwrite`);
    process.exit(1);
  }
  writeFileSync(p, text);
  console.log(`wrote ${p}`);
}
console.log(`Now ask your agent to make a course; it will run ${KIT}/scripts/author.mjs`);
