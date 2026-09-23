import { useState, useRef } from "preact/hooks";
import { Figures } from "../figures/index.js";
import { U } from "../blocks/index.js";
import { decorate } from "../lib/refs.js";
import { renderAnchors } from "../lib/asides.js";
import { strip } from "../lib/util.js";
import { slideSwipe } from "../lib/swipe.js";

/* One authored sequence lives in one reading row. Only its current frame is
 * mounted, so a long algorithm can be stepped through without a tall page. */
export default function Slides({ b, ctx, fignum }) {
  const frames = Array.isArray(b.frames) ? b.frames : [];
  const [at, setAt] = useState(0);
  const start = useRef(null);
  const touchAt = useRef(0);
  const frame = frames[Math.min(at, frames.length - 1)];
  if (!frame || typeof frame !== "object") return <p class="fx-miss">This slide has no content.</p>;
  const move = delta => setAt(i => Math.max(0, Math.min(frames.length - 1, i + delta)));
  const gestureStart = e => {
    const point = e.touches ? e.touches[0] : e;
    if (e.touches) touchAt.current = Date.now();
    start.current = [point.clientX, point.clientY];
  };
  const gestureEnd = e => {
    if (e.type.startsWith("mouse") && Date.now() - touchAt.current < 500) return;
    if (!start.current) return;
    const point = e.changedTouches ? e.changedTouches[0] : e;
    const dx = point.clientX - start.current[0];
    const dy = point.clientY - start.current[1];
    start.current = null;
    const direction = slideSwipe(dx, dy);
    if (direction) move(direction === "next" ? 1 : -1);
  };
  const figure = frame.figure;
  const visual = figure && Figures[figure.kind];
  let visualHtml = "";
  if (visual) {
    try { visualHtml = visual(figure.spec || {}); }
    catch (e) { visualHtml = `<p class="fx-miss">Visual could not be drawn.</p>`; }
  }
  const cap = U.caption(fignum, b.cap);
  return <div class="slides" role="region" aria-label={strip(b.cap || "Step by step visual")}
              onMouseDown={gestureStart} onMouseUp={gestureEnd}
              onTouchStart={gestureStart} onTouchEnd={gestureEnd}
              onMouseLeave={() => { if (!touchAt.current) start.current = null; }}
              onKeyDown={e => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault(); move(e.key === "ArrowRight" ? 1 : -1);
                }
              }}>
    {cap && <span class="fcap" dangerouslySetInnerHTML={{ __html: cap }} />}
    <div class="slides-head">
      <span class="slides-count">{at + 1} / {frames.length}</span>
      <span class="slides-progress" aria-hidden="true"><i style={{ width: `${(at + 1) / frames.length * 100}%` }} /></span>
    </div>
    <div class="slides-frame" aria-live="polite" aria-atomic="true">
      {frame.title && <h4>{frame.title}</h4>}
      {visual && <div class="slides-visual" dangerouslySetInnerHTML={{ __html: visualHtml }} />}
      {figure && !visual && <p class="fx-miss">Unknown visual kind.</p>}
      {frame.image && <figure class="slides-image"><img src={frame.image.src} alt={frame.image.alt || ""} loading="lazy" /></figure>}
      {frame.text && <div class="slides-text" dangerouslySetInnerHTML={{
        __html: decorate(renderAnchors(frame.text), ctx.cid, ctx.idx.FIG.byKey)
      }} />}
    </div>
    <div class="slides-nav">
      <button type="button" onClick={() => move(-1)} disabled={at === 0} aria-label="Previous slide">← <span>Previous</span></button>
      <span class="slides-hint">Swipe or use arrow keys</span>
      <button type="button" onClick={() => move(1)} disabled={at === frames.length - 1} aria-label="Next slide"><span>Next</span> →</button>
    </div>
  </div>;
}
