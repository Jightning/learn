import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCourse } from "../../tools/lib/load.mjs";
import { courseFiles } from "../../tools/lib/files.mjs";
import { digest } from "../../tools/lib/digest.mjs";
import { readPlan, indexPlan } from "../../tools/lib/author-packets.mjs";
import { parseCourse } from "../../src/lib/parse.js";

function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), "curriculum-"));
  const put = (path, value) => {
    const full = join(dir, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, value);
  };
  try { fn({ dir, put }); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("declared reader background closes prerequisites without inventing an extra objective", () => fixture(({ dir, put }) => {
  put("materials/plan.yaml", "reader:\n  background: [addition]\nlessons:\n  - {id: s1-1, objectives: [obj-total]}\n");
  put("categorize/objectives.yaml", "- {id: obj-total, outcome: Compute totals, prerequisites: [addition]}\n");
  assert.equal(indexPlan(readPlan(dir)).objectives.size, 1);
  put("categorize/objectives.yaml", "- {id: obj-total, outcome: Compute totals, prerequisites: [unintroduced]}\n");
  assert.throws(() => indexPlan(readPlan(dir)), /unknown.*prerequisite/);
}));

test("canonical collections load into reader maps and survive course packing", () => fixture(({ dir, put }) => {
  put("course.yaml", "title: Sample\n");
  put("sections/01-start/_section.yaml", "title: Start\n");
  put("sections/01-start/1-intro.yaml", "title: Intro\nblocks: []\nquiz: []\n");
  put("categorize/objectives.yaml", "- id: explain\n  outcome: Explain the idea\n");
  put("categorize/families.yaml", "- id: transfer\n  boundary: New representation\n");
  put("categorize/concepts.yaml", "- id: threshold\n  term: Threshold\n  body: Meaning\n");
  put("concepts/threshold.yaml", "term: Threshold\nbody: Meaning\n");
  const loaded = loadCourse(dir);
  assert.deepEqual(loaded.errors, []);
  assert.equal(loaded.course.objectives.explain.outcome, "Explain the idea");
  assert.equal(loaded.course.families.transfer.boundary, "New representation");
  assert.equal(loaded.course.concepts.threshold.term, "Threshold");
  const packed = courseFiles(dir, message => { throw new Error(message); });
  const parsed = parseCourse(packed);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.course.concepts.threshold.term, "Threshold");
}));

test("canonical concepts enter the authoring digest", () => fixture(({ dir, put }) => {
  put("categorize/concepts.yaml", "- id: canonical-term\n  term: Canonical term\n  body: Definition\n");
  const out = digest(dir);
  assert.deepEqual(out.concepts.map(c => c.key), ["canonical-term"]);
  assert.match(out.text, /canonical-term — Canonical term/);
}));

test("readPlan merges canonical definitions and hashes the combined plan", () => fixture(({ dir, put }) => {
  put("materials/plan.yaml", "objectives: [explain]\nfamilies: [transfer]\nconcepts: [threshold]\nlessons:\n  - id: s1-1\n    objectives: [explain]\n    families: [transfer]\n    concepts: [threshold]\n");
  put("categorize/objectives.json", JSON.stringify([{ id: "explain", outcome: "Explain the idea", families: ["transfer"], concepts: ["threshold"] }]));
  put("categorize/families.yml", "- id: transfer\n  boundary: New representation\n  concepts: [threshold]\n");
  put("categorize/concepts.yaml", "- id: threshold\n  term: Threshold\n");
  const first = readPlan(dir);
  assert.equal(first.data.objectives[0].outcome, "Explain the idea");
  assert.equal(indexPlan(first).lessons.get("s1-1").id, "s1-1");
  put("categorize/objectives.json", JSON.stringify([{ id: "explain", outcome: "Explain it precisely", families: ["transfer"], concepts: ["threshold"] }]));
  const second = readPlan(dir);
  assert.notEqual(first.hash, second.hash);
  assert.throws(() => indexPlan({ canonical: true, data: {
    objectives: [{ id: "x", prerequisites: ["missing"] }], families: [], concepts: [],
    lessons: [{ id: "s1-1", objectives: ["missing"] }]
  } }), /unknown objective/);
  put("materials/plan.yaml", "objectives: [missing]\n");
  assert.throws(() => readPlan(dir), /references unknown objective "missing"/);
  put("materials/plan.yaml", "lessons:\n  - id: s1-1\n    families: [missing-family]\n    concepts: [missing-concept]\n");
  put("categorize/objectives.json", JSON.stringify([{ id: "explain", outcome: "Explain", prerequisites: ["missing-prerequisite"] }]));
  assert.throws(() => readPlan(dir), /unknown objective prerequisite reference "missing-prerequisite"/);
  put("categorize/objectives.yaml", "- {id: explain, outcome: Duplicate extension}\n");
  assert.throws(() => readPlan(dir), /use only one collection file/);
}));

test("malformed canonical collections and conflicting legacy copies fail clearly", () => fixture(({ dir, put }) => {
  put("course.yaml", "title: Sample\n");
  put("sections/01-start/_section.yaml", "title: Start\n");
  put("sections/01-start/1-intro.yaml", "title: Intro\n");
  put("categorize/concepts.yaml", "- term: Missing id\n");
  assert.ok(loadCourse(dir).errors.some(e => e.includes("needs a nonempty id")));
  put("course.yaml", "title: Sample\nconcepts: []\n");
  assert.ok(loadCourse(dir).errors.some(e => e.includes("concepts must be a mapping")));
  assert.ok(parseCourse({
    "course.yaml": "title: Sample\nconcepts: []\n",
    "categorize/concepts.yaml": "- {id: threshold, term: New}\n",
    "sections/01-start/_section.yaml": "title: Start\n",
    "sections/01-start/1-intro.yaml": "title: Intro\nblocks: []\n"
  }).errors.some(e => e.includes("concepts must be a mapping")));
  put("categorize/concepts.yaml", "- id: threshold\n  term: New\n");
  put("concepts/threshold.yaml", "term: Old\n");
  assert.ok(loadCourse(dir).errors.some(e => e.includes('conflicts with legacy concepts definition "threshold"')));
  put("materials/plan.yaml", "objectives:\n  - {id: explain, outcome: Old}\n");
  put("categorize/objectives.yaml", "- {id: explain, outcome: New}\n");
  assert.throws(() => readPlan(dir), /categorize\/objectives\.yaml conflicts with legacy objectives definition "explain"/);
}));

test("canonical curriculum rejects unresolved reader-content tags and concept links", () => {
  const parsed = parseCourse({
    "course.yaml": "title: Sample\n",
    "categorize/objectives.yaml": "- {id: explain, outcome: Explain}\n",
    "categorize/families.yaml": "- {id: transfer, boundary: New surface}\n",
    "categorize/concepts.yaml": "- id: threshold\n  term: Threshold\n  related: [missing-concept]\n",
    "sections/01-start/_section.yaml": "title: Start\n",
    "sections/01-start/1-intro.yaml": `title: Intro\nblocks:\n  - {t: p, c: '<c k="missing-inline"/>', objectives: [missing-objective], family: missing-family}\nquiz:\n  - {type: recall, q: Q, a: A, concept: missing-concept}\n`
  });
  assert.ok(parsed.errors.some(e => e.includes('unknown objective reference "missing-objective"')));
  assert.ok(parsed.errors.some(e => e.includes('unknown family reference "missing-family"')));
  assert.ok(parsed.errors.some(e => e.includes('unknown concept reference "missing-concept"')));
  assert.ok(parsed.errors.some(e => e.includes('unknown concept reference "missing-inline"')));
  const duplicate = parseCourse({
    "course.yaml": "title: Sample\n",
    "categorize/objectives.yaml": "- {id: explain, outcome: Explain}\n- {id: explain, outcome: Explain}\n",
    "categorize/objectives.json": "[]",
    "sections/01-start/_section.yaml": "title: Start\n",
    "sections/01-start/1-intro.yaml": "title: Intro\n"
  });
  assert.ok(duplicate.errors.some(e => e.includes("duplicate objective id \"explain\"")));
  assert.ok(duplicate.errors.some(e => e.includes("use only one collection file")));
});

test("browser import rejects plan conflicts and unresolved canonical plan refs", () => {
  const base = {
    "course.yaml": "title: Sample\n",
    "categorize/objectives.yaml": "- {id: explain, outcome: Canonical}\n",
    "sections/01-start/_section.yaml": "title: Start\n",
    "sections/01-start/1-intro.yaml": "title: Intro\n"
  };
  const conflict = parseCourse({ ...base,
    "materials/plan.yaml": "objectives:\n  - {id: explain, outcome: Legacy}\n"
  });
  assert.ok(conflict.errors.some(e => e.includes('conflicts with legacy objectives definition "explain"')));
  const missing = parseCourse({ ...base,
    "materials/plan.yaml": "objectives: [missing]\n"
  });
  assert.ok(missing.errors.some(e => e.includes('references unknown objective "missing"')));
});

test("legacy plans without canonical collections retain their existing reference behavior", () => fixture(({ dir, put }) => {
  put("materials/plan.yaml", "objectives: [missing]\nlessons:\n  - id: s1-1\n    objectives: [missing]\n");
  const plan = readPlan(dir);
  assert.equal(plan.canonical, false);
  assert.doesNotThrow(() => indexPlan(plan));
}));
