import { esc, txt } from "./base.js";

/* Coordinates are grid points. A component occupies the segment centred on
 * (x,y); wires join grid points, so a small YAML spec stays readable. */
export function circuit(spec) {
  const unit = 48, pad = 42;
  const w = Math.max(2, Number(spec.w) || 8), h = Math.max(2, Number(spec.h) || 5);
  const X = x => pad + x * unit, Y = y => pad + y * unit;
  const line = (a, b, cls = "fx-c-wire") =>
    `<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" class="${cls}"/>`;
  const wires = (spec.wires || []).map(v => line(v.from, v.to)).join("");
  const parts = (spec.parts || []).map(p => {
    const x = X(p.x), y = Y(p.y), turn = p.dir === "v" ? ' transform="rotate(90)"' : "";
    const symbols = {
      resistor: '<path d="M-24 0h5l4-9 8 18 7-18 7 18 8-18 4 9h5"/>',
      capacitor: '<path d="M-24 0h16m0-13v26m16-26v26M8 0h16"/>',
      battery: '<path d="M-24 0h16m0-14v28M6-9v18M6 0h18"/>',
      switch: '<path d="M-24 0h10m28 0h10M-14 0L11-13"/><circle cx="-14" r="2"/><circle cx="14" r="2"/>',
      diode: '<path d="M-24 0h12m24 0h12M-12-13v26l24-13zM12-13v26"/>',
      lamp: '<path d="M-24 0h8m32 0h8"/><circle r="16"/><path d="M-11-11L11 11M11-11L-11 11"/>',
      source: '<path d="M-24 0h8m32 0h8"/><circle r="16"/><path d="M-9 0q5-10 9 0t9 0"/>'
    };
    const title = [p.label, p.value].filter(Boolean).join(" · ") || p.type;
    return `<g class="fx-c-part"><title>${esc(title)}</title>` +
      `<g transform="translate(${x} ${y})"><g${turn}>${symbols[p.type] || ""}</g></g>` +
      (p.label ? txt(x, y - 30, p.label, "fx-cl") : "") +
      (p.value ? txt(x, y + 38, p.value, "fx-cv") : "") + "</g>";
  }).join("");
  const dots = (spec.junctions || []).map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.5" class="fx-c-dot"/>`).join("");
  return `<svg class="fx fx-circuit" viewBox="0 0 ${X(w) + pad} ${Y(h) + pad}" role="img" aria-label="Circuit diagram">${wires}${parts}${dots}</svg>`;
}
