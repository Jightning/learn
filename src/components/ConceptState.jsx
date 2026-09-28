import { useState } from "preact/hooks";
import * as R from "../lib/retention.js";
import { whyFor } from "../lib/why.js";
import { ago } from "../lib/util.js";
import QuestionCard from "./QuestionCard.jsx";
import Inline from "./Inline.jsx";

/* Where M13's unit and M27's unit meet: the concept is the thing with one
 * definition site, and it is also the thing the scheduler tracks. This is the
 * page a reader revises one idea from. */
export default function ConceptState({ ctx, k }) {
  const { C, cid, idx } = ctx;
  const [item, setItem] = useState(null);
  const items = [...idx.QALL, ...idx.PALL].filter(q => q.concept === k);
  if (!items.length) return null;

  const c = R.get(cid, k);
  const near = (C.concepts[k].confusable_with || []).filter(x =>
    [...idx.QALL, ...idx.PALL].some(q => q.concept === x));
  const ids = items.map(d => d.id);
  const reasons = whyFor(cid, ids).slice(0, 5);

  const start = () => setItem(items.find(q => !(c?.items || []).includes(q.id)) || items[0]);

  return (
    <div class="cstate">
      <div class="cstate-box">
        <span class="mn-k">State</span>
        <b>{R.label(c)}</b>
        {c && c.reps > 0 && c.dueAt && <span class="cstate-due">next in {days(c.dueAt)}</span>}
      </div>

      {near.length > 0 && (
        <p class="cstate-near">
          Confused with{" "}
          {near.map((x, i) => (
            <span key={x}>{i ? ", " : ""}<a href={`#/${cid}/c/${x}`}><Inline text={C.concepts[x].term} /></a></span>
          ))}
        </p>
      )}

      {item
        ? <QuestionCard item={item} ctx={ctx} onContinue={() => setItem(null)} />
        : <button class="dbtn" id="c-drill" onClick={start}>
            Practice this<i class="sep" aria-hidden="true" />{items.length} question{items.length === 1 ? "" : "s"} →
          </button>}

      {reasons.length > 0 && (
        <div class="appears" data-nosnippet>
          <h4>Your reasons</h4>
          <ol class="creasons">
            {reasons.map(r => (
              <li key={r.ts}>
                <q>{r.text}</q>
                <span class="creason-m">
                  {ago(r.ts)}{r.correct === false ? ", wrong" : r.correct ? ", right" : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const days = at => {
  const d = Math.round((at - Date.now()) / 864e5);
  return d <= 0 ? "now" : d === 1 ? "1 day" : `${d} days`;
};
