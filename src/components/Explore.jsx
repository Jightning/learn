import { useState, useMemo, useEffect } from "preact/hooks";
import { searchRun } from "../lib/search.js";
import { present } from "../lib/gist.js";
import { decorate } from "../lib/refs.js";
import { renderBlock, isApart } from "../blocks/index.js";
import { INTERACTIVE } from "../blocks/interactive.js";
import CatChip, { monogram } from "./CatChip.jsx";
import Dropdown, { Item } from "./Dropdown.jsx";
import { readNotes } from "../lib/notes.js";
import { IconSaved } from "./Icon.jsx";
import { ReadingRow, NoteRow } from "./Section.jsx";
import Attempt from "./Attempt.jsx";

/* Explore — search with the facets the overlay deliberately does not have.
 *
 * The overlay stays exactly as it was. It answers "take me there", it opens on
 * `/`, and one input with one list is the right shape for that question: a
 * reader typing a word they half-remember does not want a filter panel in
 * front of them. This page answers the other question — "show me everything of
 * this kind" — which needs facets, needs to be linkable, and needs to be able
 * to return *nothing but* a category.
 *
 * With no query it browses rather than searches, because a category with no
 * search terms is a perfectly good request and returning an empty page for it
 * would be the feature refusing the thing it was built for.
 *
 * Results carry a depth of their own. Reading a whole category at `notes` and
 * opening the two entries you do not recognise is the loop this page is for —
 * which is discovery, and discovery is what an outline measurably helps with
 * (provided outlines raise memory, g = 0.61, and not comprehension, g = 0.34
 * n.s.; Ponce, Mayer & Méndez 2023). So the page starts compact and never
 * pretends to be a substitute for reading the section.
 */

const KINDS = [
  { id: "block",   label: "Items" },
  { id: "sub",     label: "Subsections" },
  { id: "section", label: "Sections" },
  { id: "concept", label: "Concepts" }
];

const SHOW = [
  { id: "index", label: "Names",      hint: "the entry alone" },
  { id: "notes", label: "Claims",     hint: "what each one asserts" },
  { id: "full",  label: "Everything", hint: "the whole block" }
];

export default function Explore({ ctx, seed, depth: readingDepth = "notes" }) {
  const { C, cid, idx } = ctx;
  const CAT = idx.CAT;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(seed && seed.cat ? seed.cat : "");
  const [tag, setTag] = useState(seed && seed.tag ? seed.tag : "");
  const [kinds, setKinds] = useState([]);
  const [depth, setDepth] = useState("notes");
  const savedView = !!(seed && seed.saved);

  /* A link into this page carries the facet it meant. Re-seeding on the route
     rather than on mount so following a second tag chip from the results
     actually moves the page. */
  useEffect(() => {
    setCat(seed && seed.cat ? seed.cat : "");
    setTag(seed && seed.tag ? seed.tag : "");
  }, [seed && seed.cat, seed && seed.tag]);

  const filter = useMemo(() => {
    return e => {
      if (kinds.length && !kinds.includes(e.kind)) return false;
      if (cat && e.cat !== cat) return false;
      if (tag && !(e.tags || []).includes(tag)) return false;
      return true;
    };
  }, [kinds, cat, tag]);

  const faceted = !!(cat || tag || kinds.length);

  /* Searching ranks; browsing lists. Both respect the same facets, so the
     controls do not change meaning when the query box empties. */
  const res = useMemo(() => {
    const query = q.trim();
    if (query) return searchRun(idx.SEARCH, query, { filter, limit: 80 });
    if (!faceted) return [];
    return idx.SEARCH.filter(filter).slice(0, 200)
      .map(e => ({ e, parts: null, title: null }));
  }, [q, idx, filter, faceted]);

  const toggleKind = k =>
    setKinds(v => (v.includes(k) ? v.filter(x => x !== k) : [...v, k]));

  const catKeys = Object.keys(CAT.cats);
  const active = cat ? CAT.cats[cat] : null;

  return (
    <div class="explore">
      <div class="xhead">
        <h1>{savedView ? "Saved" : "Explore"}</h1>
        <nav class="xviews" aria-label="Explore views">
          <a href={`#/${cid}/explore`} class={!savedView ? "cur" : ""}>Discover</a>
          <a href={`#/${cid}/explore/saved`} class={savedView ? "cur" : ""}>
            <IconSaved /> Saved
          </a>
        </nav>
      </div>

      {savedView ? <Saved ctx={ctx} depth={readingDepth} /> : (
        <>

      <div class="xbar">
        <input class="xq" type="search" value={q} placeholder="Search, or leave empty and filter…"
               autocomplete="off" spellcheck={false}
               onInput={e => setQ(e.currentTarget.value)} />
        {(q || faceted) && (
          <button class="lane-b" onClick={() => { setQ(""); setCat(""); setTag(""); setKinds([]); }}>
            Clear
          </button>
        )}
      </div>

      <div class="xfacets">
        <Dropdown label="Kind"
                  value={kinds.length === 0 ? "" : kinds.length === 1
                    ? KINDS.find(k => k.id === kinds[0]).label
                    : `${kinds.length} kinds`}>
          {() => (
            <>
              <Item sel={!kinds.length} text="Anything" onPick={() => setKinds([])} />
              {KINDS.map(k => (
                <Item key={k.id} multi sel={kinds.includes(k.id)} text={k.label}
                      onPick={() => toggleKind(k.id)} />
              ))}
            </>
          )}
        </Dropdown>

        {catKeys.length > 0 && (
          <Dropdown label="Category" wide
                    value={cat ? (CAT.cats[cat].name || cat) : ""}>
            {close => (
              <>
                <Item sel={!cat} text="Any category"
                      onPick={() => { setCat(""); close(); }} />
                {catKeys.map(k => (
                  <Item key={k} sel={cat === k}
                        lead={<span class="cchip-m" aria-hidden="true">
                          {monogram(CAT.cats[k].name || k, CAT.cats[k].short)}</span>}
                        text={CAT.cats[k].name || k}
                        sub={CAT.cats[k].boundary}
                        n={(CAT.members[k] || []).length}
                        onPick={() => { setCat(cat === k ? "" : k); close(); }} />
                ))}
              </>
            )}
          </Dropdown>
        )}

        {CAT.tags.length > 0 && (
          <Dropdown label="Tag" value={tag ? "#" + tag : ""}>
            {close => (
              <>
                <Item sel={!tag} text="Any tag" onPick={() => { setTag(""); close(); }} />
                {CAT.tags.map(t => (
                  <Item key={t} sel={tag === t} text={"#" + t} n={CAT.tagIndex[t].length}
                        onPick={() => { setTag(tag === t ? "" : t); close(); }} />
                ))}
              </>
            )}
          </Dropdown>
        )}

        {/* Always carries a value, because there is no such thing as showing
            no amount of a result. */}
        <Dropdown label="Show" value={SHOW.find(d => d.id === depth).label}>
          {close => SHOW.map(d => (
            <Item key={d.id} sel={d.id === depth} text={d.label} sub={d.hint}
                  onPick={() => { setDepth(d.id); close(); }} />
          ))}
        </Dropdown>

        <p class="xcount">
          {res.length
            ? `${res.length}${res.length === 200 ? "+" : ""} ${res.length === 1 ? "result" : "results"}`
            : q.trim() || faceted ? "Nothing found." : ""}
        </p>
      </div>

      {active && (
        <div class="xcat">
          <h2>{active.name || cat}</h2>
          {active.boundary && <p>{active.boundary}</p>}
          <a class="dbtn ghost" href={`#/${cid}/cat/${cat}`}>Open the category page →</a>
        </div>
      )}

      <div class="xres">
        {res.map(r => <Row key={r.e.id} r={r} ctx={ctx} depth={depth} />)}
      </div>
        </>
      )}
    </div>
  );
}

/* Saved is one synthetic section made from the course's annotated
   subsections. It deliberately uses the same rows, note cards and depth rules
   as the source material instead of inventing a second collection design. */
function Saved({ ctx, depth }) {
  const { cid, idx } = ctx;
  const [synced, setSynced] = useState(0);

  useEffect(() => {
    const onSync = e => { if (e.detail.notes) setSynced(n => n + 1); };
    addEventListener("learn:synced", onSync);
    return () => removeEventListener("learn:synced", onSync);
  }, []);

  const groups = useMemo(() => {
    const bySub = new Map();
    for (const entry of idx.ANNOTATIONS) {
      const notes = readNotes(cid, entry.anchor);
      if (!notes.length) continue;
      let group = bySub.get(entry.sub.id);
      if (!group) {
        group = { sub: entry.sub, sec: entry.sec, num: entry.num,
                  noted: false, items: [] };
        bySub.set(entry.sub.id, group);
      }
      if (entry.kind === "sub") group.noted = true;
      else group.items.push(entry);
    }
    return [...bySub.values()];
  }, [cid, idx, synced]);

  return (
    <div class="saved-view">
      {!groups.length && (
        <div class="saved-empty">
          <IconSaved />
          <p>Nothing saved yet.</p>
          <span>Add a note while reading; leave it blank to save the block without writing.</span>
        </div>
      )}
      <section class={"saved-section" + (depth === "index" ? " depth-index" : depth === "notes" ? " depth-notes" : "")}>
        {groups.map(g => (
          <div class="sub" key={g.sub.id}>
            <ReadingRow ctx={ctx} noteAt={g.noted ? g.sub.id : null}>
              <h3>
                <span class="sid">{g.num}</span>
                <a class="saved-origin" href={`#/${cid}/${g.sub.id}`}>{g.sub.title}</a>
              </h3>
            </ReadingRow>
            {g.items.map(item => (
              <SavedBlock key={item.anchor} item={item} ctx={ctx} depth={depth} />
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

function SavedBlock({ item, ctx, depth }) {
  const { cid, idx } = ctx;
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [depth]);
  const b = item.b;
  let p = present(b, open ? "full" : depth);
  if (p.mode === "hidden") p = { ...p, mode: "closed", name: item.title };
  const full = open || p.mode === "full";
  const prev = item.sub.blocks[item.at - 1];

  if (full) {
    const row = (
      <ReadingRow ctx={ctx} noteAt={item.anchor} apart={isApart(b.t)}>
      {INTERACTIVE.includes(b.t)
        ? <Attempt b={b} cid={cid} anchor={`${item.sub.id}#${item.at}@attempt`} />
        : <div class="bhtml" dangerouslySetInnerHTML={{ __html: decorate(
            renderBlock(b, { fignum: idx.FIG.numOf(b),
                             prevSource: prev && prev.source ? prev.source : null }),
            cid, idx.FIG.byKey) }} />}
      </ReadingRow>
    );
    if (!open) return row;
    return (
      <div class="nopen">
        <button class="nopen-h" type="button" aria-expanded="true"
                title="Close this block" onClick={() => setOpen(false)}>
          {item.title}
        </button>
        {row}
      </div>
    );
  }

  return (
    <ReadingRow ctx={ctx} noteAt={item.anchor}>
      <NoteRow b={b} p={p} ctx={ctx} refs={[]} showCat={false} runIn
               open={false} onToggle={() => setOpen(true)} />
    </ReadingRow>
  );
}

const Marked = ({ run, plain }) =>
  run ? run.map((p, i) => (p.hit ? <mark key={i}>{p.t}</mark> : p.t)) : plain;

function Row({ r, ctx, depth }) {
  const { cid, idx } = ctx;
  const [open, setOpen] = useState(false);
  const e = r.e;
  const entry = e.kind === "block" ? idx.BLOCKS[e.id] : null;
  const b = entry && entry.b;
  const p = b ? present(b, open ? "full" : depth) : null;

  return (
    <div class={`xrow k-${e.kind}`}>
      <div class="xrow-h">
        <span class="xnum">{e.num || "◈"}</span>
        <a class="xname" href={`#/${cid}/${e.id}`}>
          <Marked run={r.title} plain={e.title} />
        </a>
        <span class="xctx">{e.kind === "block" ? e.t : e.ctx}</span>
      </div>

      {b && p && p.mode === "full" && (
        <div class="bhtml" dangerouslySetInnerHTML={{
          __html: decorate(renderBlock(b, { fignum: idx.FIG.numOf(b) }), cid, idx.FIG.byKey) }} />
      )}
      {b && p && p.mode !== "full" && p.lead && (
        <div class="glead bhtml" dangerouslySetInnerHTML={{
          __html: decorate(p.lead, cid, idx.FIG.byKey) }} />
      )}
      {!b && r.parts && <p class="xsnip"><Marked run={r.parts} /></p>}

      <div class="gmeta">
        {e.cat && <CatChip ctx={ctx} k={e.cat} />}
        {(e.tags || []).filter(t => t !== e.cat).map(t => (
          <a class="gtag" key={t} href={`#/${cid}/explore/tag/${encodeURIComponent(t)}`}>#{t}</a>
        ))}
        {b && p && p.mode !== "full" && p.more && (
          <button class="gmore" onClick={() => setOpen(true)}>open</button>
        )}
      </div>
    </div>
  );
}
