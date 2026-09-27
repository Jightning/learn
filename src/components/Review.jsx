import { useState, useMemo, useEffect } from "preact/hooks";
import { INDEX, ORDER, getAll } from "../lib/library.js";
import { buildIndex } from "../lib/index.js";
import { stateFor } from "../lib/state.js";
import { dueKeys } from "../lib/retention.js";
import { buildQueue } from "../lib/queue.js";
import { retryVariant } from "../lib/practice-pool.js";
import QuestionCard from "./QuestionCard.jsx";

const SESSION = 20;

export default function Review({ only = null }) {
  const wanted = useMemo(() => ORDER.filter(cid => (!only || cid === only) &&
    dueKeys(cid).length > 0), [only]);
  const [books, setBooks] = useState(null);
  const [run, setRun] = useState(null);

  useEffect(() => {
    let live = true;
    setBooks(null); setRun(null);
    getAll(wanted).then(pairs => {
      if (!live) return;
      const next = pairs.map(([cid, C]) => {
        const idx = buildIndex(C);
        return { cid, C, idx, state: stateFor(cid, C), items: [...idx.QALL, ...idx.PALL] };
      });
      setBooks(next);
      setRun({ items: buildQueue(next, { limit: SESSION }), at: 0, retries: [], results: [] });
    });
    return () => { live = false; };
  }, [wanted.join("|")]);

  const again = () => setRun({ items: buildQueue(books || [], { limit: SESSION }), at: 0,
    retries: [], results: [] });
  const scope = only ? (INDEX[only] || {}).code || only : "all courses";
  if (!run) return <div class="review"><h1>Review</h1><p>Loading questions…</p></div>;
  if (run.at >= run.items.length) return <div class="review">
    <div class="review-bar"><span class="review-t">Review</span><span class="review-scope">{scope}</span></div>
    <h1>{run.items.length ? "Session complete" : "Nothing is due"}</h1>
    <p>{run.items.length ? `${run.results.filter(r => r.correct).length} right; ${run.results.filter(r => !r.correct).length} to revisit.` :
      "You are caught up."}</p>
    {run.items.length > 0 && <button class="dbtn" onClick={again}>Another set</button>}
    {only && <a class="dbtn" href={`#/${only}/practice`}>Mixed Practice →</a>}
  </div>;

  const row = run.items[run.at];
  const book = books.find(b => b.cid === row.cid);
  const result = outcome => setRun(prev => {
    const next = { ...prev, results: [...prev.results, outcome] };
    if (!outcome.correct && row.item.concept && !prev.retries.includes(row.item.concept)) {
      const used = new Set(prev.items.map(x => x.item.id));
      const item = retryVariant(book.items, row.item, used);
      if (item) {
        next.items = [...prev.items];
        next.items.splice(Math.min(prev.at + 3, next.items.length), 0,
          { cid: row.cid, C: row.C, item, reason: "Another version after a miss" });
        next.retries = [...prev.retries, row.item.concept];
      }
    }
    return next;
  });

  return <div class="review">
    <div class="review-bar"><span class="review-t">Review</span><span class="review-scope">{scope}</span>
      <span class="review-n">{run.at + 1} of {run.items.length}</span></div>
    <QuestionCard key={`${run.at}:${row.item.id}`} item={row.item}
      ctx={{ ...book, state: book.state }} reason={row.reason}
      onResult={result} onContinue={() => setRun(prev => ({ ...prev, at: prev.at + 1 }))} />
  </div>;
}
