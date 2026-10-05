#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as YAML from "js-yaml";
import { loadCourse } from "./lib/load.mjs";
import { legacyQuestionAliases } from "../src/lib/question-aliases.js";

const [previousDir, currentDir, explicitPath] = process.argv.slice(2);
if (!previousDir || !currentDir) throw new Error("usage: migrate-question-ids.mjs unchanged-legacy-snapshot current-course [explicit-mapping.json]");
const previous = loadCourse(previousDir), current = loadCourse(currentDir);
const errors = [...previous.errors, ...current.errors];
if (errors.length) throw new Error(errors.join("\n"));
const explicit = explicitPath ? JSON.parse(readFileSync(explicitPath, "utf8")) : {};
const result = legacyQuestionAliases(previous.course, current.course, explicit);
if (result.missing.length) throw new Error(result.missing.map(q => `${q.id}: ${q.reason}`).join("\n"));
const output = join(currentDir, "questions", "aliases.yaml");
mkdirSync(join(currentDir, "questions"), { recursive: true });
writeFileSync(output, YAML.dump(result.aliases), { flag: "wx" });
console.log(`${Object.keys(result.aliases).length} unchanged legacy IDs mapped -> ${output}`);
