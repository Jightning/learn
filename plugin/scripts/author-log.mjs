#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
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
const WORKSPACE = process.env.AUTHOR_WORKSPACE ? resolve(process.env.AUTHOR_WORKSPACE) : existsSync(join(ENGINE, "courses")) ? ENGINE : here();
const COURSES = join(WORKSPACE, "courses");
join(WORKSPACE, ".author");
existsSync(join(ENGINE, "courses", "_template")) ? join(ENGINE, "courses", "_template") : join(ENGINE, "template");
existsSync(join(ENGINE, "docs")) && join(ENGINE, "docs");
//#endregion
//#region tools/author-log.mjs
const LOG = ".authoring-log.md";
const AUTHOR_CMD = /(?:author\.mjs"?'?|npm run author --)\s+begin\s+["']?([\w-]+)/g;
function lines(path) {
	if (!existsSync(path)) return [];
	return readFileSync(path, "utf8").split("\n").flatMap((l) => {
		if (!l) return [];
		try {
			return [JSON.parse(l)];
		} catch {
			return [];
		}
	});
}
const textOf = (c) => (typeof c === "string" ? c : (c || []).map((x) => x.text || "").join(" ")).replace(/\s+/g, " ").trim();
/** Everything the log needs from one transcript and its subagents. */
function summarize(transcript) {
	const events = lines(transcript);
	const subDir = join(dirname(transcript), basename(transcript, ".jsonl"), "subagents");
	const subs = existsSync(subDir) ? readdirSync(subDir).filter((f) => f.endsWith(".jsonl")).map((f) => ({
		agent: true,
		events: lines(join(subDir, f))
	})) : [];
	const models = {};
	const courses = /* @__PURE__ */ new Set();
	const told = [];
	let first = null, last = null, turns = 0, agents = 0;
	for (const { agent, events: evs } of [{
		agent: false,
		events
	}, ...subs]) {
		const seen = /* @__PURE__ */ new Set();
		const calls = /* @__PURE__ */ new Map();
		for (const e of evs) {
			if (e.timestamp) {
				first ??= e.timestamp;
				last = e.timestamp > (last || "") ? e.timestamp : last;
			}
			const m = e.message;
			if (e.type === "assistant" && m) {
				if (m.usage && m.id && !seen.has(m.id) && m.model && m.model !== "<synthetic>") {
					seen.add(m.id);
					const x = models[m.model] ??= {
						calls: 0,
						input: 0,
						cacheRead: 0,
						cacheWrite: 0,
						output: 0
					};
					x.calls++;
					if (!agent) turns++;
					x.input += m.usage.input_tokens || 0;
					x.cacheRead += m.usage.cache_read_input_tokens || 0;
					x.cacheWrite += m.usage.cache_creation_input_tokens || 0;
					x.output += m.usage.output_tokens || 0;
				}
				for (const c of m.content || []) {
					if (c.type !== "tool_use") continue;
					const i = c.input || {};
					const target = String(i.file_path || i.command || i.pattern || i.url || i.description || "").replace(/\s+/g, " ").trim();
					calls.set(c.id, {
						name: c.name,
						target
					});
					if (/^(Agent|Task)$/.test(c.name)) agents++;
					if (c.name === "Bash") for (const a of target.matchAll(AUTHOR_CMD)) courses.add(a[1]);
				}
			} else if (e.type === "user" && Array.isArray(m?.content)) for (const c of m.content) {
				if (c.type !== "tool_result") continue;
				const call = calls.get(c.tool_use_id) || {
					name: "?",
					target: ""
				};
				const text = textOf(c.content);
				const who = `${agent ? "subagent " : ""}${call.name} ${call.target.slice(0, 80)}`.trim();
				if (c.is_error) {
					const kind = /permission|denied|not allowed/i.test(text) ? "refused" : "tool error";
					told.push(`${kind}: ${who} — ${text.slice(0, 160)}`);
				} else if (/tools\/author\.mjs|npm run author/.test(call.target) && /(^|\n| )not finished:/.test(text)) told.push(`author refused: ${call.target.replace(/.*author(\.mjs| --)\s+/, "").slice(0, 60)} — ${text.slice(0, 200)}`);
				else if (/validate/.test(call.target) && /✗/.test(text)) told.push(`validate: ${text.split(/(?=✗)/).slice(0, 6).map((x) => x.trim()).join(" ").slice(0, 300)}`);
			}
		}
	}
	return {
		models,
		courses: [...courses],
		told,
		first,
		last,
		turns,
		agents
	};
}
const n = (x) => x >= 1e6 ? (x / 1e6).toFixed(2) + "M" : x >= 1e3 ? Math.round(x / 1e3) + "k" : String(x);
/** The markdown entry for one session. */
function entry(sessionId, s) {
	const rows = Object.entries(s.models);
	const minutes = s.first && s.last ? Math.round((Date.parse(s.last) - Date.parse(s.first)) / 6e4) : 0;
	const cell = (x) => String(x).replace(/\|/g, "\\|");
	const counted = /* @__PURE__ */ new Map();
	for (const t of s.told) counted.set(t, (counted.get(t) || 0) + 1);
	return [
		`<!-- session ${sessionId} -->`,
		`## ${(s.first || "").slice(0, 16).replace("T", " ")} UTC · ${minutes} min · ${s.turns} turns · ${s.agents} subagent runs`,
		"",
		"| model | calls | input | cache read | cache write | output |",
		"|---|--:|--:|--:|--:|--:|",
		...rows.map(([m, x]) => `| ${m} | ${x.calls} | ${n(x.input)} | ${n(x.cacheRead)} | ${n(x.cacheWrite)} | ${n(x.output)} |`),
		"",
		counted.size ? "Told the model:" : "Nothing went wrong that the model was told about.",
		...[...counted].map(([t, k]) => `- ${cell(t)}${k > 1 ? ` (×${k})` : ""}`),
		`<!-- /session ${sessionId} -->`
	].join("\n");
}
const HEAD = "# Authoring log\n\nWritten by `tools/author-log.mjs` from each session's transcript: the tokens each model used and what the model was told went wrong. Nothing here is written by a model.\n";
/**
* A line from a command, for the log. This is the half that works under any
* CLI: the transcript half only exists where the agent keeps one this can
* read. Kept to the last 200 lines so a long build does not grow unbounded.
*/
function note(courseDir, text) {
	const path = join(courseDir, LOG);
	const old = existsSync(path) ? readFileSync(path, "utf8") : HEAD;
	const line = `- ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ")} ${text.replace(/\s+/g, " ").trim()}`;
	const mark = "## Commands";
	if (!old.includes(mark)) return writeFileSync(path, `${old.trimEnd()}\n\n${mark}\n\n${line}\n`);
	const [before, after] = old.split(mark);
	const kept = after.split("\n").filter((l) => l.startsWith("- ")).slice(-199);
	writeFileSync(path, `${before}${mark}\n\n${[...kept, line].join("\n")}\n`);
}
/** Insert or replace a session's entry in a course's log. */
function record(courseDir, sessionId, s) {
	const path = join(courseDir, LOG);
	const old = existsSync(path) ? readFileSync(path, "utf8") : HEAD;
	const block = entry(sessionId, s);
	const re = new RegExp(`<!-- session ${sessionId} -->[\\s\\S]*?<!-- /session ${sessionId} -->`);
	writeFileSync(path, re.test(old) ? old.replace(re, block) : old.trimEnd() + "\n\n" + block + "\n");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) try {
	let transcript = process.argv[2], sessionId = transcript && basename(transcript, ".jsonl");
	if (!transcript) {
		const hook = JSON.parse(readFileSync(0, "utf8") || "{}");
		transcript = hook.transcript_path;
		sessionId = hook.session_id;
	}
	if (transcript && existsSync(transcript) && /author(\.mjs| --)/.test(readFileSync(transcript, "utf8"))) {
		const s = summarize(transcript);
		for (const id of s.courses) {
			const dir = join(COURSES, id);
			if (existsSync(dir)) record(dir, sessionId, s);
		}
	}
} catch {}
//#endregion
export { LOG, entry, note, record, summarize };
