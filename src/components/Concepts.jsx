import { decorate } from "../lib/refs.js";
import ConceptState from "./ConceptState.jsx";

/* One concept's entry. The hub that used to sit above it is now the Ideas band
 * of the index (components/Index.jsx), which also says why.
 *
 * "Appears in" is computed from the content at load time, so it cannot drift
 * as material is added. */
export function ConceptDetail({ ctx, k }) {
  const { C, cid, idx } = ctx;
  const d = (C.concepts || {})[k];
  if (!d) return null;
  const u = idx.CUSE[k] || [];
  const rel = [...String(d.body).matchAll(/<c\s+k="([^"]+)"/g)].map(m => m[1]).filter(x => x !== k);

  return (
    <div class="cdet">
      <span class="eyebrow">Core concept</span>
      <h1>{d.term}</h1>
      <div class="body" dangerouslySetInnerHTML={{ __html: decorate(d.body, cid, idx.FIG.byKey) }} />

      <ConceptState ctx={ctx} k={k} />

      <div class="appears">
        <h4>Appears in {u.length} subsection{u.length === 1 ? "" : "s"}</h4>
        <ol>
          {u.map(id => {
            const e = idx.SUBS[id];
            return (
              <li key={id}>
                <a href={`#/${cid}/${id}`}>
                  <span class="an">{e ? e.num : ""}</span>
                  <span class="at">{e ? e.sub.title : id}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      {rel.length > 0 && (
        <div class="appears">
          <h4>Related concepts</h4>
          <ol>
            {rel.map(x => (
              <li key={x}>
                <a href={`#/${cid}/c/${x}`}>
                  <span class="an">◈</span>
                  <span class="at">{((C.concepts || {})[x] || {}).term || x}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
