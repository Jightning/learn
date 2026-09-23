import assert from "node:assert/strict";
import { circuit } from "../../src/figures/circuit.js";
import { drawing } from "../../src/figures/drawing.js";
import { checkFigure } from "../../tools/lib/figures.mjs";
import { checkSlides } from "../../tools/lib/slides.mjs";
import { numberFigures } from "../../src/lib/figures.js";
import { parseCourse } from "../../src/lib/parse.js";
import { slideSwipe } from "../../src/lib/swipe.js";

const errors = (kind, spec) => {
  const out = [];
  checkFigure({ t: "figure", kind, spec }, "s1-1", out);
  return out;
};

const circuitSpec = {
  w: 5, h: 3,
  wires: [{ from: [0, 1], to: [1, 1] }],
  parts: [{ type: "resistor", x: 2, y: 1, dir: "h", label: "R1", value: "1 kΩ" }]
};
assert.deepEqual(errors("circuit", circuitSpec), []);
assert.match(circuit(circuitSpec), /R1/);
assert.match(circuit(circuitSpec), /fx-c-wire/);
assert.ok(errors("circuit", { parts: [{ type: "transistor", x: 1, y: 1 }] })
  .some(e => e.includes("unknown circuit part")));
assert.ok(errors("circuit", { wires: [{ from: [0, "x"], to: [2, 0] }] })
  .some(e => e.includes("two [x, y] points")));

const drawingSpec = {
  alt: "Arrow from input to output",
  shapes: [{ type: "arrow", points: [[10, 40], [150, 40]], label: "direction" }]
};
assert.deepEqual(errors("drawing", drawingSpec), []);
assert.match(drawing(drawingSpec), /polyline/);
assert.ok(errors("drawing", { shapes: [{ type: "blob" }] })
  .some(e => e.includes("unknown drawing shape")));
assert.ok(errors("drawing", { alt: "a", shapes: [{ type: "path", points: [[0, 0]] }] })
  .some(e => e.includes("at least two")));
assert.equal(slideSwipe(-60, 4), "next");
assert.equal(slideSwipe(60, 4), "previous");
assert.equal(slideSwipe(-60, 50), null);

const slideErrors = [];
checkSlides({ frames: [{ figure: { kind: "circuit", spec: { parts: [{ type: "unknown", x: 1, y: 1 }] } } },
  { image: { src: "assets/a.png" } }] }, "s1-1", slideErrors);
assert.ok(slideErrors.some(e => e.includes("unknown circuit part")));
assert.ok(slideErrors.some(e => e.includes("image has no alt text")));

const files = {
  "course.json": JSON.stringify({ title: "Visuals" }),
  "sections/01-start/_section.json": JSON.stringify({ title: "Start" }),
  "sections/01-start/1-intro.json": JSON.stringify({ title: "Intro", blocks: [
    { t: "slides", id: "sequence", cap: "Sequence", frames: [
      { title: "First", image: { src: "assets/step.png", alt: "Step picture" } }
    ] }
  ] }),
  "assets/step.png": "data:image/png;base64,AAAA"
};
const { course, errors: parseErrors } = parseCourse(files);
assert.deepEqual(parseErrors, []);
const block = course.sections[0].subs[0].blocks[0];
assert.equal(block.frames[0].image.src, files["assets/step.png"]);
assert.equal(numberFigures(course).numOf(block), "1.1");
const missing = { ...files };
delete missing["assets/step.png"];
assert.ok(parseCourse(missing).errors.some(e => e.includes('missing image asset "assets/step.png"')));
console.log("visuals ok");
