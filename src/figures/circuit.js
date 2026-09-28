import { esc, txt } from "./base.js";
import { placeLabel } from "./labels.js";

const SYMBOLS = {
  resistor: '<path d="M-24 0h5l4-9 8 18 7-18 7 18 8-18 4 9h5"/>',
  capacitor: '<path d="M-24 0h16m0-13v26m16-26v26M8 0h16"/>',
  battery: '<path d="M-24 0h16m0-14v28M6-9v18M6 0h18"/>',
  switch: '<path d="M-24 0h10m28 0h10M-14 0L11-13"/><circle cx="-14" r="2"/><circle cx="14" r="2"/>',
  diode: '<path d="M-24 0h12m24 0h12M-12-13v26l24-13zM12-13v26"/>',
  lamp: '<path d="M-24 0h8m32 0h8"/><circle r="16"/><path d="M-11-11L11 11M11-11L-11 11"/>',
  source: '<path d="M-24 0h8m32 0h8"/><circle r="16"/><path d="M-9 0q5-10 9 0t9 0"/>'
};
const HEIGHT = {
  resistor: [11, 11], capacitor: [15, 15], battery: [16, 16],
  switch: [15, 4], diode: [15, 15], lamp: [18, 18], source: [18, 18]
};

/* Four ordered paths. Each part replaces one short section of its side; the
 * remaining sections become wires with stable side-number references. */
function rectangle(spec) {
  const sides = spec.sides || {};
  const top = sides.top || [], right = sides.right || [];
  const bottom = sides.bottom || [], left = sides.left || [];
  const w = Math.max(4, Number(spec.w) || 0, 2 + 2 * Math.max(top.length, bottom.length));
  const h = Math.max(4, Number(spec.h) || 0, 2 + 2 * Math.max(left.length, right.length));
  const paths = [
    ["top", top, [1, 1], [w - 1, 1], "h"],
    ["right", right, [w - 1, 1], [w - 1, h - 1], "v"],
    ["bottom", bottom, [w - 1, h - 1], [1, h - 1], "h"],
    ["left", left, [1, h - 1], [1, 1], "v"]
  ];
  const parts = [], wires = [];
  for (const [side, items, start, end, dir] of paths) {
    const at = t => [start[0] + (end[0] - start[0]) * t,
                     start[1] + (end[1] - start[1]) * t];
    const sign = [Math.sign(end[0] - start[0]), Math.sign(end[1] - start[1])];
    let previous = start;
    items.forEach((part, i) => {
      const center = at((i + 1) / (items.length + 1));
      const before = [center[0] - sign[0] / 2, center[1] - sign[1] / 2];
      const after = [center[0] + sign[0] / 2, center[1] + sign[1] / 2];
      wires.push({ from: previous, to: before, ref: `${side}-${i + 1}` });
      const rotation = side === "right" ? 90 : side === "bottom" ? 180 : side === "left" ? -90 : 0;
      parts.push({ ...part, x: center[0], y: center[1], dir, rotation });
      previous = after;
    });
    wires.push({ from: previous, to: end, ref: `${side}-${items.length + 1}` });
  }
  return { w, h, parts, wires, junctions: [] };
}

/** Manual grid coordinates or an automatically wired rectangular loop. */
export function circuit(spec, caption = "") {
  const data = spec.layout === "rectangle" ? rectangle(spec) : spec;
  const unit = 48, pad = 42;
  const w = Math.max(2, Number(data.w) || 8), h = Math.max(2, Number(data.h) || 5);
  const X = x => pad + x * unit, Y = y => pad + y * unit;
  const reserved = (data.parts || []).map(p => {
    const vertical = p.dir === "v" || Math.abs(p.rotation || 0) === 90;
    const height = HEIGHT[p.type] || [18, 18];
    const [above, below] = p.rotation === 180 ? [...height].reverse() : height;
    return vertical
      ? { x: X(p.x) - 19, y: Y(p.y) - 25, w: 38, h: 50 }
      : { x: X(p.x) - 25, y: Y(p.y) - above, w: 50, h: above + below };
  });
  const boxes = [{ x: X(0), y: Y(0), w: X(w) - X(0), h: Y(h) - Y(0) }];
  const wires = (data.wires || []).map((v, i) => {
    const x1 = X(v.from[0]), y1 = Y(v.from[1]), x2 = X(v.to[0]), y2 = Y(v.to[1]);
    boxes.push({ x: Math.min(x1, x2), y: Math.min(y1, y2),
      w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
    reserved.push({ x: Math.min(x1, x2) - 3, y: Math.min(y1, y2) - 3,
      w: Math.abs(x2 - x1) + 6, h: Math.abs(y2 - y1) + 6 });
    const ref = v.ref || `wire-${i + 1}`;
    return `<line x1="${x1}" y1="${y1}" ` +
      `x2="${x2}" y2="${y2}" class="fx-c-wire" data-wire="${esc(ref)}"/>`;
  }).join("");
  const parts = (data.parts || []).map(p => {
    const x = X(p.x), y = Y(p.y);
    const angle = p.rotation ?? (p.dir === "v" ? 90 : 0);
    const turn = angle ? ` transform="rotate(${angle})"` : "";
    const title = [p.label, p.value].filter(Boolean).join(" · ") || p.type;
    const vertical = p.dir === "v" || Math.abs(angle) === 90;
    const side = spec.layout === "rectangle" && p.x > w / 2 ? 1 : -1;
    const height = HEIGHT[p.type] || [18, 18];
    const [above, below] = angle === 180 ? [...height].reverse() : height;
    const position = (value, size, isValue) => {
      if (!vertical) return {
        x, y: y + (isValue ? below + 15 : -above - 10),
        directions: [[0, isValue ? 1 : -1]]
      };
      return {
        x: x + side * (29 + 0.65 * size * String(value).length / 2),
        y: y + (isValue ? 12 : -8), directions: [[side, 0]]
      };
    };
    let labels = "";
    if (p.label) {
      const start = position(p.label, 13, false);
      const pos = placeLabel(start.x, start.y, p.label, 13, reserved, start.directions);
      boxes.push(pos.box);
      labels += txt(pos.x, pos.y, p.label, "fx-cl");
    }
    if (p.value) {
      const start = position(p.value, 12, true);
      const pos = placeLabel(start.x, start.y, p.value, 12, reserved, start.directions);
      boxes.push(pos.box);
      labels += txt(pos.x, pos.y, p.value, "fx-cv");
    }
    return `<g class="fx-c-part"><title>${esc(title)}</title>` +
      `<g transform="translate(${x} ${y})"><g${turn}>${SYMBOLS[p.type] || ""}</g></g>` +
      labels + "</g>";
  }).join("");
  const dots = (data.junctions || []).map(p => {
    boxes.push({ x: X(p[0]) - 4, y: Y(p[1]) - 4, w: 8, h: 8 });
    return `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.5" class="fx-c-dot"/>`;
  }).join("");
  const minX = Math.min(...boxes.map(b => b.x)) - 10;
  const minY = Math.min(...boxes.map(b => b.y)) - 10;
  const maxX = Math.max(...boxes.map(b => b.x + b.w)) + 10;
  const maxY = Math.max(...boxes.map(b => b.y + b.h)) + 10;
  const name = esc(caption || "Circuit diagram").replace(/"/g, "&quot;");
  return `<svg class="fx fx-circuit" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" ` +
    `style="min-width:${Math.min(Math.max(maxX - minX, 480), 760)}px" ` +
    `role="img" aria-label="${name}">${wires}${parts}${dots}</svg>`;
}
