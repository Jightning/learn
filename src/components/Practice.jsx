import { useState } from "preact/hooks";
import { rangePool, selectMixed, retryVariant } from "../lib/practice-pool.js";
import { get as retentionGet } from "../lib/retention.js";
import QuestionCard from "./QuestionCard.jsx";
import { strip } from "../lib/util.js";

export default function Practice({ ctx, cat, embedded = false }) {
  const { cid, idx, state } = ctx;
  const subs = Object.entries(idx.SUBS);
  const [from, setFrom] = useState(subs[0]?.[0] || "");
  const [to, setTo] = useState(subs.at(-1)?.[0] || "");
  const [count, setCount] = useState(10);
  const [run, setRun] = useState(null);
  const category = cat ? new Set(idx.CAT.drillsOf(cat) || []) : null;
  const pool = rangePool(idx, from, to).filter(q => !category || category.has(q.concept));
  const start = () => setRun({ items: selectMixed(pool, cid, state, Number(count)), at: 0,
    retries: [], results: [] });
  const result = (item, outcome) => {
    setRun(prev => {
      if (!prev || prev.results.some(r => r.id === item.id)) return prev;
      const next = { ...prev, results: [...prev.results, { id: item.id, ...outcome }] };
      if (!outcome.correct && item.concept && !prev.retries.includes(item.concept)) {
        const used = new Set(prev.items.map(q => q.id));
        const retry = retryVariant(pool, item, used);
        if (retry) {
          next.items = [...prev.items];
          next.items.splice(Math.min(prev.at + 3, next.items.length), 0, retry);
          next.retries = [...prev.retries, item.concept];
        }
      }
      return next;
    });
  };

  return <div class={embedded ? "review-practice" : "chub"}>
    {!embedded && <h1>Mixed Practice</h1>}
    {!run && <>
      <p class="practice-intro">{cat
        ? `Practice ${idx.CAT.cats[cat]?.name || cat} across the selected subsections.`
        : "Practice questions from this course, even when nothing is due."}</p>
      <div class="pgo"><button class="dbtn primary" id="p-start" onClick={start}
        disabled={!pool.length}>Start {Math.min(Number(count), pool.length)} questions →</button></div>
      <details class="pcfg">
        <summary><i class="caret" aria-hidden="true" />Choose subsections and set length</summary>
        <div class="pcfg-row">
          <label>From <select id="p-from" value={from} onChange={e => setFrom(e.currentTarget.value)}>
            {subs.map(([id, x]) => <option value={id} key={id}>{x.num} {strip(x.sub.title)}</option>)}
          </select></label>
          <label>Through <select id="p-to" value={to} onChange={e => setTo(e.currentTarget.value)}>
            {subs.map(([id, x]) => <option value={id} key={id}>{x.num} {strip(x.sub.title)}</option>)}
          </select></label>
          <label>Questions <select id="p-count" value={count} onChange={e => setCount(e.currentTarget.value)}>
            {[5, 10, 20, 40].map(n => <option value={n} key={n}>{n}</option>)}
          </select></label>
          <span class="pinfo">{pool.length} available</span>
        </div>
      </details>
    </>}
    {run && <div id="p-run">
      {run.at < run.items.length ? <>
        <div class="pbar"><i style={`width:${Math.round(run.at / run.items.length * 100)}%`} /></div>
        <div class="pmeta">Question {run.at + 1} of {run.items.length}
          {run.items[run.at].subId && <span class="pfrom">{run.items[run.at].num} {run.items[run.at].subTitle}</span>}
        </div>
        <QuestionCard key={`${run.at}:${run.items[run.at].id}`} item={run.items[run.at]} ctx={ctx}
          reason={state.get(run.items[run.at].id)?.got === 0 ? "Previously missed" :
            retentionGet(cid, run.items[run.at].concept)?.ok === false ? "Practice for a weak skill" :
            run.items[run.at].difficulty === "challenging" ? "Challenging" : null}
          onResult={r => result(run.items[run.at], r)}
          onContinue={() => setRun(prev => ({ ...prev, at: prev.at + 1 }))} />
      </> : <div class="pdone">
        <h3>Set complete</h3>
        <p>{run.results.filter(r => r.correct).length} right, {run.results.filter(r => !r.correct).length} to revisit.</p>
        <button class="dbtn" onClick={() => setRun(null)}>Another set</button>
      </div>}
    </div>}
  </div>;
}
