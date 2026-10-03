#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
//#region tools/lib/paths.mjs
const holdsSpec = (d) => existsSync(join(d, "docs", "create_course.md")) || existsSync(join(d, "courses", "_template")) || existsSync(join(d, "template", "course.yaml"));
function findEngine(from) {
	for (let d = from, up = 0; up < 5; d = dirname(d), up++) if (holdsSpec(d)) return d;
	return resolve(from, "..");
}
/** The folder the running script was installed in (this repo, or the package). */
const ENGINE = findEngine(dirname(fileURLToPath(import.meta.url)));
const here = () => resolve(process.env.INIT_CWD || process.cwd());
const workspaceAt = process.argv.indexOf("--workspace");
const requestedWorkspace = workspaceAt >= 0 ? process.argv[workspaceAt + 1] : null;
if (workspaceAt >= 0 && (!requestedWorkspace || requestedWorkspace.startsWith("--"))) throw new Error("--workspace needs a directory path");
const WORKSPACE = requestedWorkspace ? resolve(requestedWorkspace) : process.env.AUTHOR_WORKSPACE ? resolve(process.env.AUTHOR_WORKSPACE) : here();
const COURSES = join(WORKSPACE, "courses");
join(WORKSPACE, ".author");
const TEMPLATE = existsSync(join(ENGINE, "courses", "_template")) ? join(ENGINE, "courses", "_template") : join(ENGINE, "template");
existsSync(join(ENGINE, "docs")) && join(ENGINE, "docs");
/** True when the engine is a package rather than this repository. */
const PACKAGED = WORKSPACE !== ENGINE;
//#endregion
//#region tools/new-course.mjs
function freeHue(coursesDir) {
	const used = [];
	for (const d of readdirSync(coursesDir, { withFileTypes: true })) {
		if (!d.isDirectory() || d.name.startsWith("_")) continue;
		const f = [
			"course.yaml",
			"course.yml",
			"course.json"
		].map((n) => join(coursesDir, d.name, n)).find(existsSync);
		if (!f) continue;
		const m = /^\s*hue:\s*(-?\d+)/m.exec(readFileSync(f, "utf8"));
		used.push(((m ? Number(m[1]) : 0) % 360 + 360) % 360);
	}
	if (!used.length) return 0;
	const gapTo = (h) => Math.min(...used.map((u) => {
		const d = Math.abs(h - u) % 360;
		return Math.min(d, 360 - d);
	}));
	let best = 0;
	for (let h = 5; h < 360; h += 5) if (gapTo(h) > gapTo(best)) best = h;
	return best;
}
join(dirname(fileURLToPath(import.meta.url)), "..");
const [id, ...rest] = process.argv.slice(2);
if (!id) {
	console.error("usage: new-course.mjs <id> \"Course Title\"");
	process.exit(1);
}
const title = rest.join(" ") || "Course Title";
const dest = join(COURSES, id);
if (existsSync(dest)) {
	console.error(`courses/${id} already exists`);
	process.exit(1);
}
function scaffoldReader(coursesDir) {
	const dest = join(coursesDir, "_reader.yaml");
	if (existsSync(dest)) return null;
	cpSync(join(ENGINE, "authoring", "reader.yaml"), dest);
	return dest;
}
mkdirSync(COURSES, { recursive: true });
const hue = freeHue(COURSES);
const readerFile = scaffoldReader(COURSES);
cpSync(TEMPLATE, dest, { recursive: true });
const cfg = join(dest, "course.yaml");
writeFileSync(cfg, readFileSync(cfg, "utf8").replace("code: XX 00000", "code: " + id.toUpperCase()).replace("title: Course Title", "title: " + title).replace(/^(\s*)hue: 0$/m, `$1hue: ${hue}`));
execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "gen-materials.mjs"), id], { stdio: "ignore" });
console.log(`created courses/${id}  (accent hue ${hue})`);
if (readerFile) console.log("created courses/_reader.yaml — fill it in before authoring");
console.log(`  1. edit courses/${id}/course.yaml`);
console.log(`  2. write it: ask your agent, or see the workflow it follows`);
console.log(`  3. ${PACKAGED ? "node \"<kit>/scripts/author.mjs\"" : "node tools/author.mjs"} begin ${id}`);
//#endregion
export {};
