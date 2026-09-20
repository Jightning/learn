import { useState, useMemo, useEffect } from "preact/hooks";
import { searchRun } from "../lib/search.js";
import { present } from "../lib/gist.js";
import { decorate } from "../lib/refs.js";
import { renderBlock } from "../blocks/index.js";
import CatChip, { monogram } from "./CatChip.jsx";
import Dropdown, { Item } from "./Dropdown.jsx";
import { readNotes, isSaved, setSaved } from "../lib/notes.js";
import { md } from "../lib/md.js";
import { IconSaved } from "./Icon.jsx";

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

export default function Explore({ ctx, seed }) {
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

      {savedView ? <Saved ctx={ctx} /> : (
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

/* Written notes and marker-only saves share one collection. The marker is the
   blank-note case: it keeps a block without asking the learner to invent text,
   while real notes keep their prose and sit in the same section grouping. */
function Saved({ ctx }) {
  const { cid, C, idx } = ctx;
  const [markersOnly, setMarkersOnly] = useState(false);
  const [change, setChange] = useState(0);

  useEffect(() => {
    const refresh = e => { if (!e.detail || e.detail.cid === cid) setChange(n => n + 1); };
    addEventListener("learn:saved", refresh);
    return () => removeEventListener("learn:saved", refresh);
  }, [cid]);

  const groups = useMemo(() => {
    const bySection = new Map(C.sections.map(s => [s.id, { section: s, items: [] }]));
    for (const entry of idx.ANNOTATIONS) {
      const notes = readNotes(cid, entry.anchor);
      const marked = entry.kind === "block" && isSaved(cid, entry.anchor);
      if (!notes.length && !marked) continue;
      if (markersOnly && (!marked || notes.length)) continue;
      bySection.get(entry.sec.id).items.push({ ...entry, notes, marked });
    }
    return [...bySection.values()].filter(g => g.items.length);
  }, [C, cid, idx, markersOnly, change]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <div class="saved-view">
      <div class="saved-bar">
        <p>Notes and blocks you marked for later, kept in their course order.</p>
        <button type="button" class={"saved-filter" + (markersOnly ? " cur" : "")}
                aria-pressed={markersOnly ? "true" : "false"}
                onClick={() => setMarkersOnly(v => !v)}>
          Markers only
        </button>
        <span class="xcount">{total} {total === 1 ? "item" : "items"}</span>
      </div>
      {!groups.length && (
        <div class="saved-empty">
          <IconSaved />
          <p>{markersOnly ? "No blank markers yet." : "Nothing saved yet."}</p>
          <span>Use the small page tab beneath a block, or add a note while reading.</span>
        </div>
      )}
      {groups.map(g => (
        <section class="saved-group" key={g.section.id}>
          <header>
            <span>Section {String(g.section.num).padStart(2, "0")}</span>
            <h2>{g.section.title}</h2>
          </header>
          <div class="saved-list">
            {g.items.map(item => <SavedItem key={item.anchor} item={item} ctx={ctx} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function SavedItem({ item, ctx }) {
  const { cid, idx } = ctx;
  const p = item.b ? present(item.b, "notes") : null;
  const lead = p && p.lead;
  const href = `#/${cid}/${item.id}`;
  const unmark = () => setSaved(cid, item.anchor, false);
  return (
    <article class={"saved-card" + (item.marked && !item.notes.length ? " is-marker" : "")}>
      <div class="saved-card-h">
        <div>
          <span class="saved-at">{item.num} {item.sub.title}</span>
          <a href={href}>{item.title}</a>
        </div>
        {item.marked && (
          <button class="saved-toggle" type="button" aria-label="Remove this block from Saved"
                  title="Remove from Saved" onClick={unmark}>
            <IconSaved filled />
          </button>
        )}
      </div>
      {lead && (
        <div class="saved-claim bhtml" dangerouslySetInnerHTML={{
          __html: decorate(lead, cid, idx.FIG.byKey) }} />
      )}
      {item.notes.map((note, i) => (
        <div class="saved-note" key={i} dangerouslySetInnerHTML={{ __html: md(note) }} />
      ))}
      {!item.notes.length && <p class="saved-marker-label">Marked for later</p>}
    </article>
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
