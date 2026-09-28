import assert from "node:assert/strict";
import { circuit } from "../../src/figures/circuit.js";
import { drawing } from "../../src/figures/drawing.js";
import { checkFigure } from "../../tools/lib/figures.mjs";
import { checkSlides } from "../../tools/lib/slides.mjs";
import { numberFigures } from "../../src/lib/figures.js";
import { decorate } from "../../src/lib/refs.js";
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
const rectangleSpec = { layout: "rectangle", sides: {
  top: [{ type: "resistor", label: "R", value: "1 kΩ" }],
  left: [{ type: "battery", label: "V", value: "9 V" }]
} };
assert.deepEqual(errors("circuit", rectangleSpec), []);
const rectangle = circuit(rectangleSpec, "Simple loop");
assert.equal((rectangle.match(/data-wire="/g) || []).length, 6);
assert.match(rectangle, /data-wire="top-1"/);
assert.match(rectangle, /aria-label="Simple loop"/);
assert.ok(errors("circuit", { layout: "rectangle", sides: { top: [{ type: "transistor" }] } })
  .some(e => e.includes("unknown circuit part")));
assert.ok(errors("circuit", { layout: "rectangle", sides: { top: [] }, wires: [] })
  .some(e => e.includes("draws its own wires")));
const branchSpec = { layout: "manual", wires: [
  { from: [0, 0], to: [2, 0] },
  { from: [2, 0], to: [4, 0] },
  { from: [2, 0], to: [2, 2] }
], parts: [{ type: "capacitor", x: 2, y: 3, dir: "v" }], junctions: [[2, 0]] };
assert.deepEqual(errors("circuit", branchSpec), []);
assert.equal((circuit(branchSpec).match(/fx-c-wire/g) || []).length, 3);
assert.ok(errors("circuit", { ...branchSpec, junctions: [[3, 2]] })
  .some(e => e.includes("must lie on at least two wires")));
assert.ok(errors("circuit", { ...branchSpec, sides: { top: [] } })
  .some(e => e.includes("manual circuit uses wires and parts")));

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
assert.equal(numberFigures(course).byKey.sequence.at, 0);
assert.match(decorate('<f k="sequence"/>', "demo", numberFigures(course).byKey),
  /href="#\/demo\/s1-1~0"/);
const missing = { ...files };
delete missing["assets/step.png"];
assert.ok(parseCourse(missing).errors.some(e => e.includes('missing image asset "assets/step.png"')));
console.log("visuals ok");
