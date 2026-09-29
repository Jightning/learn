/* Figure kind: plot */
import { esc, tone, round, fmt } from "./base.js";
import { frame, grid, xTicks, axisLabels, scale, tickLabels } from "./axes.js";
import { parseExpression } from "./expression.js";

/* ---------- kind: plot --------------------------------------------------
 * series: [{label, points:[[x,y]…]}] or [{label, fn:"x*x", from, to}]
 * ----------------------------------------------------------------------*/
export function plot (spec, caption = "") {
  var series = (spec.series || []).map(function (s) {
        if (s.points) return s;
        var from = s.from != null ? s.from : (spec.xrange ? spec.xrange[0] : 0),
            to = s.to != null ? s.to : (spec.xrange ? spec.xrange[1] : 10),
            n = Math.min(2000, Math.max(2, Number.isInteger(s.samples) ? s.samples : 80)), pts = [], f;
        try { f = parseExpression(s.fn); } catch (e) { return { label: s.label, points: [] }; }
        for (var i = 0; i <= n; i++) {
          var x = from + (to - from) * (i / n), y = f(x);
          if (Number.isFinite(y)) pts.push([x, y]);
        }
        return { label: s.label, points: pts, dash: s.dash };
      });

  var xf = fmt(spec.xfmt, round), yf = fmt(spec.yfmt, round);

  var xs = [], ys = [];
  series.forEach(function (s) { s.points.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
  if (!xs.length) return '<svg viewBox="0 0 620 300" class="fx"></svg>';
  var x0 = spec.xrange ? spec.xrange[0] : Math.min.apply(null, xs),
      x1 = spec.xrange ? spec.xrange[1] : Math.max.apply(null, xs),
      y0 = spec.yrange ? spec.yrange[0] : Math.min.apply(null, ys),
      y1 = spec.yrange ? spec.yrange[1] : Math.max.apply(null, ys);
  if (x1 === x0) x1 = x0 + 1;
  if (y1 === y0) y1 = y0 + 1;

  const ticks = spec.ticks || 5;
  const f = frame(spec, [y0, y1], ticks, yf, tickLabels([x0, x1], ticks, xf));
  const px = scale([x0, x1], [f.m.l, f.w - f.m.r]);
  const py = scale([y0, y1], [f.m.t + f.ih, f.m.t]);
  var out = `<svg viewBox="0 0 ${f.w} ${f.h}" class="fx" ` +
    `style="min-width:${Math.min(f.w, 760)}px" role="img" ` +
    `aria-label="${esc(caption || "Function plot").replace(/"/g, "&quot;")}">`;
  out += grid(f, [y0, y1], ticks, yf);
  out += xTicks(f, [x0, x1], ticks, xf);

  series.forEach(function (s, k) {
    if (!s.points.length) return;
    var d = s.points.map(function (p, j) {
      return (j ? "L" : "M") + px(p[0]).toFixed(1) + " " + py(p[1]).toFixed(1);
    }).join(" ");
    out += '<path d="' + d + '" class="fx-s" style="stroke:' + tone(k) + '"' +
      (s.dash ? ' stroke-dasharray="5 4"' : "") + "/>";
  });
  out += axisLabels(f, spec);
  out += "</svg>";
  if (series.length > 1 || spec.legend) {
    out += '<div class="fx-leg">' + series.map(function (s, k) {
      return '<span><i style="background:' + tone(k) + '"></i>' + esc(s.label || "series " + (k + 1)) + "</span>";
    }).join("") + "</div>";
  }
  return out;
}
