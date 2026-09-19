import { asidesOf } from "../lib/asides.js";
import { decorate } from "../lib/refs.js";

/* The course's margin notes for one block (lib/asides.js).
 *
 * Shown whole rather than clipped like a reference card: a reference card is
 * a reminder of something with a page of its own, and an aside has no other
 * page. validate.mjs keeps them short enough for that to be affordable.
 *
 * `paired` is the anchors whose phrase is on the page at this depth — null
 * means all of them, which is every full block. A card outside that set is
 * about a phrase the reader cannot see, so it carries no `data-xr` (there is
 * nothing for hover to light) and offers the way to the phrase instead. The
 * alternative is a card that goes dead in Review, and an aside is the course
 * explaining something the reader may not know: help available in only one
 * reading mode is help nobody can lean on.
 */
export default function Asides({ b, ctx, paired, onOpen }) {
  const html = v => ({ __html: decorate(v, ctx.cid, ctx.idx.FIG.byKey) });
  return asidesOf(b).map(a => {
    const here = !paired || paired.has(a.id);
    return (
      <div key={a.id} class="mnote is-a" data-xr={here ? "n:" + a.id : undefined}>
        <span class="mn-k">Aside</span>
        <h5 dangerouslySetInnerHTML={html(a.phrase)} />
        <div class="aside-body" dangerouslySetInnerHTML={html(a.body)} />
        {!here && onOpen && (
          <button class="mn-go mn-open" onClick={onOpen}>Show in the text →</button>
        )}
      </div>
    );
  });
}
