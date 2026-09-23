import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { courseFiles } from "../../tools/lib/files.mjs";
import { parseCourse } from "../../src/lib/parse.js";
import { runsOf } from "../../src/lib/tiers.js";

test("the packed Exam 1 course contains every readable subsection", () => {
  const dir = join(process.cwd(), "courses/ece20001");
  const files = courseFiles(dir, message => { throw new Error(message); });
  const packed = JSON.parse(readFileSync("packed/ece20001.course.json", "utf8"));
  assert.deepEqual(packed, files, "the import file must match the course files");

  const { course, errors } = parseCourse(packed);
  assert.deepEqual(errors, []);
  const exam1 = course.sections.slice(0, 5).flatMap(section => section.subs);
  assert.equal(exam1.length, 18);
  for (const sub of exam1) {
    const visible = runsOf(sub.blocks, "apply")
      .filter(run => !run.hidden)
      .flatMap(run => run.items);
    assert.ok(visible.length > 0, `${sub.id} has no visible lesson blocks`);
    assert.ok(sub.quiz.length > 0, `${sub.id} has no quiz`);
  }
  assert.equal(exam1.find(sub => sub.id === "s1-2")?.blocks.length, 9);
});
