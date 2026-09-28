/* Figure kind: bar — comparing magnitudes across labelled categories.
 * {bars:[{label, value, accent?}], ylabel, xlabel, baseline?} */
import { esc, tone, txt, fmt } from "./base.js";
import { frame, grid, axisLabels, scale } from "./axes.js";
import { textWidth } from "./labels.js";

export function bar(spec, caption = "") {
  const bars = spec.bars || [];
  if (!bars.length) return "";
  /* the domain is settled first, so the frame can size its left margin to the
     tick labels it will actually draw */
  const values = bars.map(b => Number(b.value) || 0);
  const top = spec.max != null ? spec.max : Math.max(...values, 0);
  const base = spec.baseline != null ? spec.baseline : Math.min(0, ...values);
  const label = fmt(spec.valueFmt, String);
  const rawSpan = top - base || 1;
  const dom = [base - rawSpan * 0.1, top + rawSpan * 0.12];
  const longestWord = Math.max(0, ...bars.flatMap(b => String(b.label || "").split(/\s+/).map(w => textWidth(w, 10))));
  const longestValue = Math.max(0, ...values.map(v => textWidth(label(v), 10)));
  const slotNeed = Math.max(48, longestWord + 12, longestValue + 12);
  const requested = spec.w || 640;
  const baseFrame = frame({ ...spec, w: Math.max(requested, bars.length * slotNeed + 100) },
    dom, spec.ticks || 5);
  const slot = baseFrame.iw / bars.length;
  const labelLines = s => {
    const words = String(s == null ? "" : s).split(/\s+/).filter(Boolean);
    const lines = [];
    for (const word of words) {
      const last = lines.length - 1;
      if (last >= 0 && textWidth(lines[last] + " " + word, 10) <= slot - 8)
        lines[last] += " " + word;
      else lines.push(word);
    }
    return lines.length ? lines : [""];
  };
  const maxLines = Math.max(1, ...bars.map(b => labelLines(b.label).length));
  const m = { ...baseFrame.m, b: Math.max(baseFrame.m.b, 20 + maxLines * 16 + (spec.xlabel ? 16 : 0)) };
  const h = Math.max(baseFrame.h, m.t + m.b + 100);
  const f = { ...baseFrame, h, m, ih: h - m.t - m.b };
  const py = scale(dom, [f.m.t + f.ih, f.m.t]);

  const bw = Math.min(slot * 0.62, 74);

  /* A many-bar chart squeezes each category label into a few pixels once the
     browser scales it down, so past a dozen bars it gets an intrinsic minimum
     and the figure frame scrolls instead. */
  const wide = bars.length > 12 || f.w > 720;
  let out = `<svg viewBox="0 0 ${f.w} ${f.h}" class="fx"` +
    (wide ? ` style="min-width:${Math.min(Math.round(f.w), 760)}px"` :
      ` style="min-width:${Math.min(Math.round(f.w), 480)}px"`) +
    ` role="img" aria-label="${esc(caption || "Bar chart").replace(/"/g, "&quot;")}">`;
  out += grid(f, dom, spec.ticks || 5);

  bars.forEach((b, i) => {
    const v = Number(b.value) || 0;
    const x = f.m.l + slot * i + (slot - bw) / 2;
    const y = py(v), y0 = py(base);
    out += `<rect x="${x.toFixed(1)}" y="${Math.min(y, y0).toFixed(1)}" width="${bw.toFixed(1)}" ` +
      `height="${Math.abs(y0 - y).toFixed(1)}" rx="2" class="fx-bar" ` +
      `style="fill:${tone(b.accent != null ? b.accent : i)}"/>`;
    out += txt(x + bw / 2, v >= base ? y - 7 : y + 15, label(v), "fx-el");
    labelLines(b.label).forEach((ln, li) => {
      out += txt(x + bw / 2, f.m.t + f.ih + 17 + li * 16, ln, "fx-ax");
    });
  });
  out += axisLabels(f, spec);
  return out + "</svg>";
}
