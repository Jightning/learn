import { useState, useMemo, useEffect } from "preact/hooks";
import { INDEX, ORDER, getAll } from "../lib/library.js";
import { buildIndex } from "../lib/index.js";
import { stateFor } from "../lib/state.js";
import { dueKeys } from "../lib/retention.js";
import { buildQueue } from "../lib/queue.js";
import { retryVariant } from "../lib/practice-pool.js";
import QuestionCard from "./QuestionCard.jsx";
import Practice from "./Practice.jsx";

const SESSION = 20;

export default function Review({ only = null, ctx = null, mixed = false, cat = null }) {
  const scope = only ? (INDEX[only] || {}).code || only
    : mixed ? "choose a course" : "all courses";
  const dueUrl = only ? `#/${only}/review` : "#/review";
  const mixedUrl = only ? `#/${only}/review/mixed` : "#/review/mixed";
  return <div class="review">
    <header class="review-head">
      <h1>Review</h1>
      <span class="review-scope">{scope}</span>
      <nav class="xviews review-options" aria-label="Review options">
        <a href={dueUrl} class={!mixed ? "cur" : ""}
           aria-current={!mixed ? "page" : undefined}>Due now</a>
        <a href={mixedUrl} class={mixed ? "cur" : ""}
           aria-current={mixed ? "page" : undefined}>Mixed practice</a>
      </nav>
    </header>
    <section hidden={mixed} aria-label="Due now">
      <DueReview only={only} />
    </section>
    {ctx && <section hidden={!mixed} aria-label="Mixed practice">
      <Practice key={cat || "all"} ctx={ctx} cat={cat} embedded />
    </section>}
    {!ctx && <section hidden={!mixed} aria-label="Choose a course for mixed practice"
                     class="review-pick">
      <p>{ORDER.length
        ? "Choose a course to practise questions even when nothing is due."
        : "Add a course to start mixed practice."}</p>
      <div class="review-courses">{ORDER.map(cid => (
        <a key={cid} href={`#/${cid}/review/mixed`}>{(INDEX[cid] || {}).code || cid} →</a>
      ))}</div>
    </section>}
  </div>;
}

function DueReview({ only }) {
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
  if (!run) return <p>Loading questions…</p>;
  if (run.at >= run.items.length) return <div class="review-done">
    <h2>{run.items.length ? "Session complete" : "Nothing is due"}</h2>
    <p>{run.items.length ? `${run.results.filter(r => r.correct).length} right; ${run.results.filter(r => !r.correct).length} to revisit.` :
      "You are caught up."}</p>
    {run.items.length > 0 && <button class="dbtn" onClick={again}>Another set</button>}
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

  return <>
    <div class="review-bar"><span class="review-t">Scheduled questions</span>
      <span class="review-n">{run.at + 1} of {run.items.length}</span></div>
    <QuestionCard key={`${run.at}:${row.item.id}`} item={row.item}
      ctx={{ ...book, state: book.state }} reason={row.reason}
      onResult={result} onContinue={() => setRun(prev => ({ ...prev, at: prev.at + 1 }))} />
  </>;
}
