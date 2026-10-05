#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { registerStudy, evaluateStudy } from "./lib/practice-evaluation.mjs";

const [command, configPath, dataPath, out] = process.argv.slice(2);
if (!["register", "analyze"].includes(command) || !configPath || !dataPath || !out)
  throw new Error("usage: evaluate-practice.mjs register|analyze protocol.json participants|observations.json output.json");
const read = path => JSON.parse(readFileSync(path, "utf8"));
const result = command === "register" ? registerStudy(read(configPath), read(dataPath)) : evaluateStudy(read(configPath), read(dataPath));
// Exclusive creation prevents replacing a registered protocol or earlier result.
writeFileSync(out, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(`${command}: ${out}; adaptive promotion requires completed learner evidence and review`);
