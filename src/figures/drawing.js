import { esc, tone } from "./base.js";
import { overlaps, textWidth } from "./labels.js";

/* Small annotated sketches without authored SVG. Points are in the viewBox's
 * coordinate system; a shape can be revised without regenerating an image. */
export function drawing(spec, caption = "") {
  const w = Number(spec.w) || 640, h = Number(spec.h) || 320;
  const bounds = [{ x: 0, y: 0, w, h }], textBounds = [];
  const shapes = (spec.shapes || []).map(s => {
    const color = s.accent == null ? "var(--ink-2)" : tone(s.accent);
    const common = `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    const points = (s.points || []).map(p => p.join(",")).join(" ");
    let body = "";
    if (s.type === "line" || s.type === "arrow") {
      const [a, b] = s.points || [];
      if (a && b) {
        bounds.push({ x: Math.min(a[0], b[0]) - 14, y: Math.min(a[1], b[1]) - 14,
          w: Math.abs(b[0] - a[0]) + 28, h: Math.abs(b[1] - a[1]) + 28 });
        body = `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${common}/>`;
        if (s.type === "arrow") {
          const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const wing = sign => [b[0] - 12 * Math.cos(angle + sign * .5), b[1] - 12 * Math.sin(angle + sign * .5)];
          const l = wing(1), r = wing(-1);
          body += `<polyline points="${l.join(",")} ${b.join(",")} ${r.join(",")}" fill="none" ${common}/>`;
        }
      }
    } else if (s.type === "path") {
      const ps = s.points || [];
      if (ps.length) {
        const xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
        bounds.push({ x: Math.min(...xs) - 3, y: Math.min(...ys) - 3,
          w: Math.max(...xs) - Math.min(...xs) + 6, h: Math.max(...ys) - Math.min(...ys) + 6 });
      }
      body = `<polyline points="${points}" fill="none" ${common}/>`;
    } else if (s.type === "rect") {
      bounds.push({ x: s.x - 3, y: s.y - 3, w: s.w + 6, h: s.h + 6 });
      body = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="3" fill="var(--surface-2)" ${common}/>`;
    } else if (s.type === "ellipse") {
      bounds.push({ x: s.x - s.w / 2 - 3, y: s.y - s.h / 2 - 3, w: s.w + 6, h: s.h + 6 });
      body = `<ellipse cx="${s.x}" cy="${s.y}" rx="${s.w / 2}" ry="${s.h / 2}" fill="var(--surface-2)" ${common}/>`;
    } else if (s.type === "text") {
      let y = s.y;
      let box = { x: s.x - 2, y: y - 14, w: textWidth(s.text || "", 12) + 4, h: 17 };
      while (textBounds.some(other => overlaps(box, other))) {
        y += 19; box = { ...box, y: y - 14 };
      }
      textBounds.push(box); bounds.push(box);
      body = `<text x="${s.x}" y="${y}" class="fx-t fx-d-label" style="fill:${color}">${esc(s.text || "")}</text>`;
    }
    return `<g>${s.label ? `<title>${esc(s.label)}</title>` : ""}${body}</g>`;
  }).join("");
  const alt = esc(spec.alt || caption || "Annotated drawing").replace(/"/g, "&quot;");
  const minX = Math.min(...bounds.map(b => b.x)) - 8, minY = Math.min(...bounds.map(b => b.y)) - 8;
  const maxX = Math.max(...bounds.map(b => b.x + b.w)) + 8;
  const maxY = Math.max(...bounds.map(b => b.y + b.h)) + 8;
  const width = maxX - minX;
  return `<svg class="fx fx-drawing" viewBox="${minX} ${minY} ${width} ${maxY - minY}"` +
    ` style="min-width:${Math.min(Math.max(Math.ceil(width), 480), 760)}px"` +
    ` role="img" aria-label="${alt}">${shapes}</svg>`;
}
