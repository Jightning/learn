import { monogram } from "./CatChip.jsx";
import { get, label as phaseLabel } from "../lib/retention.js";

/* The index: everything this course names, and where it is.
 *
 * This replaces two pages that a reader could not tell apart. "Core concepts"
 * and "Categories" sat next to each other in the navigation, opened onto the
 * same grid of white cards, and both counted their members — so the only way
 * to learn which was which was to open both and read them. The distinction is
 * real and the docs state it plainly (a concept is a recurring idea with a
 * body; a category is a set with a boundary), but nothing on either page said
 * so, and two indexes that look identical are one index with a coin flip in
 * front of it.
 *
 * They are one page with two bands now, each labelled by the question it
 * answers. Ideas are what you have to hold in your head; kinds are the sets
 * the material is sorted into. Neither is a section, which is the third thing
 * they are both not, and saying that once at the top is cheaper than saying it
 * twice in two ledes.
 *
 * The detail pages are untouched. `#/<cid>/c/<key>` and `#/<cid>/cat/<key>`
 * are where the actual content is, and this is the way in.
 *
 * Ideas are alphabetical rather than grouped by first use. Grouping by the
 * section that first needs a concept is the course's own order, and the course
 * already has a surface for its own order — the rail down the left of every
 * page. An index is the surface you reach for when position has failed you, so
 * it is sorted the way an index is sorted, and the sections each entry appears
 * in are printed against it.
 */

/** one line of the ledger, whatever kind of thing it names */
function Row({ href, lead, name, badge, at, note }) {
  return (
    <a class="ix-row" href={href}>
      {lead}
      <span class="ix-name">{name}</span>
      {badge && <span class="ix-badge">{badge}</span>}
      {/* The leader. An index is read across, not down: without something
          carrying the eye from the entry to its locators the two columns are
          read as two lists that happen to share a row. */}
      <span class="ix-fill" aria-hidden="true" />
      <span class="ix-at">{at}</span>
      {note && <span class="ix-note">{note}</span>}
    </a>
  );
}

function Band({ title, count, one, many, hint, children }) {
  return (
    <section class="ix-band">
      <h2 class="ix-h">
        {title}
        <span class="ix-n">{count} {count === 1 ? one : many}</span>
      </h2>
      <p class="ix-hint">{hint}</p>
      {children}
    </section>
  );
}

export default function IndexPage({ ctx }) {
  const { C, cid, idx, drills } = ctx;
  const CAT = idx.CAT;

  const keys = Object.keys(C.concepts || {})
    .sort((a, b) => (C.concepts[a].term || a).localeCompare(C.concepts[b].term || b));

  /* Ranked by size: a category with two members is a label with ambition, and
     the ones that organise the course are the ones with a population. */
  const cats = Object.keys(CAT.cats)
    .map(k => ({ k, d: CAT.cats[k], n: (CAT.members[k] || []).length }))
    .sort((a, b) => b.n - a.n);

  return (
    <div class="ix">
      {/* No eyebrow. The breadcrumb and the rail both say "Index" already, and
          a third label above a heading that describes the page is a label
          telling you what you are looking at while you look at it. */}
      <h1>Index</h1>


      {keys.length > 0 && (
        <Band title="Concepts" count={keys.length} one="concept" many="concepts">
          <div class="ix-list">
            {keys.map(k => {
              const u = idx.CUSE[k] || [];
              const at = u.map(id => (idx.SUBS[id] ? idx.SUBS[id].num : null)).filter(Boolean);
              return (
                <Row key={k} href={`#/${cid}/c/${k}`}
                     name={C.concepts[k].term || k}
                     badge={drills.byConcept[k] ? phaseLabel(get(cid, k)) : null}
                     at={at.length
                       ? at.slice(0, 6).join("  ") + (at.length > 6 ? "  +" + (at.length - 6) : "")
                       : "not yet cited"} />
              );
            })}
          </div>
        </Band>
      )}

      {cats.length > 0 && (
        <Band title="Categories" count={cats.length} one="category" many="categories">
          <div class="ix-list">
            {cats.map(({ k, d, n }) => (
              <Row key={k} href={`#/${cid}/cat/${k}`}
                   lead={<span class="cchip-m" aria-hidden="true">{monogram(d.name || k, d.short)}</span>}
                   name={d.name || k}
                   note={d.boundary}
                   at={`${n} ${n === 1 ? "item" : "items"}`} />
            ))}
          </div>
        </Band>
      )}

      {CAT.tags.length > 0 && (
        <Band title="Tags" count={CAT.tags.length} one="tag" many="tags">
          <div class="tagrow">
            {CAT.tags.map(t => (
              <a class="gtag" key={t} href={`#/${cid}/explore/tag/${encodeURIComponent(t)}`}>
                #{t}<span class="tagn">{CAT.tagIndex[t].length}</span>
              </a>
            ))}
          </div>
        </Band>
      )}

      {!keys.length && !cats.length && (
        <p class="lede">
          This course declares neither yet. A concept is an idea it re-explains
          in three places; a category is a kind of thing it sorts material into.
        </p>
      )}
    </div>
  );
}
