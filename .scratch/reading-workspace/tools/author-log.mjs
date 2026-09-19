#!/usr/bin/env node
/* ============================================================================
 * tools/author-log.mjs — the generation log, written from the transcript
 *
 *   (Claude Code Stop hook)            reads { session_id, transcript_path } on stdin
 *   node tools/author-log.mjs FILE     the same, for a transcript named by hand
 *
 * A course authored in a CLI session gets a record nobody had to write:
 * which models ran and how many tokens each used (subagents included), and
 * everything the model was told went wrong — refused and failed tool calls,
 * `author` commands that refused, validate errors. It is rebuilt from the
 * transcript each time the session stops, so it is current even if the
 * session is later killed, and it is never the model's own account.
 *
 * A session counts as authoring a course once it ran `author begin <id>`.
 * Its entry in courses/<id>/.authoring-log.md is keyed by session id and
 * replaced in place. The file is a dotfile, so packing and loading skip it.
 * The hook prints nothing: its output must not reach the model.
 * ==========================================================================*/
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { COURSES } from "./lib/paths.mjs";
import { fileURLToPath } from "node:url";

export const LOG = ".authoring-log.md";

/* `node tools/author.mjs done ma26600 …` or `npm run author -- done ma26600 …` */
/* Only `begin` makes a session an authoring session: it is the workflow's
   first step, and a session that merely asked for `status` is not one. */
const AUTHOR_CMD = /(?:author\.mjs"?'?|npm run author --)\s+begin\s+["']?([\w-]+)/g;

function lines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").flatMap(l => {
    if (!l) return [];
    try { return [JSON.parse(l)]; } catch { return []; }
  });
}

const textOf = c => (typeof c === "string" ? c
  : (c || []).map(x => x.text || "").join(" ")).replace(/\s+/g, " ").trim();

/** Everything the log needs from one transcript and its subagents. */
export function summarize(transcript) {
  const events = lines(transcript);
  const subDir = join(dirname(transcript), basename(transcript, ".jsonl"), "subagents");
  const subs = existsSync(subDir)
    ? readdirSync(subDir).filter(f => f.endsWith(".jsonl")).map(f => ({ agent: true, events: lines(join(subDir, f)) }))
    : [];

  const models = {};
  const courses = new Set();
  const told = [];
  let first = null, last = null, turns = 0, agents = 0;

  for (const { agent, events: evs } of [{ agent: false, events }, ...subs]) {
    const seen = new Set();
    const calls = new Map();
    for (const e of evs) {
      if (e.timestamp) { first ??= e.timestamp; last = e.timestamp > (last || "") ? e.timestamp : last; }
      const m = e.message;
      if (e.type === "assistant" && m) {
        if (m.usage && m.id && !seen.has(m.id) && m.model && m.model !== "<synthetic>") {
          seen.add(m.id);
          const x = models[m.model] ??= { calls: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
          x.calls++; if (!agent) turns++;
          x.input += m.usage.input_tokens || 0;
          x.cacheRead += m.usage.cache_read_input_tokens || 0;
          x.cacheWrite += m.usage.cache_creation_input_tokens || 0;
          x.output += m.usage.output_tokens || 0;
        }
        for (const c of m.content || []) {
          if (c.type !== "tool_use") continue;
          const i = c.input || {};
          const target = String(i.file_path || i.command || i.pattern || i.url || i.description || "")
            .replace(/\s+/g, " ").trim();
          calls.set(c.id, { name: c.name, target });
          if (/^(Agent|Task)$/.test(c.name)) agents++;
          if (c.name === "Bash") for (const a of target.matchAll(AUTHOR_CMD)) courses.add(a[1]);
        }
      } else if (e.type === "user" && Array.isArray(m?.content)) {
        for (const c of m.content) {
          if (c.type !== "tool_result") continue;
          const call = calls.get(c.tool_use_id) || { name: "?", target: "" };
          const text = textOf(c.content);
          const who = `${agent ? "subagent " : ""}${call.name} ${call.target.slice(0, 80)}`.trim();
          if (c.is_error) {
            const kind = /permission|denied|not allowed/i.test(text) ? "refused" : "tool error";
            told.push(`${kind}: ${who} — ${text.slice(0, 160)}`);
          } else if (/tools\/author\.mjs|npm run author/.test(call.target) && /(^|\n| )not finished:/.test(text)) {
            told.push(`author refused: ${call.target.replace(/.*author(\.mjs| --)\s+/, "").slice(0, 60)} — ${text.slice(0, 200)}`);
          } else if (/validate/.test(call.target) && /✗/.test(text)) {
            told.push(`validate: ${text.split(/(?=✗)/).slice(0, 6).map(x => x.trim()).join(" ").slice(0, 300)}`);
          }
        }
      }
    }
  }
  return { models, courses: [...courses], told, first, last, turns, agents };
}

const n = x => x >= 1e6 ? (x / 1e6).toFixed(2) + "M" : x >= 1e3 ? Math.round(x / 1e3) + "k" : String(x);

/** The markdown entry for one session. */
export function entry(sessionId, s) {
  const rows = Object.entries(s.models);
  const minutes = s.first && s.last ? Math.round((Date.parse(s.last) - Date.parse(s.first)) / 60000) : 0;
  const cell = x => String(x).replace(/\|/g, "\\|");
  /* Repeats are one line with a count: a loop is visible without drowning the rest. */
  const counted = new Map();
  for (const t of s.told) counted.set(t, (counted.get(t) || 0) + 1);
  return [
    `<!-- session ${sessionId} -->`,
    `## ${(s.first || "").slice(0, 16).replace("T", " ")} UTC · ${minutes} min · ${s.turns} turns · ` +
      `${s.agents} subagent runs`,
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

const HEAD = "# Authoring log\n\nWritten by `tools/author-log.mjs` from each session's transcript: " +
  "the tokens each model used and what the model was told went wrong. Nothing here is written by a model.\n";

/**
 * A line from a command, for the log. This is the half that works under any
 * CLI: the transcript half only exists where the agent keeps one this can
 * read. Kept to the last 200 lines so a long build does not grow unbounded.
 */
export function note(courseDir, text) {
  const path = join(courseDir, LOG);
  const old = existsSync(path) ? readFileSync(path, "utf8") : HEAD;
  const line = `- ${new Date().toISOString().slice(0, 16).replace("T", " ")} ${text.replace(/\s+/g, " ").trim()}`;
  const mark = "## Commands";
  if (!old.includes(mark)) return writeFileSync(path, `${old.trimEnd()}\n\n${mark}\n\n${line}\n`);
  const [before, after] = old.split(mark);
  const kept = after.split("\n").filter(l => l.startsWith("- ")).slice(-199);
  writeFileSync(path, `${before}${mark}\n\n${[...kept, line].join("\n")}\n`);
}

/** Insert or replace a session's entry in a course's log. */
export function record(courseDir, sessionId, s) {
  const path = join(courseDir, LOG);
  const old = existsSync(path) ? readFileSync(path, "utf8") : HEAD;
  const block = entry(sessionId, s);
  const re = new RegExp(`<!-- session ${sessionId} -->[\\s\\S]*?<!-- /session ${sessionId} -->`);
  writeFileSync(path, re.test(old) ? old.replace(re, block) : old.trimEnd() + "\n\n" + block + "\n");
}

/* ------------------------------------------------------------------ main --*/
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    let transcript = process.argv[2], sessionId = transcript && basename(transcript, ".jsonl");
    if (!transcript) {
      const hook = JSON.parse(readFileSync(0, "utf8") || "{}");
      transcript = hook.transcript_path;
      sessionId = hook.session_id;
    }
    /* Most sessions are not authoring sessions; skip them before parsing. */
    if (transcript && existsSync(transcript) && /author(\.mjs| --)/.test(readFileSync(transcript, "utf8"))) {
      const s = summarize(transcript);
      for (const id of s.courses) {
        const dir = join(COURSES, id);
        if (existsSync(dir)) record(dir, sessionId, s);
      }
    }
  } catch {
    /* A log must never break the session it is logging. */
  }
}
