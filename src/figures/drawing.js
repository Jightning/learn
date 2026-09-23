import { esc, tone } from "./base.js";

/* Small annotated sketches without authored SVG. Points are in the viewBox's
 * coordinate system; a shape can be revised without regenerating an image. */
export function drawing(spec) {
  const w = Number(spec.w) || 640, h = Number(spec.h) || 320;
  const shapes = (spec.shapes || []).map(s => {
    const color = s.accent == null ? "var(--ink-2)" : tone(s.accent);
    const common = `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    const points = (s.points || []).map(p => p.join(",")).join(" ");
    let body = "";
    if (s.type === "line" || s.type === "arrow") {
      const [a, b] = s.points || [];
      if (a && b) {
        body = `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${common}/>`;
        if (s.type === "arrow") {
          const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const wing = sign => [b[0] - 12 * Math.cos(angle + sign * .5), b[1] - 12 * Math.sin(angle + sign * .5)];
          const l = wing(1), r = wing(-1);
          body += `<polyline points="${l.join(",")} ${b.join(",")} ${r.join(",")}" fill="none" ${common}/>`;
        }
      }
    } else if (s.type === "path") body = `<polyline points="${points}" fill="none" ${common}/>`;
    else if (s.type === "rect") body = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="3" fill="var(--surface-2)" ${common}/>`;
    else if (s.type === "ellipse") body = `<ellipse cx="${s.x}" cy="${s.y}" rx="${s.w / 2}" ry="${s.h / 2}" fill="var(--surface-2)" ${common}/>`;
    else if (s.type === "text") body = `<text x="${s.x}" y="${s.y}" class="fx-t fx-d-label" style="fill:${color}">${esc(s.text || "")}</text>`;
    return `<g>${s.label ? `<title>${esc(s.label)}</title>` : ""}${body}</g>`;
  }).join("");
  const alt = esc(spec.alt || "Annotated drawing").replace(/"/g, "&quot;");
  return `<svg class="fx fx-drawing" viewBox="0 0 ${w} ${h}" role="img" aria-label="${alt}">${shapes}</svg>`;
}
