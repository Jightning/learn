import { asidesOf } from "../lib/asides.js";
import { decorate } from "../lib/refs.js";

/* The course's margin notes for one block (lib/asides.js).
 *
 * Shown whole rather than clipped like a reference card: a reference card is
 * a reminder of something with a page of its own, and an aside has no other
 * page. validate.mjs keeps them short enough for that to be affordable. */
export default function Asides({ b, ctx }) {
  const html = v => ({ __html: decorate(v, ctx.cid, ctx.idx.FIG.byKey) });
  return asidesOf(b).map(a => (
    <div key={a.id} class="mnote is-a" data-xr={"n:" + a.id}>
      <span class="mn-k">Aside</span>
      <h5 dangerouslySetInnerHTML={html(a.phrase)} />
      <div class="aside-body" dangerouslySetInnerHTML={html(a.body)} />
    </div>
  ));
}
