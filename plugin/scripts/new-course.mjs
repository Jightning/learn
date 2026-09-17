#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
//#region tools/lib/spec.mjs
const HEADING = /^(#{2,4})\s+(.+?)\s*$/;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** "## 6. Sections and subsections" -> "6";  "### Quality bar" -> "quality-bar" */
function idOf(title) {
	const m = /^([0-9]+[a-z]?(?:\.[0-9]+)?)\.?\s+/.exec(title);
	return m ? m[1] : slug(title.replace(/`/g, ""));
}
/** Every heading in `md`, each carrying only the prose directly beneath it. */
function sections(md) {
	const lines = md.split("\n");
	const out = [];
	let cur = null;
	for (const line of lines) {
		const m = HEADING.exec(line);
		if (m) {
			if (cur) out.push(cur);
			cur = {
				id: idOf(m[2]),
				level: m[1].length,
				title: m[2],
				lines: [line]
			};
		} else if (cur) cur.lines.push(line);
	}
	if (cur) out.push(cur);
	return out.map((s) => ({
		...s,
		body: s.lines.join("\n").trim(),
		lines: void 0
	}));
}
/** Index a spec file once; `pick` then costs nothing per call. */
function loadSpec(path) {
	const secs = sections(readFileSync(path, "utf8"));
	const byId = new Map(secs.map((s, i) => [s.id, i]));
	const withKids = (i) => {
		const out = [i];
		for (let j = i + 1; j < secs.length && secs[j].level > secs[i].level; j++) out.push(j);
		return out;
	};
	return {
		path,
		ids: secs.map((s) => s.id),
		/** slice(["0", "6", "6.1*"]) -> markdown, document order, no repeats */
		pick(ids) {
			const want = /* @__PURE__ */ new Set();
			for (const raw of ids) {
				const deep = raw.endsWith("*");
				const id = deep ? raw.slice(0, -1) : raw;
				const i = byId.get(id);
				if (i === void 0) throw new Error(`${path}: no heading "${id}"`);
				(deep ? withKids(i) : [i]).forEach((k) => want.add(k));
			}
			return [...want].sort((a, b) => a - b).map((i) => secs[i].body).join("\n\n");
		}
	};
}
//#endregion
//#region tools/lib/paths.mjs
const holdsSpec = (d) => existsSync(join(d, "docs", "create_course.md")) || existsSync(join(d, "courses", "_template")) || existsSync(join(d, "template", "course.yaml"));
function findEngine(from) {
	for (let d = from, up = 0; up < 5; d = dirname(d), up++) if (holdsSpec(d)) return d;
	return resolve(from, "..");
}
/** The folder the running script was installed in (this repo, or the package). */
const ENGINE = findEngine(dirname(fileURLToPath(import.meta.url)));
const here = () => resolve(process.env.INIT_CWD || process.cwd());
const WORKSPACE = process.env.AUTHOR_WORKSPACE ? resolve(process.env.AUTHOR_WORKSPACE) : existsSync(join(ENGINE, "courses")) ? ENGINE : here();
const COURSES = join(WORKSPACE, "courses");
join(WORKSPACE, ".author");
const TEMPLATE = existsSync(join(ENGINE, "courses", "_template")) ? join(ENGINE, "courses", "_template") : join(ENGINE, "template");
const DOCS = existsSync(join(ENGINE, "docs")) ? join(ENGINE, "docs") : ENGINE;
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
	const sec = loadSpec(join(DOCS, "create_course.md")).pick(["1"]);
	const block = (/```yaml\n([\s\S]*?)```/.exec(sec) || [])[1];
	if (!block) throw new Error("create_course.md §1 has no reader block to copy");
	writeFileSync(dest, "# Who these courses are written for. Read by tools/author.mjs, which sends\n# it with every authoring prompt, and by any model writing a course by hand.\n# docs/create_course.md §1.1 derives seven authoring defaults from it, so\n# every field has to be answered — UNSET is refused rather than guessed.\n#\n# Gitignored, like the courses beside it.\n\n" + block);
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
