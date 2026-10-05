#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { loadCourse } from "./lib/load.mjs";
import { buildIndex } from "../src/lib/index.js";
import { shadowPractice } from "./lib/practice-shadow.mjs";
const [dir, eventsFile, out, seed = "1"] = process.argv.slice(2);
if (!dir || !eventsFile || !out) throw new Error("usage: shadow-practice.mjs course-dir events.json output.json [seed]");
const loaded = loadCourse(dir);
if (loaded.errors.length) throw new Error(loaded.errors.join("\n"));
const rows = JSON.parse(readFileSync(eventsFile, "utf8"));
if (!Array.isArray(rows)) throw new Error("events must be a list");
const report = shadowPractice(buildIndex(loaded.course), rows, Number(seed));
writeFileSync(out, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(`${report.decisions.length} observed prefixes replayed; unchosen learning effects remain unknown`);
