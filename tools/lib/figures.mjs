/* ============================================================================
 * tools/lib/figures.mjs — check one figure block against its kind's spec
 *
 * A figure is the one block type whose payload is a free-form mapping the
 * renderer picks over, so it is the one place a typo produces no error and no
 * missing-content marker — just a figure quietly drawn without the thing the
 * author wrote. Everything checkable about a spec is checked here, at build
 * time, for the reason T30 gives.
 *
 *   checkFigure(block, where, errs) -> pushes one message per problem
 * ==========================================================================*/
import { KINDS } from "../../src/figures/index.js";
import { SPEC } from "../../src/figures/schema.js";

/* The schema sits beside the renderers so a new kind's author trips over it,
   which only works if a kind cannot be added to one and not the other. */
const missing = KINDS.filter(k => !SPEC[k]);
const extra = Object.keys(SPEC).filter(k => !KINDS.includes(k));
if (missing.length || extra.length)
  throw new Error(`src/figures/schema.js is out of step with the registry: ` +
    [missing.length ? `no spec for ${missing.join(", ")}` : "",
     extra.length ? `spec for unregistered ${extra.join(", ")}` : ""].filter(Boolean).join("; "));

/* A null value is the fingerprint of the YAML defect this mostly exists to
   catch: `{label: a, note: b, c}` is `{label: "a", note: "b", c: null}`, so an
   unknown key that parsed to nothing is almost always a truncated value. */
const why = v => v === null
  ? ` — an unquoted comma in a YAML flow mapping ends the pair, not the value; quote the whole string`
  : ``;

function checkKeys(obj, allowed, what, errs) {
  for (const [k, v] of Object.entries(obj))
    if (!allowed.includes(k))
      errs.push(`${what}: unknown key "${k}"${why(v)}`);
}

/* A plot series' `fn` is JavaScript in `x` that the reader's browser evaluates
   while they are reading. It was the one authored expression nothing compiled:
   a syntax error renders an empty chart with no message at all, and a runtime
   error paints "Render error" onto the page someone is revising from. Maths is
   rendered at build time for exactly this reason (T30), so a plot's function is
   compiled and sampled here for the same one. Course JavaScript already runs in
   this process — the bundler imports courses/<id>/blocks.js — so this adds no
   trust that is not already assumed. */
function checkPlotFns(spec, where, errs) {
  for (const ser of Array.isArray(spec.series) ? spec.series : []) {
    if (!ser || ser.points || ser.fn == null) continue;
    let f;
    try { f = new Function("x", "return (" + ser.fn + ");"); }
    catch (e) { errs.push(`${where}: plot fn "${ser.fn}" does not parse — ${e.message}`); continue; }
    const from = ser.from != null ? ser.from : (spec.xrange ? spec.xrange[0] : 0);
    const to = ser.to != null ? ser.to : (spec.xrange ? spec.xrange[1] : 10);
    let finite = 0, threw = null;
    for (let i = 0; i <= 20 && !threw; i++) {
      try {
        const y = f(from + (to - from) * (i / 20));
        if (typeof y === "number" && isFinite(y)) finite++;
      } catch (e) { threw = e.message; }
    }
    if (threw) errs.push(`${where}: plot fn "${ser.fn}" throws — ${threw}`);
    else if (!finite)
      errs.push(`${where}: plot fn "${ser.fn}" has no finite value on [${from}, ${to}] — the chart renders empty`);
  }
}

const finite = x => typeof x === "number" && Number.isFinite(x);
const point = p => Array.isArray(p) && p.length === 2 && p.every(finite);
const onWire = (p, wire) => {
  const [a, b] = [wire.from, wire.to];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) < 1e-8 &&
    p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
};

function checkDiagram(kind, spec, where, errs) {
  if (kind === "circuit") {
    if (spec.layout === "rectangle") {
      const sides = spec.sides;
      if (!sides || typeof sides !== "object" || Array.isArray(sides))
        errs.push(`${where}: rectangle circuit needs sides: {top, right, bottom, left}`);
      else {
        checkKeys(sides, ["top", "right", "bottom", "left"], `${where}: rectangle circuit sides`, errs);
        let count = 0;
        for (const [side, items] of Object.entries(sides)) {
          if (!Array.isArray(items)) { errs.push(`${where}: rectangle circuit ${side} must be a list`); continue; }
          count += items.length;
          for (const part of items) {
            if (!part || typeof part !== "object" || Array.isArray(part)) {
              errs.push(`${where}: rectangle circuit ${side} part must be a mapping`); continue;
            }
            checkKeys(part, ["type", "label", "value"], `${where}: rectangle circuit ${side} part`, errs);
            if (!["resistor", "capacitor", "battery", "switch", "diode", "lamp", "source"].includes(part.type))
              errs.push(`${where}: unknown circuit part "${part.type}"`);
          }
        }
        if (!count) errs.push(`${where}: rectangle circuit needs at least one part`);
      }
      if (spec.wires || spec.parts || spec.junctions)
        errs.push(`${where}: rectangle circuit draws its own wires and parts; remove manual fields`);
      return;
    }
    if (spec.sides != null)
      errs.push(`${where}: manual circuit uses wires and parts, not sides`);
    for (const field of ["wires", "parts", "junctions"])
      if (spec[field] != null && !Array.isArray(spec[field]))
        errs.push(`${where}: circuit ${field} must be a list`);
    if (!(spec.wires || []).length && !(spec.parts || []).length)
      errs.push(`${where}: circuit needs wires or parts`);
    const wires = Array.isArray(spec.wires) ? spec.wires : [];
    for (const wire of wires)
      if (!point(wire?.from) || !point(wire?.to)) errs.push(`${where}: circuit wire needs two [x, y] points`);
      else if (wire.from[0] === wire.to[0] && wire.from[1] === wire.to[1])
        errs.push(`${where}: circuit wire cannot have zero length`);
    for (const part of Array.isArray(spec.parts) ? spec.parts : []) {
      if (!part || !["resistor", "capacitor", "battery", "switch", "diode", "lamp", "source"].includes(part.type))
        errs.push(`${where}: unknown circuit part "${part?.type}"`);
      if (!finite(part?.x) || !finite(part?.y)) errs.push(`${where}: circuit part needs numeric x and y`);
      if (part?.dir != null && !["h", "v"].includes(part.dir)) errs.push(`${where}: circuit part dir must be h or v`);
    }
    for (const p of Array.isArray(spec.junctions) ? spec.junctions : []) {
      if (!point(p)) { errs.push(`${where}: circuit junction needs [x, y]`); continue; }
      if (wires.filter(w => point(w?.from) && point(w?.to) && onWire(p, w)).length < 2)
        errs.push(`${where}: circuit junction ${JSON.stringify(p)} must lie on at least two wires`);
    }
  } else {
    if (!String(spec.alt || "").trim()) errs.push(`${where}: drawing needs alt text`);
    if (!Array.isArray(spec.shapes) || !spec.shapes.length) errs.push(`${where}: drawing needs shapes`);
    for (const shape of Array.isArray(spec.shapes) ? spec.shapes : []) {
      if (!shape || !["line", "arrow", "path", "rect", "ellipse", "text"].includes(shape.type)) {
        errs.push(`${where}: unknown drawing shape "${shape?.type}"`); continue;
      }
      if (["line", "arrow", "path"].includes(shape.type) &&
          (!Array.isArray(shape.points) || shape.points.length < 2 || !shape.points.every(point)))
        errs.push(`${where}: drawing ${shape.type} needs at least two [x, y] points`);
      if (["rect", "ellipse", "text"].includes(shape.type) &&
          (!finite(shape.x) || !finite(shape.y))) errs.push(`${where}: drawing ${shape.type} needs numeric x and y`);
      if (["rect", "ellipse"].includes(shape.type) &&
          (!finite(shape.w) || shape.w <= 0 || !finite(shape.h) || shape.h <= 0))
        errs.push(`${where}: drawing ${shape.type} needs positive w and h`);
      if (shape.type === "text" && !String(shape.text || "").trim()) errs.push(`${where}: drawing text needs text`);
      if (shape.accent != null && (!Number.isInteger(shape.accent) || shape.accent < 0 || shape.accent > 3))
        errs.push(`${where}: drawing accent must be 0–3`);
    }
  }
}

function checkGeometry(kind, spec, where, errs) {
  for (const key of ["w", "h"])
    if (spec[key] != null && (!finite(spec[key]) || spec[key] <= 0))
      errs.push(`${where}: figure ${kind} ${key} must be a positive number`);
  if (spec.ticks != null && (!Number.isInteger(spec.ticks) || spec.ticks < 1 || spec.ticks > 20))
    errs.push(`${where}: figure ${kind} ticks must be an integer from 1 to 20`);
  for (const key of ["xrange", "yrange"])
    if (spec[key] != null && (!Array.isArray(spec[key]) || spec[key].length !== 2 ||
        !spec[key].every(finite) || spec[key][0] >= spec[key][1]))
      errs.push(`${where}: figure ${kind} ${key} must be two increasing numbers`);
}

function checkChart(kind, spec, where, errs) {
  if (kind === "bar") {
    if (spec.bars != null && !Array.isArray(spec.bars))
      errs.push(`${where}: bar bars must be a list`);
    for (const b of Array.isArray(spec.bars) ? spec.bars : [])
      if (!finite(b?.value)) errs.push(`${where}: bar value must be a finite number`);
    for (const key of ["max", "baseline"])
      if (spec[key] != null && !finite(spec[key]))
        errs.push(`${where}: bar ${key} must be a finite number`);
    if (finite(spec.max) && finite(spec.baseline) && spec.max <= spec.baseline)
      errs.push(`${where}: bar max must exceed baseline`);
    return;
  }
  if (spec.series != null && !Array.isArray(spec.series))
    errs.push(`${where}: ${kind} series must be a list`);
  for (const s of Array.isArray(spec.series) ? spec.series : []) {
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      errs.push(`${where}: ${kind} series item must be a mapping`); continue;
    }
    if (s.points != null && (!Array.isArray(s.points) || !s.points.every(point)))
      errs.push(`${where}: ${kind} points must be [x, y] finite-number pairs`);
    if (kind === "plot") {
      if (s.samples != null && (!Number.isInteger(s.samples) || s.samples < 2 || s.samples > 2000))
        errs.push(`${where}: plot samples must be an integer from 2 to 2000`);
      if (s.from != null && !finite(s.from) || s.to != null && !finite(s.to))
        errs.push(`${where}: plot from and to must be finite numbers`);
      if (finite(s.from) && finite(s.to) && s.from >= s.to)
        errs.push(`${where}: plot from must be less than to`);
    }
  }
}

function checkGraph(spec, where, errs) {
  if (spec.nodes != null && !Array.isArray(spec.nodes)) errs.push(`${where}: graph nodes must be a list`);
  if (spec.edges != null && !Array.isArray(spec.edges)) errs.push(`${where}: graph edges must be a list`);
  const ids = new Set();
  for (const n of Array.isArray(spec.nodes) ? spec.nodes : []) {
    if (!n || !String(n.id || "").trim()) { errs.push(`${where}: graph node needs id`); continue; }
    if (ids.has(n.id)) errs.push(`${where}: graph repeats node id "${n.id}"`);
    ids.add(n.id);
    if (spec.layout === "manual" && (!finite(n.x) || !finite(n.y)))
      errs.push(`${where}: manual graph node "${n.id}" needs numeric x and y`);
  }
  for (const e of Array.isArray(spec.edges) ? spec.edges : [])
    if (!ids.has(e?.from) || !ids.has(e?.to))
      errs.push(`${where}: graph edge refers to an unknown node`);
  if (spec.r != null && (!finite(spec.r) || spec.r <= 0))
    errs.push(`${where}: graph r must be positive`);
}

function checkGrid(spec, where, errs) {
  if (Array.isArray(spec.cells)) {
    for (const row of spec.cells)
      if (!Array.isArray(row)) errs.push(`${where}: grid each cells row must be a list`);
    if (Array.isArray(spec.rowLabels) && spec.cells.length !== spec.rowLabels.length)
      errs.push(`${where}: grid cells needs one row per rowLabel`);
    if (Array.isArray(spec.colLabels))
      for (const row of spec.cells)
        if (Array.isArray(row) && row.length !== spec.colLabels.length)
          errs.push(`${where}: grid cells row length must match colLabels`);
  }
  for (const group of Array.isArray(spec.groups) ? spec.groups : []) {
    if (!Array.isArray(group?.cells) || !group.cells.every(p =>
      Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) &&
      p[0] >= 0 && p[1] >= 0 &&
      (!Array.isArray(spec.rowLabels) || p[0] < spec.rowLabels.length) &&
      (!Array.isArray(spec.colLabels) || p[1] < spec.colLabels.length)))
      errs.push(`${where}: grid group cells must name existing [row, column] positions`);
  }
}

function checkTiming(spec, where, errs) {
  if (spec.unit != null && (!finite(spec.unit) || spec.unit <= 0))
    errs.push(`${where}: timing unit must be positive`);
  if (spec.signals != null && !Array.isArray(spec.signals))
    errs.push(`${where}: timing signals must be a list`);
  for (const signal of Array.isArray(spec.signals) ? spec.signals : [])
    if (!/^[01]+$/.test(String(signal?.wave || "")))
      errs.push(`${where}: timing wave must contain only 0 and 1`);
}

/** Check one `{t:"figure", kind, spec}` block. `where` names the subsection. */
export function checkFigure(b, where, errs) {
  const s = SPEC[b.kind];
  if (!s) { errs.push(`${where}: unknown figure kind "${b.kind}"`); return; }

  const spec = b.spec || {};
  if (typeof spec !== "object" || Array.isArray(spec)) {
    errs.push(`${where}: figure "${b.kind}" spec is not a mapping`);
    return;
  }

  checkKeys(spec, s.keys, `${where}: figure ${b.kind} spec`, errs);

  checkGeometry(b.kind, spec, where, errs);

  for (const [k, allowed] of Object.entries(s.enums || {}))
    if (spec[k] != null && !allowed.includes(spec[k]))
      errs.push(`${where}: figure ${b.kind} ${k}: "${spec[k]}" is not one of ` +
        `${allowed.join(", ")} — the renderer ignores it and falls back to "${allowed[0]}"`);

  /* A format with no placeholder is worse than none: every tick reads the
     same, which looks deliberate. A non-string is what a course reaches for
     when it copies a JavaScript formatter into YAML. */
  for (const k of s.fmts || []) {
    const f = spec[k];
    if (f == null) continue;
    if (typeof f !== "string")
      errs.push(`${where}: figure ${b.kind} ${k} must be a format string like "{} ms" — ` +
        `a course is data, so it cannot hold a function`);
    else if (!f.includes("{}"))
      errs.push(`${where}: figure ${b.kind} ${k} "${f}" has no {} — every label would read the same`);
  }

  for (const [field, allowed] of Object.entries(s.items || {}))
    (Array.isArray(spec[field]) ? spec[field] : []).forEach((it, i) => {
      if (it && typeof it === "object" && !Array.isArray(it))
        checkKeys(it, allowed, `${where}: figure ${b.kind} ${field}[${i + 1}]`, errs);
    });

  if (b.kind === "grid")
    for (const field of ["rowVars", "colVars", "rowLabels", "colLabels", "cells", "groups"])
      if (spec[field] != null && !Array.isArray(spec[field]))
        errs.push(`${where}: figure grid ${field} must be a list`);
  if (b.kind === "grid") checkGrid(spec, where, errs);
  if (b.kind === "timing") checkTiming(spec, where, errs);

  if (b.kind === "plot") checkPlotFns(spec, where, errs);
  if (b.kind === "circuit" || b.kind === "drawing") checkDiagram(b.kind, spec, where, errs);
  if (["bar", "plot", "scatter"].includes(b.kind)) checkChart(b.kind, spec, where, errs);
  if (b.kind === "graph") checkGraph(spec, where, errs);
}
