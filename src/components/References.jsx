import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { courseReferences, filterReferences } from "../lib/references.js";
import { renderBlock } from "../blocks/index.js";
import { decorate } from "../lib/refs.js";
import { watchFigureScroll } from "../lib/figure-scroll.js";
import Inline from "./Inline.jsx";
import Modal from "./Modal.jsx";
import Slides from "./Slides.jsx";

function ReferenceBody({ entry, ctx }) {
  const root = useRef(null);
  useEffect(() => watchFigureScroll(root.current), [entry]);
  return <div class="ref-preview bhtml" ref={root}>
    {entry.block?.t === "slides"
      ? <Slides b={entry.block} ctx={ctx} fignum={entry.num} />
      : <div dangerouslySetInnerHTML={{ __html: decorate(entry.block
        ? renderBlock(entry.block, { fignum: entry.num }) : entry.body,
      ctx.cid, ctx.idx.FIG.byKey) }} />}
  </div>;
}

function ReferenceEntry({ entry, ctx, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  return <details class="ref-entry" onToggle={e => setExpanded(e.currentTarget.open)}>
    <summary><span class="ref-kind">{entry.kind} {entry.num}</span><Inline text={entry.title} /></summary>
    {expanded && <>
      <ReferenceBody entry={entry} ctx={ctx} />
      <a class="ref-source" href={entry.href} onClick={onNavigate}>Open explanation →</a>
    </>}
  </details>;
}

export default function References({ ctx, subId, route }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const position = useRef(null);
  const entries = useMemo(() => courseReferences(ctx.C, ctx.idx, ctx.cid, subId), [ctx, subId]);
  useEffect(() => { position.current = null; setOpen(false); setQuery(""); }, [route]);
  useEffect(() => {
    if (open || !position.current) return;
    const saved = position.current;
    position.current = null;
    // Native dialog focus restoration can scroll the document. Restore after
    // it closes; following an explanation link deliberately discards this place.
    const frame = requestAnimationFrame(() => scrollTo({ ...saved, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const navigate = () => { position.current = null; setOpen(false); };
  if (!entries.length) return null;
  const shown = filterReferences(entries, query);
  return <>
    <button class="tbtn" aria-label="Open references" onClick={() => {
      position.current = { left: scrollX, top: scrollY }; setOpen(true);
    }}>References</button>
    {open && <Modal title="References" className="reference-panel" onClose={() => setOpen(false)}>
      <label class="ref-search">Find a diagram, table, or concept
        <input type="search" value={query} onInput={e => setQuery(e.currentTarget.value)} />
      </label>
      <div class="ref-list" onClick={e => {
        if (e.target.closest("a[href]")) navigate();
      }}>
        {!shown.length && <p role="status">No matching references.</p>}
        {shown.map((entry, i) => <div key={entry.id}>
          {(i === 0 || entry.local !== shown[i - 1].local) &&
            <h3 class="ref-group">{entry.local ? "In this lesson" : "Course references"}</h3>}
          <ReferenceEntry entry={entry} ctx={ctx} onNavigate={navigate} />
        </div>)}
      </div>
    </Modal>}
  </>;
}
