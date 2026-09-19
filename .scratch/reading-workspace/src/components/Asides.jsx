import { asidesOf } from "../lib/asides.js";
import { decorate } from "../lib/refs.js";

/* Keep the author's complete explanation. If Review hides its anchor, the
 * note offers to reveal that passage; `paired: null` means the full text. */
export default function Asides({ b, ctx, paired, onOpen }) {
  const html = v => ({ __html: decorate(v, ctx.cid, ctx.idx.FIG.byKey) });
  return asidesOf(b).map(a => {
    const here = !paired || paired.has(a.id);
    return (
      <div key={a.id} class="mnote is-a" data-xr={here ? "n:" + a.id : undefined}
           tabIndex={here ? 0 : undefined}>
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
