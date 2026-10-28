import { sessionId } from "../lib/attempt.js";
import { forCourse, append } from "../lib/log.js";
import { duePracticeTypes } from "../lib/practice-policy.js";
import { selectScored, placeSelection } from "../lib/practice-score.js";
import { checkCandidates, readiness } from "../lib/assessment.js";
import { useState, useLayoutEffect, useEffect, useRef } from "preact/hooks";
import { rangePool, categoryPool, selectMixed, retryVariant } from "../lib/practice-pool.js";
import { get as retentionGet } from "../lib/retention.js";
import { beginTiming, timingSnapshot, timingClock } from "../lib/question-timing.js";
import { POLICY } from "../lib/evidence.js";
import QuestionCard from "./QuestionCard.jsx";
import LearningGuidance from "./LearningGuidance.jsx";
import { questionSessionCurrent, practiceRequirements, normalizeQuestion } from '../lib/questions.js';
import { strip } from "../lib/util.js";
import { activeGoals, deadlinePlan } from "../lib/learn-by.js";
import { ignoreSessionAnswer, reviseSessionAnswer } from "../lib/practice-session.js";

export default function Practice({ ctx, cat, embedded = false }) {
  const { cid, idx, state } = ctx;
  const subs = Object.entries(idx.SUBS);
  const [from, setFrom] = useState(state.getSession()?.from || subs[0]?.[0] || "");
  const [to, setTo] = useState(state.getSession()?.to || subs.at(-1)?.[0] || "");
  const [count, setCount] = useState(10);
  const [selector, setSelector] = useState(() => state.getPolicy().practiceSelector === "weighted" ? "weighted" : "scored");
  const [demand, setDemand] = useState(state.getPolicy().demandPreference || 'auto');
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [checkMinutes, setCheckMinutes] = useState(0);
  const [timingMultiplier, setTimingMultiplier] = useState(1);
  const currentGoals = !cat ? activeGoals(cid) : [];
  const [useGoals, setUseGoals] = useState(currentGoals.length > 0);
  const [evidenceRevision, refreshEvidence] = useState(0);
  const [run, setRun] = useState(() => { const saved = state.getSession();
    if (!saved || saved.cat !== (cat || null) || (saved.blueprintVersion && idx.BLUEPRINTS?.[saved.scope]?.version !== saved.blueprintVersion) ||
      saved.items?.some(q => !questionSessionCurrent(q, idx.BANK))) return null;
    return { ...saved, items: saved.items.map(q => q.prompt === undefined && idx.BANK?.[q.id]
      ? { ...q, ...normalizeQuestion(idx.BANK[q.id], { id: q.id, subId: q.subId, concept: q.concept }) } : q) };
  });
  useLayoutEffect(() => { state.saveSession(run); }, [run]);
  const timerClock = useRef(timingClock());
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
  const selectionOptions = () => ({ bank: idx.BANK, diagnostics: idx.DIAGNOSTIC, inventory: idx.TYPES,
    standard: goalMode ? practiceRequirements(goalPlan.details.map(d => d.standard)) : blueprint,
    graph: idx.GRAPH, demandPreference: demand === 'auto' ? undefined : demand, types: idx.TYPES || {} });
  const recordDecision = choice => {
    if (state.on && choice.item) append({ course: cid, event: 'policy-decision', policyVersion: POLICY.version,
      sourceAttemptId: choice.sourceAttemptId, targetSkill: choice.targetSkill, features: choice.scores.find(q=>q.id === choice.item.id)?.features, score:choice.selectedScore,
      itemId: choice.item.id, action: choice.action, probability: 1, deterministic: true,
      eligibleActions: [...new Set([...choice.scores.map(q => q.id), choice.item.id])], reason: choice.reason });
  };
  const start = () => {
    let items = selectMixed(pool, cid, state, Number(count));
    const reasons = {}, guidance = {}, targetSkills = {};
    let recommendedStop = false;
    if (selector === "scored" && items.length) {
      const choice = selectScored(pool, forCourse(cid, ctx.C), { ...selectionOptions(), dueTypes: duePracticeTypes(pool, cid),
        goalPriorities: goalPlan?.priorities, goalReasons: goalPlan?.reasons,
        remaining: items.length, versions: Object.fromEntries(Object.values(idx.BANK || {}).map(q => [q.id, q.contentVersion])) });
      items = placeSelection(items, 0, choice.item);
      if (choice.item?.id === items[0].id) reasons[items[0].id] = choice.reason;
      if (choice.help) guidance[choice.item.id] = choice.help;
      if (choice.item) targetSkills[choice.item.id] = choice.targetSkill;
      recordDecision(choice);
      recommendedStop = choice.recommendedStop;
    }
    startSession({ sessionId: sessionId(), mode: "practice", selector, reasons, guidance, targetSkills, recommendedStop, from, to, goalMode, cat: cat || null, items, at: 0,
      retries: [], retryIds: [], results: [], timingMultiplier, questionTiming: questionSeconds ? {limitSeconds: questionSeconds, mode:'strict'} : null });
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
  const finishTimed = prev => {
    if (!prev || prev.at >= prev.items.length) return prev;
    if (state.on) append({id:`${prev.sessionId}:finish`, course:cid, event:'assessment-finish', sessionId:prev.sessionId,
      timedOut:true, unreached:prev.items.slice(prev.at+1).map(q=>q.id), timing:timingSnapshot(prev.assessmentTiming)});
    return {...prev, at:prev.items.length, timedOut:true};
  };
  useEffect(() => {
    if (!run?.assessmentTiming || run.at >= run.items.length) return;
    const checkpoint = () => setRun(prev => {
      if (!prev?.assessmentTiming || prev.at >= prev.items.length) return prev;
      const clock = timerClock.current(), timing = timingSnapshot(prev.assessmentTiming, clock.now);
      return {...prev,assessmentTiming:{...timing,valid:timing.valid && clock.valid}};
    });
    const timer = setInterval(() => {
      const clock = timerClock.current();
      if (timingSnapshot(run.assessmentTiming, clock.now).enforce && run.results.some(r=>r.id === run.items[run.at].id))
        setRun(prev=>finishTimed(prev));
      else if (clock.now-(run.assessmentTiming.lastAt || run.assessmentTiming.startedAt) >= 15000) checkpoint();
    }, 250);
    window.addEventListener('pagehide',checkpoint); window.addEventListener('blur',checkpoint);
    return () => { clearInterval(timer); window.removeEventListener('pagehide',checkpoint); window.removeEventListener('blur',checkpoint); };
  }, [run]);
  const startCheck = (selfReport = false) => startSession({ sessionId: sessionId(), mode: "check", from, to, cat: cat || null, scope, blueprintVersion: blueprint?.version, selfReport, items: selfReport ? checkPool.selfItems : checkPool.items,
    at: 0, retries: [], results: [], timingMultiplier,
    questionTiming: questionSeconds ? {limitSeconds:questionSeconds,mode:'strict'} : null,
    assessmentTiming: checkMinutes || blueprint?.timing ? beginTiming(checkMinutes ? {limitSeconds:checkMinutes*60,multiplier:timingMultiplier} : {...blueprint.timing,multiplier:timingMultiplier}) : null });
  const advance = () => setRun(prev => {
    if (!prev) return prev;
    if (prev.assessmentTiming && timingSnapshot(prev.assessmentTiming).enforce) return finishTimed(prev);
    if (prev.mode === "check") return { ...prev, at: prev.at + 1 };
    state.savePolicy({...state.getPolicy(),version:POLICY.version,
      lastType:[...(prev.items[prev.at].skills || [prev.items[prev.at].typeId || prev.items[prev.at].concept])].sort()[0]});
    if (prev.selector === "scored" && prev.at+1 < prev.items.length) {
      const freshPlan = prev.goalMode ? deadlinePlan(idx, activeGoals(cid), forCourse(cid, ctx.C)) : null;
      const selected = selectScored(pool, forCourse(cid, ctx.C), { ...selectionOptions(), dueTypes,
        goalPriorities: freshPlan?.priorities, goalReasons: freshPlan?.reasons,
        remaining: prev.items.length - prev.at - 1,
        versions: Object.fromEntries(Object.values(idx.BANK || {}).map(q=>[q.id,q.contentVersion])),
        used: new Set([...prev.items.slice(0, prev.at+1).map(q=>q.id), ...(prev.retryIds || [])]),
        lastType: prev.items[prev.at].typeId || prev.items[prev.at].concept });
      const items = placeSelection(prev.items, prev.at+1, selected.item, new Set(prev.retryIds || []));
      const current = items[prev.at+1];
      if (selected.item?.id === current.id) recordDecision(selected);
      const reason = (prev.retryIds || []).includes(current.id) ? 'Another version after difficulty' :
        selected.item?.id === current.id ? selected.reason : null;
      return { ...prev, items, targetSkills:selected.item?.id === current.id ? {...prev.targetSkills,[current.id]:selected.targetSkill} : prev.targetSkills, recommendedStop: selected.recommendedStop, guidance: selected.help && selected.item?.id === current.id ? { ...prev.guidance, [current.id]: selected.help } : prev.guidance,
        reasons: reason ? { ...prev.reasons, [current.id]: reason } : prev.reasons, at: prev.at+1 };
    }
    return { ...prev, at: prev.at+1 };
  });
  const result = (item, outcome) => {
    setRun(prev => {
      if (prev && outcome.ignored) {
        if (prev.results.some(r => r.id === item.id && !r.ignored))
          state.savePolicy({ ...state.getPolicy(), actions: Math.max(0, (state.getPolicy().actions || 0) - 1) });
        return ignoreSessionAnswer(prev, item.id);
      }
      if (prev && outcome.gradeRevised) return reviseSessionAnswer(prev, item.id, outcome);
      if (!prev || prev.results.some(r => r.id === item.id)) return prev;
      state.savePolicy({ ...state.getPolicy(), actions: (state.getPolicy().actions || 0)+1 });
      const next = { ...prev, results: [...prev.results, { id: item.id, ...outcome }] };
      if (prev.assessmentTiming && timingSnapshot(prev.assessmentTiming).enforce) return finishTimed(next);
      const retryKey = [...(item.skills || [item.typeId || item.concept])].sort().join('+');
      if (prev.mode !== "check" && !outcome.skipped && !outcome.timedOut && outcome.firstUnaided === false && retryKey && !prev.retries.includes(retryKey)) {
        const used = new Set(prev.items.map(q => q.id));
        const retry = retryVariant(pool, item, used);
        if (retry) {
          next.items = [...prev.items];
          next.items.splice(Math.min(prev.at + 3, next.items.length), 0, retry);
          next.retries = [...prev.retries, retryKey];
          next.retryIds = [...(prev.retryIds || []), retry.id];
          next.retrySources = { ...prev.retrySources, [retry.id]: { itemId: item.id, key: retryKey } };
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
        <p>This checks the authored course standard against answer rules. Self-reported work and delayed retention remain separate.</p>
        {state.getPolicy().confirmedVersion !== blueprint.version && <button class="dbtn" onClick={() => {
          state.savePolicy({ ...state.getPolicy(), confirmedVersion: blueprint.version }); refreshEvidence(n=>n+1);
        }}>Confirm this standard applies to my goal</button>}
        {checkPool.reason && <p>{checkPool.reason}</p>}
        <button class="dbtn" disabled={starting || !checkPool.items.length} onClick={()=>startCheck(false)}>Start fresh check</button>
        {!!checkPool.selfItems?.length && <button class="dbtn" disabled={starting} onClick={()=>startCheck(true)}>Start self-report check</button>}
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
          <label>Challenge <select value={demand} onChange={e => {
            setDemand(e.currentTarget.value); state.savePolicy({ ...state.getPolicy(), demandPreference: e.currentTarget.value });
          }}><option value="auto">Automatic</option><option value="foundation">Easier</option><option value="standard">Standard</option><option value="extension">Harder</option></select></label>
        </div>
        <div class="practice-stats">
          <div><strong>{pool.length}</strong><span>Available questions</span></div>
          {goalMode && <div><strong>{currentGoals.length}</strong><span>Goals</span></div>}
        </div>
      </div>
      <details class="pcfg"><summary>Timing (optional)</summary>
        <label>Question limit <select value={questionSeconds} onChange={e=>setQuestionSeconds(Number(e.currentTarget.value))}>
          <option value="0">Untimed</option>{[30,60,120,300].map(n=><option value={n}>{n} seconds</option>)}
        </select></label>
        {blueprint && <label>Check limit <select value={checkMinutes} onChange={e=>setCheckMinutes(Number(e.currentTarget.value))}>
          <option value="0">Course default or untimed</option>{[5,10,20,40,60].map(n=><option value={n}>{n} minutes</option>)}
        </select></label>}
        <label>Extra time <select value={timingMultiplier} onChange={e=>setTimingMultiplier(Number(e.currentTarget.value))}>
          {[1,1.5,2].map(n=><option value={n}>{n}×</option>)}
        </select></label>
      </details>
      {goalMode && <div class="deadline-actions"><a class="dbtn ghost" href={`#/${cid}/review/deadlines`}>View readiness</a></div>}
    </>}
    {run && <div id="p-run">
      {run.at < run.items.length ? <>
        <button class="dbtn ghost" onClick={() => setRun(prev=>({ ...prev, at: prev.items.length }))}>Finish session</button>
        {run.recommendedStop && <p>Today's requirements are supported and no review is due. You can finish or continue practising.</p>}
        <div class="pbar"><i style={`width:${Math.round(run.at / run.items.length * 100)}%`} /></div>
        <div class="pmeta">Question {run.at + 1} of {run.items.length}
          {run.mode !== "check" && run.items[run.at].subId && <span class="pfrom">{run.items[run.at].num} {run.items[run.at].subTitle}</span>}
        </div>
        <LearningGuidance help={run.guidance?.[run.items[run.at].id]} item={run.items[run.at]} ctx={ctx} />
        <QuestionCard key={`${run.at}:${run.items[run.at].id}`} item={run.questionTiming ? {...run.items[run.at],timing:run.questionTiming} : run.items[run.at]} ctx={ctx}
          targetSkill={run.targetSkills?.[run.items[run.at].id]} assessmentTiming={run.assessmentTiming} timingMultiplier={run.timingMultiplier || 1}
          restore sessionId={run.sessionId} context={run.mode === "check" ? "check" : "practice"}
          delayed={run.mode === "check"} assessmentVersion={blueprint?.version || null}
          reason={(run.selector === 'scored' && run.reasons?.[run.items[run.at].id]) ||
            (state.get(run.items[run.at].id)?.got === 0 ? "Previously missed" :
            retentionGet(cid, run.items[run.at].typeId ? `type:${run.items[run.at].typeId}` : run.items[run.at].concept)?.ok === false ? "Practice for a weak skill" :
            run.items[run.at].difficulty === "challenging" ? "Challenging" : null)}
          onResult={r => result(run.items[run.at], r)}
          onContinue={advance} />
      </> : <div class="pdone">
        {run.timedOut && <p role="status">Time limit reached. Unreached questions remain unobserved.</p>}
        <h3>{run.mode === "check" ? "Check complete" : "Set complete"}</h3>
        {run.mode === "check" && <><p>{evidence.label}</p>
        </>}
        <p>{run.results.filter(r => r.firstUnaided === true && !r.selfChecked).length} right first try, {run.results.filter(r => r.correct && r.firstUnaided === false && !r.selfChecked).length} recovered, {run.results.filter(r => r.selfChecked).length} self-rated, {run.results.filter(r => r.correct === false && !r.timedOut).length} to revisit.</p>
        {run.mode === "check" && run.items.filter(q=>run.results.some(r=>r.id === q.id)).map(q => <details key={q.id}><summary>Answer and feedback</summary>
          <QuestionCard item={q} ctx={ctx} restore context="check" onResult={outcome => { setRun(prev=> outcome.ignored ? ignoreSessionAnswer(prev, q.id) : ({...prev,results:prev.results.map(r=>r.id === q.id ? {...r,...outcome} : r)})); refreshEvidence(n=>n+1); }} /></details>)}
        <button class="dbtn" onClick={() => setRun(null)}>Another set</button>
      </div>}
    </div>}
  </div>;
}
