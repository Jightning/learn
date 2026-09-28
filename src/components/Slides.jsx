import { useState, useRef, useEffect } from "preact/hooks";
import { Figures } from "../figures/index.js";
import { U } from "../blocks/index.js";
import { decorate } from "../lib/refs.js";
import { renderAnchors } from "../lib/asides.js";
import { strip } from "../lib/util.js";
import { slideIntent, slideSwipe } from "../lib/swipe.js";
import Inline from "./Inline.jsx";

/* One authored sequence lives in one reading row. During a drag, mount just
 * the neighboring frame so the next state follows the finger into view. */
export default function Slides({ b, ctx, fignum }) {
  const frames = Array.isArray(b.frames) ? b.frames : [];
  const [at, setAt] = useState(0);
  const [drag, setDrag] = useState(null);
  const start = useRef(null);
  const settleTimer = useRef(null);
  const stage = useRef(null);
  useEffect(() => () => clearTimeout(settleTimer.current), []);
  const frame = frames[Math.min(at, frames.length - 1)];
  if (!frame || typeof frame !== "object") return <p class="fx-miss">This slide has no content.</p>;
  const move = delta => {
    clearTimeout(settleTimer.current);
    setDrag(null);
    setAt(i => Math.max(0, Math.min(frames.length - 1, i + delta)));
  };
  const gestureStart = e => {
    if (drag?.settling || !e.isPrimary) return;
    start.current = { id: e.pointerId, x: e.clientX, y: e.clientY, direction: null, cancelled: false };
  };
  const gestureMove = e => {
    const gesture = start.current;
    if (!gesture || gesture.id !== e.pointerId || gesture.cancelled) return;
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
    if (!gesture.direction) {
      const intent = slideIntent(dx, dy);
      if (intent === "other") { gesture.cancelled = true; return; }
      if (!intent) return;
      if ((intent === "next" && at === frames.length - 1) || (intent === "previous" && at === 0)) {
        gesture.cancelled = true;
        return;
      }
      gesture.direction = intent;
      try { e.currentTarget.setPointerCapture(e.pointerId); }
      catch { /* Synthetic events have no active pointer to capture. */ }
    }
    const width = stage.current.getBoundingClientRect().width;
    const x = gesture.direction === "next" ? Math.max(-width, Math.min(0, dx))
      : Math.min(width, Math.max(0, dx));
    setDrag({ direction: gesture.direction, x, width, settling: false });
  };
  const gestureEnd = e => {
    const gesture = start.current;
    if (!gesture || gesture.id !== e.pointerId) return;
    start.current = null;
    if (!gesture.direction) return;
    const complete = e.type !== "pointercancel"
      && slideSwipe(e.clientX - gesture.x, e.clientY - gesture.y) === gesture.direction;
    const width = stage.current.getBoundingClientRect().width;
    const target = complete ? (gesture.direction === "next" ? -width : width) : 0;
    setDrag({ direction: gesture.direction, x: target, width, settling: true });
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (complete) move(gesture.direction === "next" ? 1 : -1);
      setDrag(null);
    }, 220);
  };
  const renderFrame = (index, hidden) => {
    const item = frames[index];
    const figure = item.figure;
    const visual = figure && Figures[figure.kind];
    let visualHtml = "";
    if (visual) {
      try { visualHtml = visual(figure.spec || {}, b.cap || ""); }
      catch (e) { visualHtml = `<p class="fx-miss">Visual could not be drawn.</p>`; }
    }
    return <div class="slides-frame" aria-hidden={hidden ? "true" : undefined} inert={hidden || undefined}
                aria-live={hidden ? undefined : "polite"} aria-atomic={hidden ? undefined : "true"} key={index}>
      {item.title && <h4><Inline text={item.title} /></h4>}
      {visual && <div class="slides-visual" dangerouslySetInnerHTML={{ __html: visualHtml }} />}
      {figure && !visual && <p class="fx-miss">Unknown visual kind.</p>}
      {item.image && <figure class="slides-image"><img src={item.image.src} alt={item.image.alt || ""} loading="lazy" /></figure>}
      {item.text && <div class="slides-text" dangerouslySetInnerHTML={{
        __html: decorate(renderAnchors(item.text), ctx.cid, ctx.idx.FIG.byKey)
      }} />}
    </div>;
  };
  const cap = U.caption(fignum, b.cap);
  const visible = drag ? (drag.direction === "next" ? [at, at + 1] : [at - 1, at]) : [at];
  const offset = drag ? (drag.direction === "previous" ? -drag.width : 0) + drag.x : 0;
  return <div class="slides" role="region" aria-label={strip(b.cap || "Step by step visual")}
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
    <div class="slides-stage" ref={stage} onPointerDown={gestureStart} onPointerMove={gestureMove}
         onPointerUp={gestureEnd} onPointerCancel={gestureEnd}>
      <div class={"slides-track" + (drag?.settling ? " settling" : "")}
           style={{ transform: `translate3d(${offset}px, 0, 0)` }}>
        {visible.map(index => renderFrame(index, index !== at))}
      </div>
    </div>
    <div class="slides-nav">
      <button type="button" onClick={() => move(-1)} disabled={at === 0} aria-label="Previous slide">← <span>Previous</span></button>
      <span class="slides-hint">Swipe or use arrow keys</span>
      <button type="button" onClick={() => move(1)} disabled={at === frames.length - 1} aria-label="Next slide"><span>Next</span> →</button>
    </div>
  </div>;
}
