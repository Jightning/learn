import { sessionId } from "../lib/attempt.js";
import { useState, useEffect } from "preact/hooks";
import { INDEX, ORDER, getAll } from "../lib/library.js";
import { buildIndex } from "../lib/index.js";
import { stateFor } from "../lib/state.js";
import { dueKeys } from "../lib/retention.js";
import { buildQueue } from "../lib/queue.js";
import { retryVariant } from "../lib/practice-pool.js";
import QuestionCard from "./QuestionCard.jsx";
import LearningGuidance from "./LearningGuidance.jsx";
import Practice from "./Practice.jsx";
import Deadlines from "./Deadlines.jsx";
import { activeGoals } from "../lib/learn-by.js";

const SESSION = 20;

export default function Review({ only = null, ctx = null, mixed = false, deadlines = false, cat = null }) {
  const scope = only ? (INDEX[only] || {}).code || only
    : mixed ? "choose a course" : "all courses";
  const dueUrl = only ? `#/${only}/review` : "#/review";
  const mixedUrl = only ? `#/${only}/review/mixed` : "#/review/mixed";
  const deadlinesUrl = only ? `#/${only}/review/deadlines` : "#/review/deadlines";
  return <div class="review">
    <header class="review-head">
      <div class="review-heading">
        <h1>Review</h1>
        <span class="review-scope">{scope}</span>
      </div>
      <nav class="xviews review-options" aria-label="Review options">
        <a href={dueUrl} class={!mixed && !deadlines ? "cur" : ""}
           aria-current={!mixed && !deadlines ? "page" : undefined}>Due now</a>
        <a href={mixedUrl} class={mixed ? "cur" : ""}
           aria-current={mixed ? "page" : undefined}>Mixed practice</a>
        <a href={deadlinesUrl} class={deadlines ? "cur" : ""}
           aria-current={deadlines ? "page" : undefined}>Learn by</a>
      </nav>
    </header>
    {!mixed && !deadlines && <section aria-label="Due now">
      <DueReview only={only} />
    </section>}
    {ctx && mixed && <section aria-label="Mixed practice">
      <Practice key={cat || "all"} ctx={ctx} cat={cat} embedded />
    </section>}
    {!ctx && mixed && <section aria-label="Choose a course for mixed practice"
                     class="review-pick">
      {ORDER.some(cid => activeGoals(cid).length) && <div class="deadline-cross-practice"><h2>Across your Learn by goals</h2><DueReview only={null} /></div>}
      <p>{ORDER.length
        ? "Choose a course to practise questions even when nothing is due."
        : "Add a course to start mixed practice."}</p>
      <div class="review-courses">{ORDER.map(cid => (
        <a key={cid} href={`#/${cid}/review/mixed`}>{(INDEX[cid] || {}).code || cid} →</a>
      ))}</div>
    </section>}
    {deadlines && <Deadlines only={only} ctx={ctx} />}
  </div>;
}

function DueReview({ only }) {
  const available = only ? [only] : ORDER;
  const focused = available.some(cid => activeGoals(cid).length > 0);
  const wanted = available.filter(cid => focused ? activeGoals(cid).length > 0 : dueKeys(cid).length > 0);
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
      setRun({ sessionId: sessionId(), items: buildQueue(next, { limit: SESSION }), at: 0, retries: [], results: [] });
    });
    return () => { live = false; };
  }, [wanted.join("|")]);

  const again = () => setRun({ sessionId: sessionId(), items: buildQueue(books || [], { limit: SESSION }), at: 0,
    retries: [], results: [] });
  if (!run) return <p>Loading questions…</p>;
  if (run.at >= run.items.length) return <div class="review-done">
    <h2>{run.items.length ? "Session complete" : focused ? 'No goal questions available' : "Nothing is due"}</h2>
    <p>{run.items.length ? `${run.results.filter(r => r.firstUnaided === true && !r.selfChecked).length} right first try; ${run.results.filter(r=>r.selfChecked).length} self-rated; ${run.results.filter(r => r.correct === false && !r.timedOut).length} to revisit.` :
      focused ? 'No related practice questions are available for these goals.' : 'You are caught up.'}</p>
    {run.items.length > 0 && <button class="dbtn" onClick={again}>Another set</button>}
  </div>;

  const row = run.items[run.at];
  const book = books.find(b => b.cid === row.cid);
  const result = outcome => setRun(prev => {
    const next = { ...prev, results: [...prev.results, outcome] };
    const retryKey = [...(row.item.skills || [row.item.typeId || row.item.concept])].sort().join('+');
    if (!outcome.skipped && !outcome.timedOut && outcome.firstUnaided === false && retryKey && !prev.retries.includes(retryKey)) {
      const used = new Set(prev.items.map(x => x.item.id));
      const item = retryVariant(book.items, row.item, used);
      if (item) {
        next.items = [...prev.items];
        next.items.splice(Math.min(prev.at + 3, next.items.length), 0,
          { cid: row.cid, C: row.C, item, reason: "Another version after a miss" });
        next.retries = [...prev.retries, retryKey];
      }
    }
    return next;
  });

  const advance = () => setRun(prev => {
    const at = prev.at + 1;
    if (at >= prev.items.length) return { ...prev, at };
    const future = prev.items.slice(at), retries = future.filter(x => x.reason === 'Another version after a miss');
    const used = new Set([...prev.items.slice(0, at), ...retries].map(x => `${x.cid}:${x.item.id}`));
    const ranked = buildQueue(books || [], { limit: future.length - retries.length, used });
    let i = 0;
    return { ...prev, at, items: [...prev.items.slice(0, at), ...future.map(x =>
      x.reason === 'Another version after a miss' ? x : ranked[i++] || x)] };
  });
  return <>
    <div class="review-bar"><span class="review-t">{focused ? 'Learn by practice' : 'Scheduled questions'}</span>
      <span class="review-n">{run.at + 1} of {run.items.length}</span></div>
    <LearningGuidance help={row.help} item={row.item} ctx={book} />
    <QuestionCard key={`${run.at}:${row.item.id}`} item={row.item}
      ctx={{ ...book, state: book.state }} sessionId={run.sessionId} context="review" reason={row.reason}
      selection={row.decision} targetSkill={row.decision?.targetSkill}
      onResult={result} onContinue={advance} />
  </>;
}
