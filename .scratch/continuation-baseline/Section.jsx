import { Fragment } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { renderBlock, isApart } from "../blocks/index.js";
import { INTERACTIVE } from "../blocks/interactive.js";
import { decorate, refsOf, buildsOn } from "../lib/refs.js";
import { runsOf } from "../lib/tiers.js";
import { present, topicsOf, leadList } from "../lib/gist.js";
import { blockId } from "../lib/index.js";
import { MarginRefs, UsedLater, RefChip } from "./MarginNote.jsx";
import Quiz from "./Quiz.jsx";
import KeyTerms from "./KeyTerms.jsx";
import { useNotes, NoteGrip, NoteCard } from "./Notes.jsx";
import TierStub, { DepthTab } from "./TierStub.jsx";
import Attempt from "./Attempt.jsx";
import CatChip from "./CatChip.jsx";
import Asides from "./Asides.jsx";
import { isFollow } from "../lib/follows.js";
import { renderAnchors, asidesOf, anchorKeys } from "../lib/asides.js";

/* Hovering either half of a pair lights both.
 *
 * The inline mention lives inside injected HTML, so it cannot take a prop: one
 * scoped effect marks both sides within this element only, rather than a global
 * delegated listener. A hook because two kinds of row need it — the reading
 * row, and the single row a closed depth draws for a whole run. An aside's
 * anchor carries no mark of its own at rest (52-asides.css), so this is the
 * only thing that says which phrase a card is about. */
function usePair() {
  const ref = useRef(null);
  const [hot, setHot] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll("[data-xr]").forEach(n =>
      n.classList.toggle("hot", hot != null && n.getAttribute("data-xr") === hot));
  }, [hot]);

  const track = on => e => {
    const t = e.target.closest?.("[data-xr]");
    setHot(on && t ? t.getAttribute("data-xr") : null);
  };
  return { ref, over: track(true), out: track(false) };
}

/* One reading row: content on the left, its references immediately to the
 * right. */
function ReadingRow({ html, notes, noteAt, noteLabel, apart, follow, ctx, id, children }) {
  const pair = usePair();
  /* The row owns the note because the note is in two of its zones: the grip at
     the foot of the block, and the card in the margin beside it. */
  const note = useNotes(ctx.cid, noteAt || null);

  return (
    <div class="brow" ref={pair.ref} id={id} data-apart={apart || undefined}
         data-follow={follow || undefined}
         onMouseOver={pair.over} onMouseOut={pair.out}>
      <div class="bmain">
        {html != null
          ? <div class="bhtml" dangerouslySetInnerHTML={{
              __html: decorate(renderAnchors(html), ctx.cid, ctx.idx.FIG.byKey) }} />
          : children}
        {/* Where a note is started: a grip on the block's own bottom edge,
            shown only while there is nothing to show in the margin. */}
        <NoteGrip n={note} />
      </div>
      <aside class="bside">
        {notes}
        {/* Last in the stack. A reference card has to sit level with the
            mention it annotates [T12] and a note does not, so when the two
            want the same row the note is what yields. */}
        <NoteCard n={note} label={noteLabel} />
      </aside>
    </div>
  );
}

/* One claim, as a note.
 *
 * Not a header with a paragraph under it. The row leads with the claim itself
 * and carries its name only where the name says something the claim does not —
 * a flat run of label-then-sentence is the linear list form that obscures the
 * relationships between items, which is the shape the evidence argues against
 * and the shape a reader recognises as a database rather than as notes.
 *
 * The whole row is the control, and it toggles: a block opened here closes
 * again from the same place. A disclosure that only opens is a one-way door,
 * and the reader who opened it to check one thing has no way back to the view
 * they were reading in.
 */
function NoteRow({ b, p, ctx, refs, open, onToggle, showCat, runIn }) {
  const points = leadList(p.lead);
  const body = p.mode === "lead";
  /* An authored label is context the claim does not carry — "The split trap"
     beside "random splits leak near-duplicates" says what kind of trouble this
     is. It runs into the claim rather than sitting above it, because a heading
     on its own line for every row is the stack of header-and-paragraph this
     view exists to stop being. */
  const lab = runIn && String(b.label || "").trim() ? b.label : null;
  const cls = `nrow is-${p.mode} t-${b.t}` + (open ? " is-open" : "") +
              (isFollow(b) ? " is-follow" : "");

  return (
    <div class={cls}>
      <button class="nrow-b" aria-expanded={open ? "true" : "false"}
              onClick={onToggle}
              title={open ? "Close this block" : "Open this block"}>
        {body
          ? (points
              ? <ul class="npoints">
                  {lab && <li class="nlab-li"><b class="nlab"
                              dangerouslySetInnerHTML={{ __html: lab }} /></li>}
                  {points.map((t, k) => (
                    <li key={k} dangerouslySetInnerHTML={{
                      __html: decorate(renderAnchors(t), ctx.cid, ctx.idx.FIG.byKey) }} />
                  ))}
                </ul>
              : <span class="nclaim">
                  {/* The space is a text node rather than the label's margin,
                      because a margin is not in the text layer: copied text and
                      a screen reader both ran the label into the claim. */}
                  {lab && <b class="nlab"
                             dangerouslySetInnerHTML={{ __html: lab + "." }} />}
                  {lab && " "}
                  {/* A claim can carry an aside's anchor too, and where it
                      does the pairing works here exactly as it does in the
                      full block. */}
                  <span dangerouslySetInnerHTML={{
                    __html: decorate(renderAnchors(p.lead), ctx.cid, ctx.idx.FIG.byKey) }} />
                </span>)
          : <span class="nname">{p.name}</span>}
      </button>
      {(showCat || refs.length > 0) && (
        <div class="nmeta">
          {showCat && b.cat && <CatChip ctx={ctx} k={b.cat} />}
          {refs.map(r => <RefChip key={r.kind + r.id} r={r} ctx={ctx} />)}
        </div>
      )}
    </div>
  );
}

/* A click that ends a drag is a selection, not a press.
 *
 * The title is the control, so the title is also the text a reader most wants
 * to copy — a term, a rule, a caption. Closing the block out from under them
 * mid-drag loses both the selection and their place. A collapsed selection
 * means nothing is highlighted, which is the difference between the two. */
const press = fn => e => {
  const sel = typeof getSelection === "function" ? getSelection() : null;
  if (sel && !sel.isCollapsed) return;
  if (e.target.closest && e.target.closest("a")) return;
  fn();
};

/* One subsection's blocks, filtered by the lane and closed by the depth.
 *
 * The two compose in that order and only that order: the lane decides which
 * blocks are in the document at all, and the depth decides how much of each
 * surviving block is open.
 *
 * At a closed depth the blocks are grouped into topics before they are drawn.
 * A definition opens a topic and the rules, instances and traps that follow it
 * belong to that topic — the order M10 already fixes — so related claims sit
 * together instead of running down the page as one undifferentiated column.
 * That proximity is the whole mechanism the note-format evidence identifies.
 */
/* The source declared by the block immediately above this one, or null.
 *
 * Read from the subsection's own block list rather than threaded through the
 * render loop, because a run the lane has hidden still sits between two visible
 * blocks in the material — and "still the one above" is a claim about what the
 * author wrote, not about what this lane happens to be showing. */
function prevSourceOf(blocks, i) {
  const prev = (blocks || [])[i - 1];
  return prev && prev.source ? prev.source : null;
}

function Blocks({ sub, ctx, lane, depth, expandAll, openAt }) {
  const { cid, idx } = ctx;
  const [openRun, setOpenRun] = useState({});
  const [openBlk, setOpenBlk] = useState({});
  const runs = runsOf(sub.blocks || [], lane);
  /* A closed depth draws one row for a whole run, so it has one margin rail
     rather than one per block. What a block would have put in its own margin
     is gathered there instead — see `railAsides`. */
  const compact = depth !== "full";

  /* "Reveal all" is a page-level override, and turning it off has to put the
     page back the way the depth had it rather than leaving whatever the reader
     happened to have opened underneath. */
  useEffect(() => { if (!expandAll) { setOpenRun({}); setOpenBlk({}); } }, [expandAll]);
  useEffect(() => { setOpenBlk({}); }, [depth]);

  const lead = runs.find(r => !r.hidden || openRun[r.items[0].i] || expandAll);
  const leadIndex = lead ? lead.items[0].i : -1;

  const openBlock = i => setOpenBlk(o => ({ ...o, [i]: true }));

  /* A block rendered in full: the reading row, exactly as it has always been.
   * `extra` leads the margin, and is how a run's own control reaches it. */
  const fullRow = ({ b, i }, extra) => {
    const refs = refsOf(b);
    /* Asides lead the margin: they annotate a phrase in this block and have
       no page of their own, so they are never the ones demoted to chips. At a
       closed depth the run's rail carries them instead, so the same card is
       never drawn twice. */
    const notes = (
      <>
        {extra}
        {!compact && <Asides b={b} ctx={ctx} />}
        {i === leadIndex && <UsedLater id={sub.id} ctx={ctx} compact={refs.length > 0} />}
        <MarginRefs refs={refs} ctx={ctx} />
      </>
    );
    const follow = isFollow(b) && i > 0;
    const at = `${sub.id}#${i}`;
    if (INTERACTIVE.includes(b.t))
      return (
        <ReadingRow key={i} id={blockId(sub.id, i)} ctx={ctx} notes={notes} noteAt={at}
                    follow={follow}>
          <Attempt b={b} cid={cid} anchor={`${sub.id}#${i}@attempt`} />
        </ReadingRow>
      );
    return (
      <ReadingRow key={i} id={blockId(sub.id, i)} ctx={ctx} notes={notes} noteAt={at}
                  apart={isApart(b.t)} follow={follow}
                  html={renderBlock(b, { fignum: idx.FIG.numOf(b),
                                        prevSource: prevSourceOf(sub.blocks, i) })} />
    );
  };

  /*
   * Every aside the depth is showing, gathered into the run's one rail.
   *
   * An aside is the course explaining a phrase the reader may not know, and
   * help that exists in one reading mode is help nobody can rely on — so it
   * survives the switch to Review. What cannot survive is the alignment: at
   * full depth the card sits level with the phrase it annotates [T12], and a
   * closed depth has no row to sit level with, because the block is one line.
   * The cards therefore stack in the run's rail and the pairing is made on
   * hover (`usePair`) instead of by position.
   *
   * `paired` is the anchors whose phrase is actually on the page — a block
   * closed to its claim renders only the anchors inside that claim, and one
   * closed to its name renders none. A card that can light nothing offers the
   * way to its phrase instead of a pairing that would do nothing.
   */
  const railAsides = items => {
    const out = [];
    for (const it of items) {
      const { b, i } = it;
      if (!asidesOf(b).length) continue;
      const p = present(b, depth);
      const open = expandAll || !!openBlk[i] || openAt === i || p.mode === "full";
      if (p.mode === "hidden" && !open) continue;
      /* Names is the lookup surface — entries, and nothing under them. A card
         of prose beside a column of names is the one thing that view promises
         not to be, so there an aside waits until the reader opens the block. */
      if (depth === "index" && !open) continue;
      const paired = open ? null
        : p.mode === "lead" ? new Set(anchorKeys(p.lead)) : new Set();
      out.push(
        <Asides key={i} b={b} ctx={ctx} paired={paired} onOpen={() => openBlock(i)} />
      );
    }
    return out;
  };

  /* A run the lane is showing, drawn at a closed depth. */
  const drawRun = items => {
    const topics = topicsOf(items);
    /* One mention of a category per subsection. Seven identical chips down one
       page is decoration, and a signal repeated on every row is a signal the
       eye has already learned to skip (T13). */
    const seenCat = new Set();
    return topics.map((topic, t) => {
      const rows = [];

      const draw = it => {
        const { b, i } = it;
        const p = present(b, depth);
        const byReader = !!openBlk[i];
        const forced = expandAll || byReader || openAt === i;
        if (p.mode === "hidden" && !forced) return;
        if (forced || p.mode === "full") {
          if (b.cat) seenCat.add(b.cat);
          rows.push(byReader
            ? <div class="nopen" key={"o" + i}>
                {/* The same title the closed row showed, still the control.
                    Opening and closing are one gesture in one place rather
                    than an open here and a close somewhere else, and the
                    block's own label is hidden beneath so the title is not
                    printed twice. */}
                <button class="nopen-h" aria-expanded="true" title="Close this block"
                        onClick={press(() => setOpenBlk(o => {
                          const n = { ...o }; delete n[i]; return n;
                        }))}>
                  {p.name}
                </button>
                {fullRow(it)}
              </div>
            : fullRow(it));
          return;
        }
        const showCat = !!b.cat && !seenCat.has(b.cat);
        if (b.cat) seenCat.add(b.cat);
        rows.push(
          <NoteRow key={i} b={b} p={p} ctx={ctx} refs={refsOf(b)} showCat={showCat}
                   runIn open={false} onToggle={press(() => openBlock(i))} />
        );
      };

      const head = topic.head;
      const headP = head ? present(head.b, depth) : null;

      if (head && headP.mode !== "full") {
        const headCat = !!head.b.cat && !seenCat.has(head.b.cat);
        if (head.b.cat) seenCat.add(head.b.cat);
        /* Three things open a definition and they are not the same thing: the
           reader pressing its heading, "Reveal all", and a link addressed at
           it. Only the first is the heading's to toggle, but all three have to
           render it open — dropping the other two left Reveal all with closed
           rows under it and made a block address land on a closed block, which
           is the address lying about where it went. */
        const headOpen = !!openBlk[head.i] || expandAll || openAt === head.i;
        rows.push(
          <div class={"ntopic-h" + (headOpen ? " is-open" : "")}
               key={"h" + head.i} id={blockId(sub.id, head.i)}>
            {/* The heading IS the term, and it is also the toggle. It stays put
                whether the definition is open or closed, so the thing you press
                to open is the thing you press to close. */}
            <button class="ntopic-b" aria-expanded={headOpen ? "true" : "false"}
                    title={headOpen ? "Close this definition" : "Open this definition"}
                    onClick={press(() => setOpenBlk(o => {
                      const n = { ...o };
                      if (headOpen) delete n[head.i]; else n[head.i] = true;
                      return n;
                    }))}>
              <h4 class="ntopic-t">{nameOfHead(head.b)}</h4>
            </button>
            {headOpen && fullRow(head)}
            {!headOpen && headP.mode === "lead" && (
              <NoteRow b={head.b} p={headP} ctx={ctx} refs={refsOf(head.b)}
                       showCat={headCat} runIn open={false}
                       onToggle={press(() => setOpenBlk(o => ({ ...o, [head.i]: true })))} />
            )}
            {!headOpen && headP.mode !== "lead" && (headCat || refsOf(head.b).length > 0) && (
              <div class="nmeta ntopic-m">
                {headCat && head.b.cat && <CatChip ctx={ctx} k={head.b.cat} />}
                {refsOf(head.b).map(r => <RefChip key={r.kind + r.id} r={r} ctx={ctx} />)}
              </div>
            )}
          </div>
        );
      } else if (head) {
        /* A definition the depth itself renders open — its kind or its own
           `notes: open` says so. There is nothing for the reader to close, so
           there is no control to offer. */
        rows.push(fullRow(head));
      }

      topic.items.forEach(draw);
      if (!rows.length) return null;
      return (
        <div class="ntopic" key={"t" + t}>
          {rows}
        </div>
      );
    });
  };

  /* Opening a collapsed run and closing it again are one gesture in one place.
     A disclosure that only opens is the one-way door NoteRow already refuses to
     be: the reader who opened a "why" to check one thing had no way back to the
     lane they were reading in short of changing the lane. */
  const toggleRun = at => press(() => setOpenRun(o => {
    const n = { ...o };
    if (n[at]) delete n[at]; else n[at] = true;
    return n;
  }));

  return runs.map(run => {
    const at = run.items[0].i;
    const shown = !run.hidden || !!openRun[at] || expandAll;
    /* The run's own control, in the margin. `expandAll` is a page-level
       override rather than a state of this run, so it offers nothing to press:
       collapsing one run underneath "Reveal all" would make the button a lie. */
    const tab = run.hidden && !expandAll
      ? <DepthTab items={run.items} open={shown} onToggle={toggleRun(at)} />
      : null;

    if (shown) {
      /* At full depth the run is its blocks, so the control rides the margin of
         the first of them — there is no row of the run's own to put it in. */
      if (!compact)
        return (
          <Fragment key={"r" + at}>
            {run.items.map((it, k) => fullRow(it, k === 0 ? tab : null))}
          </Fragment>
        );
      return (
        <PairRow key={"r" + at} cls="brow nbrow"
                 side={<>{tab}{railAsides(run.items)}</>}>
          {drawRun(run.items)}
        </PairRow>
      );
    }

    /* Collapsed. At full depth the stub is a line in the reading column naming
       what it holds, which is what a first read wants. A closed depth has
       already given up naming things it is not showing, and a dashed rule
       across the measure is the loudest thing on a page of one-line rows — so
       there the run is a tab in the margin and the column keeps its rhythm. */
    if (compact) return <PairRow key={"stub" + at} cls="brow nbrow" side={tab} />;
    return (
      <ReadingRow key={"stub" + at} ctx={ctx} notes={null} follow={run.attached}>
        <TierStub items={run.items} ctx={ctx} attached={run.attached}
                  refs={refsOf(run.items.map(x => x.b))}
                  onExpand={toggleRun(at)} />
      </ReadingRow>
    );
  });
}

/* A row whose two halves light each other, with no block of its own.
 *
 * The reading row is a block and its margin; this is a run and its margin —
 * several closed blocks on the left, one stack of cards on the right. It
 * carries no note grip, because a note is anchored to a block and this row is
 * not one. */
function PairRow({ cls, side, children }) {
  const pair = usePair();
  return (
    <div class={cls} ref={pair.ref} onMouseOver={pair.over} onMouseOut={pair.out}>
      <div class="bmain">{children}</div>
      <aside class="bside">{side}</aside>
    </div>
  );
}

/** a topic heading reads as the term, never as the engine's word for it */
const nameOfHead = b => b.term || b.label || "";

/* Named in full rather than concatenated from a prefix, so every class the
   page can wear is a literal the stylesheet lint can find. */
const depthClass = d => (d === "index" ? " depth-index" : d === "notes" ? " depth-notes" : "");

export default function Section({ section, ctx, expandAll, lane, onLane, depth, onDepth, openBlock }) {
  const { C, cid, idx } = ctx;
  const H = r => `#/${cid}/${r}`;
  const prereq = buildsOn(idx.SUBS, C.sections, section);
  const si = C.sections.indexOf(section);
  const prev = C.sections[si - 1], next = C.sections[si + 1];

  return (
    <section class={"sec-body" + depthClass(depth)} id={section.id}>
      <div class="sec-head">
        <span class="eyebrow">Section {String(section.num).padStart(2, "0")} of {C.sections.length}</span>
        <h2>{section.title}</h2>
        <p class="sec-blurb">{section.blurb}</p>
        {prereq.length > 0 && (
          <div class="builds">
            <span class="bl">Builds on</span>
            {prereq.map(p => <a key={p.id} href={H(p.id)}>{p.label}</a>)}
          </div>
        )}
        {/* the map answers "what does this sit between", which is a question
            you have here, not back in the course nav */}
        <a class="sec-where" href={H(`map/${section.id}`)}>Dependency Map</a>
      </div>
      {/* The panel names the section's terms, which is exactly what a closed
          depth already puts on the page as its topic headings. Showing both is
          the same list twice, so it yields to the material. */}
      {depth === "full" && <KeyTerms section={section} ctx={ctx} />}
      <div class="sec-rule" />

      {section.subs.map((sub, k) => {
        const num = `${section.num}.${k + 1}`;
        const openAt = openBlock && openBlock.subId === sub.id ? openBlock.at : -1;
        return (
          <div class="sub" id={sub.id} key={sub.id}>
            <ReadingRow ctx={ctx}
              notes={(sub.blocks || []).length === 0
                ? <UsedLater id={sub.id} ctx={ctx} />
                : null}
              noteAt={sub.id}>
              <h3><span class="sid">{num}</span>{sub.title}</h3>
            </ReadingRow>

            <Blocks sub={sub} ctx={ctx} lane={lane} depth={depth}
                    expandAll={expandAll} openAt={openAt} />

            {(sub.quiz || []).length > 0 && (
              <ReadingRow ctx={ctx}
                notes={depth === "full" ? <MarginRefs refs={refsOf(sub.quiz)} ctx={ctx} /> : null}>
                <Quiz sub={sub} num={num} ctx={ctx} expandAll={expandAll} depth={depth} />
              </ReadingRow>
            )}
          </div>
        );
      })}

      <div class="pager">
        {prev
          ? <a href={H(prev.id)}><span class="dir">← Previous</span><span class="pt">{prev.title}</span></a>
          : <div class="sp" />}
        {next
          ? <a class="nx" href={H(next.id)}><span class="dir">Next →</span><span class="pt">{next.title}</span></a>
          : <div class="sp" />}
      </div>
    </section>
  );
}
