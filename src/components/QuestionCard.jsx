import { useState, useRef, useEffect, useLayoutEffect } from "preact/hooks";
import ResponseFields from "./ResponseFields.jsx";
import { numericTolerance } from "../lib/numeric-answer.js";
import { initialResponse, hasResponse, responseKey, scoreResponse, submissionObservation, assertResponseSize } from "../lib/response-scoring.js";
import { beginTiming, timingSnapshot, effectiveTiming, timingClock } from "../lib/question-timing.js";
import AnswerInput, { FormulaPreview } from "./AnswerInput.jsx";
import { checkFormula } from "../lib/formula-check.js";
import { authored as M, safeMarkup } from "../lib/safe-markup.js";
import { sourceReference } from "../lib/source-label.js";
import { renderBlock } from "../blocks/index.js";
import { gradeQuestion, questionStimuli, questionSignature, questionTries, questionHelpHref, normalizeQuestion, questionSkills, retentionKeyFor, questionErrorHypotheses, shouldRestoreAttempt } from "../lib/questions.js";
import { newAttempt, activeClock } from "../lib/attempt.js";
import { scoredEvents, effectiveEvents, retentionEligible } from "../lib/evidence.js";
import { forCourse } from "../lib/log.js";
import { append } from "../lib/log.js";
import * as retention from "../lib/retention.js";
import { invalidate, rebuild } from "../lib/replay.js";
import { laneFor } from "../lib/tiers.js";
import { retrievability } from "../lib/schedule.js";
import { correctAnswer } from "../lib/correct-answer.js";
import { IconThumbDown } from "./Icon.jsx";

function Stimulus({ value }) {
  if (!value) return null;
  if (value.t === "passage") return (
    <figure class="qstim qstim-passage">
      <blockquote dangerouslySetInnerHTML={{ __html: M(value.text || "") }} />
      {value.source && <figcaption dangerouslySetInnerHTML={{ __html: M(sourceReference(value.source)) }} />}
    </figure>
  );
  return <div class={`qstim qstim-${value.t}`} dangerouslySetInnerHTML={{ __html: safeMarkup(renderBlock(value, {})) }} />;
}

/* A question run. All three routes supply the same card and record the same
 * outcome; only their queue and progress chrome differ. */
function SteppedQuestion(props) {
  const { item, ctx, assessmentTiming = null, timingMultiplier = 1, activeQuestion = true } = props;
  const signature = questionSignature(item);
  const [saved] = useState(() => {
    const prior = ctx.state.getAttempt(item.id, signature);
    return shouldRestoreAttempt(prior, { ...props, timed: !!item.timing }) ? prior : null;
  });
  const parentAttempt = useRef(saved || newAttempt(signature, props.sessionId));
  const steps = item.steps.filter(s => s && typeof s === "object");
  const [at, setAt] = useState(Math.min(saved?.stepsAt || 0, steps.length));
  const [ready, setReady] = useState(!item.timing || !!saved?.timing || !!saved?.feedback?.recorded);
  const [parentTiming, setParentTiming] = useState(saved?.timing || null);
  const moving = useRef(false), childFinished = useRef(false), readClock = useRef(timingClock());
  const saveParent = async next => {
    parentAttempt.current.stepsAt = next;
    if (parentAttempt.current.timing) {
      const clock = readClock.current();
      parentAttempt.current.timing = timingSnapshot(parentAttempt.current.timing, clock.now);
      if (!clock.valid) parentAttempt.current.timing.valid = false;
    }
    await ctx.state.saveAttempt(item.id, { ...parentAttempt.current, signature });
  };
  const move = async next => {
    if (moving.current) return;
    moving.current = true;
    try { await saveParent(next); childFinished.current = false; setAt(next); }
    finally { moving.current = false; }
  };
  const start = async () => {
    if (moving.current || parentAttempt.current.timing) return;
    moving.current = true;
    try {
      parentAttempt.current.timing = beginTiming({ ...item.timing, multiplier: timingMultiplier });
      await saveParent(at);
      setParentTiming(parentAttempt.current.timing); setReady(true);
    } finally { moving.current = false; }
  };
  useEffect(() => {
    if (!activeQuestion || at >= steps.length) return;
    if (!ready && assessmentTiming) { start(); return; }
    if (!ready || (!parentTiming && !assessmentTiming)) return;
    const tick = () => {
      const clock = readClock.current();
      const shared = effectiveTiming(parentAttempt.current.timing, assessmentTiming, clock.now);
      if (shared?.enforce) {
        const childAttempt = ctx.state.getAttempt(child.id, questionSignature(child));
        if (!childAttempt?.pendingSubmission && (childFinished.current || childAttempt?.feedback?.recorded)) move(steps.length);
      }
    };
    tick(); const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [ready, activeQuestion, at, parentTiming?.deadlineAt, assessmentTiming?.deadlineAt]);
  const sharedTiming = effectiveTiming(parentTiming, assessmentTiming, readClock.current().now);
  const current = steps[at];
  if (!current) return <QuestionCard {...props} stepMode assessmentTiming={sharedTiming}
    item={{ ...item, steps: [], parentId: item.id, dependent: true,
      support: [...new Set([...(item.support || []), "supplied-result"])] }} />;
  if (!ready) return <section aria-label="Question steps">
    <div class="qtext" dangerouslySetInnerHTML={{ __html: M(item.prompt) }} />
    <button class="dbtn" type="button" disabled={!activeQuestion} onClick={start}>Start timed question</button>
  </section>;
  const child = normalizeQuestion({ ...item, ...current, timing: current.timing,
    id: `${item.id}:step:${current.id}`, steps: [], skills: current.skills, typeId: current.skills?.[0],
    parentId: item.id, stepId: current.id, dependent: at > 0,
    support: [...new Set([...(current.support || []), ...(at > 0 ? ["supplied-result"] : [])])],
    contentVersion: `${item.contentVersion}:step:${current.id}`, evidenceVersion: item.evidenceVersion,
    use: item.use, group: item.group || item.id });
  return <section aria-label="Question steps">
    <div class="qtext" dangerouslySetInnerHTML={{ __html: M(item.prompt) }} />
    <p>Step {at + 1} of {steps.length}</p>
    <QuestionCard {...props} key={child.id} item={child} stepMode ctx={ctx} assessmentTiming={sharedTiming}
      onResult={result => {
        childFinished.current = true;
        if (result.timedOut && effectiveTiming(parentAttempt.current.timing, assessmentTiming, readClock.current().now)?.enforce) move(steps.length);
      }} onContinue={() => move(at + 1)} />
  </section>;
}

export default function QuestionCard({ item, ctx, onContinue, onResult, reason = null, restore = false, sessionId = null, context = "lesson", assessmentVersion = null, delayed = false, stepMode = false, selection = null, assessmentTiming = null, timingMultiplier = 1, activeQuestion = true, targetSkill = null }) {
  if (item.quarantined) return <p role="status">This question is unavailable while its answer or wording is reviewed.</p>;
  if (!stepMode && item.steps?.some(s => s && typeof s === "object"))
    return <SteppedQuestion {...{ item, ctx, onContinue, onResult, reason, restore, sessionId, context, assessmentVersion, delayed, assessmentTiming, timingMultiplier, activeQuestion, targetSkill }} />;
  const { cid, C, idx, state } = ctx;
  useEffect(() => {
    if (state.on && selection) append({ ...selection, id: `${sessionId}:decision:${item.id}`, course: cid,
      itemId: item.id, event: 'policy-decision' });
  }, [sessionId, item.id]);
  const signature = questionSignature(item);
  const tries = questionTries(item);
  const [saved] = useState(() => { const prior = state.getAttempt(item.id, signature);
    return shouldRestoreAttempt(prior, { context, sessionId, restore, delayed, timed: !!item.timing }) ? prior : null; });
  const [value, setValue] = useState(saved?.value ?? initialResponse(item.response));
  const [feedback, setFeedback] = useState(saved?.feedback || null);
  const [selfCheck, setSelfCheck] = useState(false);
  const [checking, setChecking] = useState(!!saved?.pendingSubmission);
  const [checkError, setCheckError] = useState("");
  const attempt = useRef(saved || newAttempt(signature, sessionId));
  const [timerReady, setTimerReady] = useState(!item.timing || !!saved?.timing || !!saved?.feedback?.recorded);
  const [timerView, setTimerView] = useState(() => effectiveTiming(saved?.timing, assessmentTiming));
  const draftSaved = useRef(saved?.value ?? initialResponse(item.response));
  const persistSequence = useRef(0), savedSequence = useRef(0);
  const pendingSubmission = useRef(saved?.pendingSubmission || null), expiring = useRef(false);
  const recoveringSubmission = useRef(false);
  const readClock = useRef(timingClock());
  const currentLimit = () => {
    const clock = readClock.current();
    const timing = effectiveTiming(attempt.current.timing, assessmentTiming, clock.now);
    if (timing && !clock.valid) { timing.valid = false; if (attempt.current.timing) attempt.current.timing.valid = false; }
    return timing;
  };
  const valueRef = useRef(value); valueRef.current = value;
  const progress = useRef(saved?.progress || attempt.current.progress);
  const clock = useRef(activeClock(Date.now(), saved ? ["resumed"] : []));
  const firstTiming = useRef(saved?.pendingSubmission && Number.isFinite(saved.activeMs) ? {activeMs:saved.activeMs,timingFlags:saved.timingFlags || []} : null);
  const feedbackClock = useRef(null);
  const persist = async (feedbackValue = attempt.current.feedback, nextValue = valueRef.current) => {
    try { assertResponseSize(nextValue); } catch (error) { if (active.current) setCheckError(error.message); return; }
    const sequence = ++persistSequence.current;
    await state.saveAttempt(item.id, { ...attempt.current, signature, value: nextValue,
      feedback: feedbackValue, progress: progress.current });
    if (sequence > savedSequence.current) { draftSaved.current = nextValue; savedSequence.current = sequence; }
  };
  const expose = () => {
    if (attempt.current.exposed) return;
    attempt.current.exposed = true;
    if (state.on) append({ id: `${attempt.current.attemptId}:exposure`, course: cid, event: "exposure",
      itemId: item.id, typeId: item.typeId, contentVersion: item.contentVersion || signature,
      group: item.group, attemptId: attempt.current.attemptId, beforeSubmission: !progress.current.used && !attempt.current.firstResponseSubmitted, sessionId: attempt.current.sessionId, context });
    persist();
  };
  const form = useRef(null);
  const committing = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const started = useRef(attempt.current.started);
  useEffect(() => {
    const visibility = () => { clock.current.update(!document.hidden && document.hasFocus());
      feedbackClock.current?.update(!document.hidden && document.hasFocus());
      if (attempt.current.timing) { attempt.current.timing = timingSnapshot(attempt.current.timing, readClock.current().now); persist(); }
    };
    clock.current.update(!document.hidden && document.hasFocus());
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", visibility); window.addEventListener("focus", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", visibility); window.removeEventListener("focus", visibility); };
  }, []);
  // Start the first attempt transaction in the commit that exposes its controls.
  useLayoutEffect(() => { if (!recorded.current) persist(); }, [value]);
  const recorded = useRef(!!saved?.feedback?.recorded);
  const response = item.response;
  const showFeedback = async (next, nextValue = value) => {
    committing.current = true;
    attempt.current.feedback = next;
    // Persist before showing controls that could trigger an immediate reload.
    await persist(next, nextValue);
    committing.current = false;
    if (active.current) setFeedback(next);
  };
  const remaining = tries - progress.current.used;
  const retryable = !delayed && !attempt.current.timedOut && feedback?.correct === false && !feedback.skipped && !feedback.recorded;
  const reveal = !delayed && feedback && (!retryable || response.kind === "self");

  const completeTry = (correct, submittedValue = valueRef.current, submittedAt = Date.now()) => {
    const observation = submissionObservation((attempt.current.submissionCount || 0) + 1, response, submittedValue,
      { correct, submittedAt, assisted: attempt.current.exposed || progress.current.used > 0 });
    attempt.current.submissionCount = observation.index;
    attempt.current.firstGrade ||= { ...observation, value: undefined };
    attempt.current.lastGrade = { ...observation, value: undefined };
    if (state.on) append({ ...observation, id: `${attempt.current.attemptId}:submission:${observation.index}`,
      event: "submission", course: cid, attemptId: attempt.current.attemptId, itemId: item.id,
      checkerVersion: "typed-v3", contentVersion: item.contentVersion || signature, evidenceVersion: item.evidenceVersion, context });
    if (!progress.current.used) {
      attempt.current.firstResponse = submittedValue;
      attempt.current.submittedAt ||= submittedAt;
      firstTiming.current ||= clock.current.stop();
      Object.assign(attempt.current, firstTiming.current);
      feedbackClock.current ||= activeClock();
      progress.current.firstUnaided = attempt.current.timedOut || (attempt.current.exposed && !(response.kind === "self" && attempt.current.firstResponseSubmitted)) ? null : !!correct;
    }
    progress.current = { ...progress.current, used: progress.current.used + 1 };
    if (!delayed && !attempt.current.timedOut && !correct && progress.current.used < tries) {
      if (response.kind === "single") progress.current.rejected = [...progress.current.rejected, Number(submittedValue)];
      if (response.kind === "multi") progress.current.combinations = [...progress.current.combinations, [...submittedValue].sort((a, b) => a - b).join(",")];
      // This is only a bounded retry-control cache. Full responses stay in the log.
      const rejectedKey = responseKey(submittedValue);
      if (rejectedKey.length <= 256) progress.current.wrongAnswers = [...(progress.current.wrongAnswers || []), rejectedKey].slice(-128);
      showFeedback({ correct: false, skipped: false });
    } else record(correct, false, response.kind === "self", submittedValue);
  };

  const record = (correct, skipped = false, selfChecked = response.kind === "self", finalValue = valueRef.current) => {
    if (recorded.current) return;
    recorded.current = true;
    const finalGrade = attempt.current.lastGrade || scoreResponse(response, finalValue, correct);
    const firstGrade = attempt.current.firstGrade || finalGrade;
    const methodCued = !!item.support?.includes("supplied-method");
    const timing = currentLimit();
    const timingValid = attempt.current.committedTimingValid ?? timing?.valid !== false;
    const status = attempt.current.timeoutUnanswered ? "timeout-unanswered" : attempt.current.timedOut ? "timeout-draft" :
      skipped ? "skipped" : correct == null ? "ungraded" : correct ? "correct" : "incorrect";
    const cfg = retention.configOf(C);
    const retentionKey = retentionKeyFor(item);
    const before = retentionKey && retention.get(cid, retentionKey);
    const predictedR = before?.reps ? retrievability(before, Date.now(), cfg.target) : null;
    const criterion = retentionKey ? Math.min(3, Math.max(1,
      [...(idx?.QALL || []), ...(idx?.PALL || [])].filter(q => retentionKeyFor(q) === retentionKey).length)) : 0;
    if (state.on) {
      if (correct != null) state.rate(item.id, null, correct);
      const priorSession = effectiveEvents(forCourse(cid, C), { bank: idx.BANK }).some(r => r.event === "attempt" && retentionKeyFor({ ...r, id: r.itemId }) === retentionKey &&
        r.sessionId === attempt.current.sessionId && retentionEligible(r,{allowSelf:true}));
      const eligible = retentionEligible({ firstUnaided: progress.current.firstUnaided, skipped,
        gradeSource: finalGrade.gradeSource, assisted: progress.current.firstUnaided == null,
        support: item.support, dependent: item.dependent, methodCued, timing, timingValid }, { priorSession, allowSelf:true });
      if (retentionKey && eligible) retention.answer(cid, retentionKey, {
        itemId: item.id, correct: item.typeId ? progress.current.firstUnaided : correct, conf: null, gradeSource:finalGrade.gradeSource, criterion, ...cfg
      });
      append({ id: `${attempt.current.attemptId}:complete`, event: "attempt", course: cid, loop: "Q", concept: item.concept, itemId: item.id,
        contentVersion: item.contentVersion || signature, attemptId: attempt.current.attemptId, typeId: item.typeId, group: item.group,
        targetSkill: targetSkill || selection?.targetSkill || undefined,
        skills: questionSkills(item), routes: item.routes || [], evidenceVersion: item.evidenceVersion, schemaVersion: item.schemaVersion,
        demand: item.demand || "standard", support: item.support || [], representation: item.representation,
        parentId: item.parentId, stepId: item.stepId, dependent: !!item.dependent,
        submittedResponse: attempt.current.firstResponse ?? finalValue, checkerVersion: "typed-v3", policyVersion: 3,
        gradeSource: finalGrade.gradeSource, score: finalGrade.score, maxScore: finalGrade.maxScore,
        criteria: firstGrade.criteria, submissionCount: attempt.current.submissionCount || 0,
        timedOut: !!attempt.current.timedOut, timeoutUnanswered: !!attempt.current.timeoutUnanswered, status,
        submittedAt: attempt.current.submittedAt || null,
        timing: timing || undefined, timingValid,
        errorHypotheses: progress.current.firstUnaided === false ? questionErrorHypotheses(item, attempt.current.firstResponse ?? finalValue).map(e => e.id) : [],
        demonstrates: item.demonstrates || [], methodCued, use: item.use || "practice", sessionId: attempt.current.sessionId, context, assessmentVersion,
        firstUnaided: progress.current.firstUnaided ?? null, triesUsed: progress.current.used,
        assisted: progress.current.firstUnaided == null || !!item.support?.length || !!item.dependent, feedbackExposure: !delayed,
        wallMs: Date.now() - started.current, feedbackMs: feedbackClock.current?.stop().activeMs || 0, ...(firstTiming.current || (progress.current.used && attempt.current.activeMs ?
          { activeMs: attempt.current.activeMs, timingFlags: [...(attempt.current.timingFlags || []), "resumed"] } : clock.current.stop())),
        type: item.type, format: response.kind, correct, skipped,
        criterion,
        selfChecked, latencyMs: Date.now() - started.current,
        predictedR, lane: laneFor(cid) });
    }
    if (!delayed) expose();
    onResult?.({ attemptId: attempt.current.attemptId, correct, skipped, firstUnaided: progress.current.firstUnaided ?? null, value: finalValue, selfChecked,
      timedOut: !!attempt.current.timedOut, status, gradeSource: finalGrade.gradeSource,
      score: finalGrade.score, maxScore: finalGrade.maxScore });
    return showFeedback({ correct, skipped, recorded: true, timedOut: !!attempt.current.timedOut,
      score: finalGrade.score, maxScore: finalGrade.maxScore, gradeSource: finalGrade.gradeSource }, finalValue);
  };

  useEffect(() => { if (!delayed && feedback?.recorded && !feedback.ignored) expose(); }, [delayed, feedback?.recorded]);

  const submit = async e => {
    e.preventDefault();
    if ((feedback && !retryable) || checking || committing.current || recorded.current || !canSubmit) return;
    const limit = currentLimit();
    if (!timerReady || limit?.enforce) { if (limit?.enforce) expire(); return; }
    try { assertResponseSize(valueRef.current); } catch (error) { setCheckError(error.message); return; }
    const submittedValue = JSON.parse(JSON.stringify(valueRef.current)), submittedAt = Date.now();
    pendingSubmission.current = { value: submittedValue, submittedAt };
    if (response.kind === "self" && delayed) {
      pendingSubmission.current = null;
      attempt.current.firstResponse = value;
      attempt.current.submittedAt ||= Date.now();
      firstTiming.current ||= clock.current.stop(); Object.assign(attempt.current, firstTiming.current);
      progress.current = { ...progress.current, used: 1, firstUnaided: null };
      record(null, false, true); return;
    }
    if (response.kind === "self") { pendingSubmission.current = null; setSelfCheck(false); attempt.current.firstResponse = value; attempt.current.firstResponseSubmitted = true;
      firstTiming.current ||= clock.current.stop(); Object.assign(attempt.current, firstTiming.current); expose(); showFeedback({ correct: null, skipped: false }); return; }
    if (response.kind === "formula") {
      setChecking(true); setCheckError("");
      firstTiming.current ||= clock.current.stop(); Object.assign(attempt.current,firstTiming.current);
      attempt.current.pendingSubmission = { version: 1, value: submittedValue, submittedAt,
        timingValid: limit?.valid !== false };
      attempt.current.committedTimingValid = limit?.valid !== false;
      try {
        // Persist the on-time commitment before starting an asynchronous worker.
        await persist(attempt.current.feedback, submittedValue);
        const result = await checkFormula(response, submittedValue);
        if (!active.current) return;
        delete attempt.current.pendingSubmission;
        completeTry(result === true, submittedValue, submittedAt);
      } catch (error) {
        delete attempt.current.pendingSubmission;
        if (active.current) { setCheckError(error.message); await persist(); }
      } finally { pendingSubmission.current = null; if (active.current) setChecking(false); }
      return;
    }
    completeTry(gradeQuestion(response, submittedValue), submittedValue, submittedAt);
    pendingSubmission.current = null;
  };

  useEffect(() => {
    const pending = saved?.pendingSubmission;
    if (!pending || recorded.current || recoveringSubmission.current || response.kind !== "formula") return;
    recoveringSubmission.current = true;
    const resume = async () => {
      try {
        if (pending.version !== 1 || !Number.isFinite(pending.submittedAt) || typeof pending.timingValid !== "boolean")
          throw new Error("Saved formula submission is invalid.");
        assertResponseSize(pending.value);
        // A completion may have reached the log just before a page was closed.
        const completed = forCourse(cid, C).find(row => row.id === `${attempt.current.attemptId}:complete`);
        if (completed) {
          recorded.current = true;
          delete attempt.current.pendingSubmission;
          await showFeedback({ correct: completed.correct, skipped: completed.skipped, recorded: true,
            timedOut: completed.timedOut, score: completed.score, maxScore: completed.maxScore,
            gradeSource: completed.gradeSource }, pending.value);
          onResult?.({ attemptId: attempt.current.attemptId, correct: completed.correct, skipped: completed.skipped, firstUnaided: completed.firstUnaided,
            value: pending.value, timedOut: completed.timedOut, gradeSource: completed.gradeSource,
            score: completed.score, maxScore: completed.maxScore });
          return;
        }
        const result = await checkFormula(response, pending.value);
        if (!active.current) return;
        attempt.current.committedTimingValid = pending.timingValid;
        delete attempt.current.pendingSubmission;
        completeTry(result === true, pending.value, pending.submittedAt);
      } catch (error) {
        delete attempt.current.pendingSubmission;
        if (active.current) { setCheckError(error.message); await persist(); }
      } finally { pendingSubmission.current = null; if (active.current) setChecking(false); }
    };
    resume();
  }, [signature]);

  const gradeReservedSelf = async correct => {
    if (feedback?.ignored) return;
    const original = forCourse(cid, C).find(r=>r.id === `${attempt.current.attemptId}:complete`);
    if (!original || scoredEvents(forCourse(cid, C)).find(r=>r.id===original.id)?.rubricScored) return;
    append({ id: `${attempt.current.attemptId}:rubric`, course: cid, event: "rubric-score",
      attemptId: attempt.current.attemptId, correct, selfChecked: true, gradeSource: "self" });
    setSelfCheck(true);
    state.rate(item.id, null, correct);
    await showFeedback({ ...feedback, correct });
    invalidate(cid); rebuild(cid, C);
    onResult?.({ correct, selfChecked: true });
  };
  const checkSelf = correct => { if (selfCheck || committing.current || recorded.current) return; setSelfCheck(true); completeTry(correct); };
  const skip = () => { if (!committing.current && !checking) record(false, true, response.kind === "self", draftSaved.current); };
  const markCorrect = async () => {
    if (committing.current || checking || !feedback || feedback.ignored || feedback.correct === true) return;
    if (!feedback.recorded) await record(feedback.correct);
    committing.current = true;
    setChecking(true);
    try {
      const next = await correctAnswer(ctx, item, { ...attempt.current, signature,
        value: valueRef.current, progress: progress.current });
      attempt.current.feedback = next;
      recorded.current = true;
      if (active.current) {
        setFeedback(next);
        onResult?.({ attemptId: attempt.current.attemptId, correct: true, firstUnaided: true,
          gradeRevised: true, gradeSource: "self", selfChecked: true, score: next.score, maxScore: next.maxScore, status: "correct" });
      }
    } catch (error) { if (active.current) setCheckError(error.message); }
    finally { committing.current = false; if (active.current) setChecking(false); }
  };
  const toggle = i => setValue(value.includes(i) ? value.filter(x => x !== i) : [...value, i]);
  const repeatedSet = response.kind === "multi" && progress.current.combinations.includes([...value].sort((a, b) => a - b).join(","));
  const repeatedAnswer = !["single", "multi"].includes(response.kind) &&
    ((progress.current.wrongAnswers || []).includes(responseKey(value)) ||
      (typeof value === "string" && (progress.current.wrongAnswers || []).includes(value.trim())));
  const editable = timerReady && !timerView?.enforce && (!feedback || retryable);
  const canSubmit = hasResponse(response, value) && !repeatedSet && !repeatedAnswer &&
    !(response.kind === "single" && progress.current.rejected.includes(Number(value)));

  const startTimer = async () => {
    if (attempt.current.timing || recorded.current || committing.current) return;
    attempt.current.timing = beginTiming({ ...item.timing, multiplier: timingMultiplier });
    committing.current = true;
    try { await persist(); setTimerReady(true); setTimerView(effectiveTiming(attempt.current.timing, assessmentTiming)); }
    finally { committing.current = false; }
  };
  const expire = async () => {
    if (recorded.current || expiring.current || pendingSubmission.current) return;
    expiring.current = true;
    const draft = draftSaved.current;
    attempt.current.timedOut = true;
    attempt.current.timeoutUnanswered = response.kind === "blanks"
      ? !Object.values(draft || {}).some(v => Array.isArray(v) ? v.length : String(v).trim())
      : Array.isArray(draft) ? !draft.length : !String(draft).trim();
    setValue(draft);
    if (response.kind === "self" || attempt.current.timeoutUnanswered) {
      attempt.current.firstResponse ??= draft;
      progress.current.firstUnaided = null;
      record(null, false, response.kind === "self", draft);
    } else {
      try {
        const correct = response.kind === "formula" ? await checkFormula(response, draft) : gradeQuestion(response, draft);
        completeTry(correct === true, draft);
      } catch { progress.current.firstUnaided = null; record(null, false, false, draft); }
    }
  };
  const expiry = useRef(expire); expiry.current = expire;
  useEffect(() => {
    if (!activeQuestion || recorded.current) return;
    if (!timerReady && assessmentTiming && item.timing) { startTimer(); return; }
    if (!timerReady || (!item.timing && !assessmentTiming)) return;
    const tick = () => {
      const snapshot = currentLimit();
      if (attempt.current.timing) attempt.current.timing = timingSnapshot(attempt.current.timing, readClock.current().now);
      setTimerView(snapshot);
      if (snapshot?.enforce) expiry.current();
    };
    tick(); const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timerReady, activeQuestion, assessmentTiming?.deadlineAt, feedback?.recorded]);

  const ignoreControl = feedback && !feedback.skipped && !attempt.current.timeoutUnanswered && !feedback.ignored && (
    <button type="button" class="dbtn ghost qignore" aria-label="Mark answer correct"
      title={feedback.gradeRevised ? "Marked correct by you" : "Mark this answer as correct"}
      aria-pressed={!!feedback.gradeRevised} disabled={!state.on || checking || feedback.correct === true}
      onClick={markCorrect}><IconThumbDown /></button>
  );

  return (
    <article class="q" data-qid={item.id}>
      <div class="qhead">
        <div class="qmeta">{!delayed && <span class="qtype">{item.type}</span>}{!delayed && reason && <span class="qreason">{reason}</span>}</div>
        {tries > 1 && <span class="qtries" aria-label={`${remaining} of ${tries} tries remaining`}>{remaining}/{tries}</span>}
      </div>
      {timerView && <p class="qtimer" role="timer" aria-label="Time remaining">
        {timerView.mode === "pacing" ? "Pacing target: " : "Time remaining: "}{Math.ceil(timerView.remainingMs / 1000)}s
        {!timerView.valid && " · clock changed"}
      </p>}
      {!timerReady && !feedback?.recorded && <button class="dbtn" type="button" disabled={!activeQuestion}
        onClick={startTimer}>Start timed question</button>}
      {questionStimuli(item.stimulus).map((part, i) => <Stimulus value={part} key={i} />)}
      <div class="qtext" dangerouslySetInnerHTML={{ __html: M(item.prompt) }} />
      <form class="qform" onSubmit={submit} ref={form}>
          {(response.kind === "single" || response.kind === "multi") && (
            <fieldset class="qchoices">
              <legend>{response.kind === "multi" ? "Select all that apply" : "Choose one answer"}</legend>
              {(response.choices || []).map((choice, at) => {
                const i = at + 1;
                const right = response.kind === "single" ? i === Number(response.correct)
                  : (response.correct || []).includes(i);
                const selected = response.kind === "multi" ? value.includes(i) : Number(value) === i;
                const rejected = response.kind === "single" && progress.current.rejected.includes(i);
                return <label class={"qchoice" + (reveal ? right ? " is-right" : selected ? " is-selected" : "" : rejected ? " is-selected" : "")} key={i}>
                  <input type={response.kind === "multi" ? "checkbox" : "radio"}
                    name={response.kind === "single" ? `answer-${item.id}` : undefined}
                    checked={selected} disabled={!editable || rejected}
                    onChange={() => response.kind === "multi" ? toggle(i) : setValue(i)} />
                  <span class="qchoice-content">
                    <span class="qchoice-text" dangerouslySetInnerHTML={{ __html: M(choice.text) }} />
                    {rejected && !reveal && <span class="qchoice-why"><span class="qchoice-mark">Incorrect</span></span>}
                    {reveal && <span class="qchoice-why">
                      <span class="qchoice-mark">{right ? "Correct" : "Not correct"}.</span>{" "}
                      <span dangerouslySetInnerHTML={{ __html: M(choice.why) }} />
                    </span>}
                  </span>
                </label>;
              })}
            </fieldset>
          )}
          {response.kind === "number" && <label class="qentry">Your answer
            <span><input type="text" data-numeric-answer inputMode={response.allowSymbols === false ? "decimal" : "text"}
              maxLength={128} placeholder={response.allowSymbols === false ? "Decimal only, e.g. 0.33" : "e.g. 1/3 or 1.2e3"} value={value} readOnly={!editable}
              onInput={e => setValue(e.currentTarget.value)} /> {response.unit || ""}</span>
          </label>}
          {response.kind === "text" && <label class="qentry">Your answer
            <input type="text" maxLength="4096" value={value} readOnly={!editable || checking} onInput={e => setValue(e.currentTarget.value)} />
          </label>}
          {response.kind === "blanks" && <ResponseFields fields={response.fields} value={value}
            readOnly={!editable || checking} onInput={setValue} />}
          {(response.kind === "self" || response.kind === "formula") && <AnswerInput response={response}
            value={value} readOnly={!editable || checking} onInput={next => { setValue(next); setCheckError(""); }} />}
          {checkError && <p class="qcheck-error" role="status">{checkError}</p>}
          {retryable && <strong class="qresult is-miss" role="status">Wrong</strong>}
          {editable && <div class="qactions qanswer-actions">
            <div class="qanswer-buttons">
              <button class="dbtn primary" type="submit" disabled={!canSubmit || checking}>{checking ? "Checking…" : "Check answer"}</button>
              <button class="dbtn ghost" type="button" disabled={checking} onClick={skip}>Skip</button>
              {item.help && <a class="dbtn ghost" href={questionHelpHref(cid, item, idx)} onClick={expose}>Need help</a>}
            </div>
            {ignoreControl}
          </div>}
          {editable && repeatedSet && <p class="qcheck-error" role="status">That combination was incorrect. Change your selection.</p>}
          {editable && repeatedAnswer && <p class="qcheck-error" role="status">That answer was incorrect. Change your answer.</p>}
      </form>
      {feedback && delayed && <div class="qbody" aria-live="polite"><strong>{feedback.ignored ? "Answer ignored" : "Response saved"}</strong>
        {onContinue && <button class="dbtn primary qnext" onClick={onContinue}>Continue</button>}</div>}
      {feedback && !delayed && !retryable && (
        <div class="qbody" aria-live="polite">
          <strong class={"qresult " + (feedback.ignored ? "" : feedback.correct ? "is-right" : "is-miss")}>
            {feedback.ignored ? "Answer ignored" : feedback.timedOut ? "Time expired" : feedback.skipped ? "Skipped" : feedback.correct == null ? "Compare your answer" :
              feedback.correct ? "Correct" : "Wrong"}
          </strong>
          {feedback.recorded && !feedback.ignored && <p class="qgrade">{feedback.skipped || (feedback.timedOut && feedback.correct == null) ? "No verified grade" : feedback.gradeSource === "self" || response.kind === "self" ? "Self-reported" : "Checked against answer rules"}
            {feedback.maxScore > 1 && ` · ${feedback.score}/${feedback.maxScore} points`}</p>}
          {reveal && response.kind === "text" && <p class="ans">Accepted: {response.accepted.join("; ")}</p>}
          {reveal && response.kind === "blanks" && <dl class="ans">{response.fields.map(field => <div key={field.id}>
            <dt>{field.label}</dt><dd>{field.response.kind === "text" ? field.response.accepted.join("; ") :
              field.response.kind === "number" ? field.response.value : field.response.kind === "single" ?
                field.response.choices[field.response.correct-1].text : field.response.correct.map(n => field.response.choices[n-1].text).join("; ")}</dd>
          </div>)}</dl>}
          {reveal && response.kind === "number" && <p class="ans">Answer: {response.value} {response.unit || ""}
            {numericTolerance(response) > 0 && ` (within ±${numericTolerance(response)})`}</p>}
          {!delayed && response.kind === "self" && (response.formulaParsing ? <div class="ans"><FormulaPreview value={response.model} freeform /></div> :
            <div class="ans" dangerouslySetInnerHTML={{ __html: M(response.model) }} />)}
          {reveal && response.kind === "formula" && <div class="ans"><FormulaPreview value={response.answer} variables={response.variables} independentVariable={response.independentVariable} /></div>}
          {reveal && item.why && <div class="qexplain" dangerouslySetInnerHTML={{ __html: M(item.why) }} />}
          {reveal && feedback.correct === false && questionErrorHypotheses(item, attempt.current.firstResponse ?? value).map(error =>
            <p key={error.id}>Possible issue: <span dangerouslySetInnerHTML={{ __html: M(error.description) }} /></p>)}
          {feedback.correct == null && !feedback.ignored && !feedback.timedOut && !selfCheck && !feedback.skipped && <div class="qactions">
            <span>Compared with your answer:</span>
            <button class="dbtn" onClick={() => feedback.recorded ? gradeReservedSelf(true) : checkSelf(true)}>Correct</button>
            <button class="dbtn" onClick={() => feedback.recorded ? gradeReservedSelf(false) : checkSelf(false)}>Wrong</button>
          </div>}
          {(reveal && item.help || feedback.recorded && onContinue) && <div class="qactions">
            {feedback.recorded && onContinue && <button class="dbtn primary" onClick={onContinue}>Continue</button>}
            {reveal && item.help && <a class="dbtn ghost" href={questionHelpHref(cid, item, idx)}>Review the relevant lesson</a>}
          </div>}
        </div>
      )}
      {!editable && (ignoreControl || feedback?.ignored) && <div class="qfooter">
        {feedback?.ignored && <span role="status">Excluded from learning progress</span>}
        {ignoreControl}
      </div>}
    </article>
  );
}
