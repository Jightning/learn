import { useState } from "preact/hooks";
import { qid } from "../lib/util.js";
import { normalizeQuestion, questionSignature } from "../lib/questions.js";
import QuestionCard from "./QuestionCard.jsx";
import { sessionId } from "../lib/attempt.js";

/* One coverage question per distinct skill, shown one at a time. Cards remain
 * mounted while navigating so each question records one final outcome per run. */
export default function Quiz({ sub, num, ctx, depth = "full", expandAll }) {
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState(false);
  const [session] = useState(sessionId);
  const raw = sub.quiz || [];
  const items = raw.map(q => normalizeQuestion(q, {
    subId: sub.id, concept: ctx.idx.CQ[q.id || qid(sub.id, q.type)]
  }));
  const [results, setResults] = useState(() => Object.fromEntries(items.flatMap(item => {
    const saved = ctx.state.getAttempt(item.id, questionSignature(item));
    return saved?.feedback?.recorded ? [[item.id, saved.feedback]] : [];
  })));
  if (!items.length) return null;
  const total = items.length;
  const answered = Object.keys(results).length;
  const closed = depth !== "full" && !expandAll && !open;

  if (closed) return <button class="quiz-line" onClick={() => setOpen(true)}>
    <span class="quiz-line-n">{total}</span>
    <span class="quiz-line-t">{total === 1 ? "question" : "questions"}{answered ? `, ${answered} answered` : ""}</span>
    <span class="quiz-line-x">{items.map(i => i.type).join(", ")}</span>
  </button>;

  return <section class="quiz" aria-label={`${num} questions`}>
    <div class="quiz-h">Questions
      <span class="qstat">{answered} answered</span>
    </div>
    {items.map((item, i) => <div key={item.id} hidden={at !== i}
      style={{ display: at === i ? "" : "none" }}>
      <QuestionCard item={item} ctx={ctx} restore sessionId={session}
        onResult={r => setResults(prev => ({ ...prev, [item.id]: r }))}
        onContinue={() => setAt(i + 1 < total ? i + 1 : total)} />
    </div>)}
    {at >= total && <div class="qsummary">
      <h3>Questions complete</h3>
      <p>{answered} of {total} answered. {Object.values(results).filter(r => !r.correct).length} to revisit.</p>
      <button class="dbtn" onClick={() => setAt(0)}>Look through answers</button>
    </div>}
    <nav class="qslides" aria-label="Switch questions">
      <button class="qslide" type="button" aria-label="Previous question"
        disabled={at === 0} onClick={() => setAt(Math.max(0, at - 1))}>←</button>
      <span class="qposition" aria-live="polite">{at < total ? `Question ${at + 1} of ${total}` : "Questions complete"}</span>
      <button class="qslide" type="button" aria-label="Next question"
        disabled={at >= total - 1} onClick={() => setAt(Math.min(total - 1, at + 1))}>→</button>
    </nav>
  </section>;
}
