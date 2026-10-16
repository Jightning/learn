import { sessionId } from "../lib/attempt.js";
import { forCourse } from "../lib/log.js";
import { selectAdaptive, duePracticeTypes } from "../lib/practice-policy.js";
import { selectScored, placeSelection } from "../lib/practice-score.js";
import { checkCandidates, readiness } from "../lib/assessment.js";
import { useState, useLayoutEffect } from "preact/hooks";
import { rangePool, categoryPool, selectMixed, retryVariant } from "../lib/practice-pool.js";
import { get as retentionGet } from "../lib/retention.js";
import QuestionCard from "./QuestionCard.jsx";
import { strip } from "../lib/util.js";
import { activeGoals, deadlinePlan } from "../lib/learn-by.js";

export default function Practice({ ctx, cat, embedded = false }) {
  const { cid, idx, state } = ctx;
  const subs = Object.entries(idx.SUBS);
  const [from, setFrom] = useState(state.getSession()?.from || subs[0]?.[0] || "");
  const [to, setTo] = useState(state.getSession()?.to || subs.at(-1)?.[0] || "");
  const [count, setCount] = useState(10);
  const [selector, setSelector] = useState(() => state.getPolicy().practiceSelector === "weighted" ? "weighted" : "scored");
  const currentGoals = !cat ? activeGoals(cid) : [];
  const [useGoals, setUseGoals] = useState(currentGoals.length > 0);
  const [evidenceRevision, refreshEvidence] = useState(0);
  const [run, setRun] = useState(() => { const saved = state.getSession();
    return saved && (saved.cat !== (cat || null) || (saved.blueprintVersion && idx.BLUEPRINTS?.[saved.scope]?.version !== saved.blueprintVersion)) ? null : saved?.items?.some(q=>q.typeId && idx.BANK?.[q.id]?.contentVersion !== q.contentVersion) ? null : saved; });
  useLayoutEffect(() => { state.saveSession(run); }, [run]);
  const [starting, setStarting] = useState(false);
  const startSession = async next => {
    if (starting) return;
    setStarting(true);
    try {
      // The run must be durable before its first card can be displayed.
      await state.saveSession(next);
      setRun(next);
    } finally { setStarting(false); }
  };
  const goalMode = useGoals && currentGoals.length > 0;
  const goalPlan = goalMode ? deadlinePlan(idx, currentGoals, forCourse(cid, ctx.C)) : null;
  const pool = goalMode ? goalPlan.pool : categoryPool(rangePool(idx, from, to), idx, cat);
  const start = () => {
    let items = selectMixed(pool, cid, state, Number(count));
    const reasons = {};
    if (selector === "scored" && items.length) {
      const choice = selectScored(pool, forCourse(cid, ctx.C), { types: idx.TYPES || {}, dueTypes: duePracticeTypes(pool, cid),
        goalPriorities: goalPlan?.priorities, goalReasons: goalPlan?.reasons,
        remaining: items.length, versions: Object.fromEntries(Object.values(idx.BANK || {}).map(q => [q.id, q.contentVersion])) });
      items = placeSelection(items, 0, choice.item);
      if (choice.item?.id === items[0].id) reasons[items[0].id] = choice.reason;
    }
    startSession({ sessionId: sessionId(), mode: "practice", selector, reasons, from, to, goalMode, cat: cat || null, items, at: 0,
      retries: [], retryIds: [], results: [] });
  };
  const selectedSubs = subs.slice(Math.min(subs.findIndex(([id])=>id===from), subs.findIndex(([id])=>id===to)),
    Math.max(subs.findIndex(([id])=>id===from), subs.findIndex(([id])=>id===to))+1);
  const selectedSections = new Set(selectedSubs.map(([,x])=>x.sec.id));
  const scope = !cat && selectedSubs.length === subs.length ? "course" :
    !cat && selectedSections.size === 1 && subs.filter(([,x])=>selectedSections.has(x.sec.id)).length === selectedSubs.length
      ? [...selectedSections][0] : null;
  const blueprint = !goalMode && scope && idx.BLUEPRINTS?.[scope];
  const dueTypes = duePracticeTypes(pool,cid);
  const due = dueTypes.length > 0;
  const evidence = readiness(blueprint, forCourse(cid, ctx.C), { confirmedVersion: state.getPolicy().confirmedVersion, sufficientEvidence: state.getPolicy().sufficientEvidence, bank: idx.BANK });
  const checkPool = checkCandidates(idx, blueprint, forCourse(cid, ctx.C));
  const startCheck = () => startSession({ sessionId: sessionId(), mode: "check", from, to, cat: cat || null, scope, blueprintVersion: blueprint?.version, items: checkPool.items,
    at: 0, retries: [], results: [] });
  const advance = () => setRun(prev => {
    if (!prev || prev.mode === "check") return { ...prev, at: prev.at + 1 };
    const shadow = selectAdaptive(pool, forCourse(cid, ctx.C), { ...state.getPolicy(), unresolvedOutcomes: blueprint ? Object.entries(blueprint.outcomes).filter(([id,o])=>
      !evidence.confirmed || evidence.outcomes?.[id]?.score == null || (o.essential && evidence.outcomes[id].score < o.floor) ||
      o.types.some(t=>evidence.contradictions?.includes(t))).map(([id])=>id) : undefined }, new Set(prev.items.slice(0, prev.at+1).map(q=>q.id)), dueTypes, blueprint,
      Object.fromEntries(Object.values(idx.BANK || {}).map(q=>[q.id,q.contentVersion])), idx.DIAGNOSTIC || [], idx.TYPES || {});
    state.savePolicy(shadow.policy);
    if (prev.selector === "scored" && prev.at+1 < prev.items.length) {
      const freshPlan = prev.goalMode ? deadlinePlan(idx, activeGoals(cid), forCourse(cid, ctx.C)) : null;
      const selected = selectScored(pool, forCourse(cid, ctx.C), { types: idx.TYPES || {}, dueTypes,
        goalPriorities: freshPlan?.priorities, goalReasons: freshPlan?.reasons,
        remaining: prev.items.length - prev.at - 1,
        versions: Object.fromEntries(Object.values(idx.BANK || {}).map(q=>[q.id,q.contentVersion])),
        used: new Set([...prev.items.slice(0, prev.at+1).map(q=>q.id), ...(prev.retryIds || [])]),
        lastType: prev.items[prev.at].typeId || prev.items[prev.at].concept });
      const items = placeSelection(prev.items, prev.at+1, selected.item, new Set(prev.retryIds || []));
      const current = items[prev.at+1];
      const reason = (prev.retryIds || []).includes(current.id) ? 'Another version after difficulty' :
        selected.item?.id === current.id ? selected.reason : null;
      return { ...prev, items, reasons: reason ? { ...prev.reasons, [current.id]: reason } : prev.reasons, at: prev.at+1 };
    }
    return { ...prev, at: prev.at+1 };
  });
  const result = (item, outcome) => {
    setRun(prev => {
      if (!prev || prev.results.some(r => r.id === item.id)) return prev;
      state.savePolicy({ ...state.getPolicy(), actions: (state.getPolicy().actions || 0)+1 });
      const next = { ...prev, results: [...prev.results, { id: item.id, ...outcome }] };
      const retryKey = item.typeId || item.concept;
      if (prev.mode !== "check" && !outcome.skipped && !outcome.correct && retryKey && !prev.retries.includes(retryKey)) {
        const used = new Set(prev.items.map(q => q.id));
        const retry = retryVariant(pool, item, used);
        if (retry) {
          next.items = [...prev.items];
          next.items.splice(Math.min(prev.at + 3, next.items.length), 0, retry);
          next.retries = [...prev.retries, retryKey];
          next.retryIds = [...(prev.retryIds || []), retry.id];
        }
      }
      return next;
    });
  };

  return <div class={embedded ? "review-practice" : "chub"}>
    {!embedded && <h1>Mixed Practice</h1>}
    {!run && <>
      <div class="pgo"><button class="dbtn primary" id="p-start" onClick={start}
        disabled={starting || !pool.length}>Start</button></div>
      {blueprint && <details class="pcfg"><summary>Readiness check</summary>
        <p>{evidence.label} {due ? "Retention review is due." : "Delayed retention is a separate check."}</p>
        <p>This checks the authored course standard. It is a self-assessment, with separate evidence for later retention.</p>
        {state.getPolicy().confirmedVersion !== blueprint.version && <button class="dbtn" onClick={() => {
          state.savePolicy({ ...state.getPolicy(), confirmedVersion: blueprint.version }); refreshEvidence(n=>n+1);
        }}>Confirm this standard applies to my goal</button>}
        {checkPool.reason && <p>{checkPool.reason}</p>}
        <button class="dbtn" disabled={starting || !checkPool.items.length || checkPool.missing.length > 0} onClick={startCheck}>Start fresh check</button>
      </details>}
      <div class="pcfg practice-settings" role="group" aria-label="Practice settings">
      {!!currentGoals.length && <label class="deadline-practice-switch"><input type="checkbox" checked={useGoals} onChange={e => setUseGoals(e.currentTarget.checked)} /> Focus on deadlines</label>}
        <div class="pcfg-row">
          {!goalMode && <>
          <label>From <select id="p-from" value={from} onChange={e => setFrom(e.currentTarget.value)}>
            {subs.map(([id, x]) => <option value={id} key={id}>{x.num} {strip(x.sub.title)}</option>)}
          </select></label>
          <label>Through <select id="p-to" value={to} onChange={e => setTo(e.currentTarget.value)}>
            {subs.map(([id, x]) => <option value={id} key={id}>{x.num} {strip(x.sub.title)}</option>)}
          </select></label>
          </>}
          <label>Questions <select id="p-count" value={count} onChange={e => setCount(e.currentTarget.value)}>
            {[5, 10, 20, 40].map(n => <option value={n} key={n}>{n}</option>)}
          </select></label>
          <label>Method <select value={selector} onChange={e => {
          const value = e.currentTarget.value;
          setSelector(value); state.savePolicy({ ...state.getPolicy(), practiceSelector: value });
        }}>
          <option value="scored">Adaptive</option>
          <option value="weighted">Weighted fallback</option>
        </select></label>
        </div>
        <div class="practice-stats">
          <div><strong>{pool.length}</strong><span>Available questions</span></div>
          {goalMode && <div><strong>{currentGoals.length}</strong><span>Goals</span></div>}
        </div>
      </div>
      {goalMode && <div class="deadline-actions"><a class="dbtn ghost" href={`#/${cid}/review/deadlines`}>View readiness</a></div>}
    </>}
    {run && <div id="p-run">
      {run.at < run.items.length ? <>
        <button class="dbtn ghost" onClick={() => setRun(prev=>({ ...prev, at: prev.items.length }))}>Finish session</button>
        <div class="pbar"><i style={`width:${Math.round(run.at / run.items.length * 100)}%`} /></div>
        <div class="pmeta">Question {run.at + 1} of {run.items.length}
          {run.mode !== "check" && run.items[run.at].subId && <span class="pfrom">{run.items[run.at].num} {run.items[run.at].subTitle}</span>}
        </div>
        <QuestionCard key={`${run.at}:${run.items[run.at].id}`} item={run.items[run.at]} ctx={ctx}
          restore sessionId={run.sessionId} context={run.mode === "check" ? "check" : "practice"}
          delayed={run.mode === "check"} assessmentVersion={blueprint?.version || null}
          reason={(run.selector === 'scored' && run.reasons?.[run.items[run.at].id]) ||
            (state.get(run.items[run.at].id)?.got === 0 ? "Previously missed" :
            retentionGet(cid, run.items[run.at].typeId ? `type:${run.items[run.at].typeId}` : run.items[run.at].concept)?.ok === false ? "Practice for a weak skill" :
            run.items[run.at].difficulty === "challenging" ? "Challenging" : null)}
          onResult={r => result(run.items[run.at], r)}
          onContinue={advance} />
      </> : <div class="pdone">
        <h3>{run.mode === "check" ? "Check complete" : "Set complete"}</h3>
        {run.mode === "check" && <><p>{evidence.label}</p>
          {!evidence.gaps.length && !evidence.contradictions?.length && !evidence.confirmed && <>
            <p>Compare the results with the standard: {blueprint.criteria}. Confirmation is your assessment of the evidence; it cannot independently verify skills outside these tasks.</p>
            <button class="dbtn" onClick={() => { state.savePolicy({ ...state.getPolicy(), sufficientEvidence: evidence.evidenceKey }); refreshEvidence(n=>n+1); }}>I confirm this evidence meets the standard</button>
          </>}
        </>}
        <p>{run.results.filter(r => r.correct).length} right, {run.results.filter(r => !r.correct).length} to revisit.</p>
        {run.mode === "check" && run.items.map(q => <details key={q.id}><summary>Answer and feedback</summary>
          <QuestionCard item={q} ctx={ctx} restore context="check" onResult={() => refreshEvidence(n=>n+1)} /></details>)}
        <button class="dbtn" onClick={() => setRun(null)}>Another set</button>
      </div>}
    </div>}
  </div>;
}
