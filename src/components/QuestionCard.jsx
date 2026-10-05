import { useState, useRef, useEffect } from "preact/hooks";
import AnswerInput, { FormulaPreview } from "./AnswerInput.jsx";
import { checkFormula } from "../lib/formula-check.js";
import { authored as M, safeMarkup } from "../lib/safe-markup.js";
import { renderBlock } from "../blocks/index.js";
import { gradeQuestion, questionStimuli, questionSignature, questionTries } from "../lib/questions.js";
import { append } from "../lib/log.js";
import * as retention from "../lib/retention.js";
import { laneFor } from "../lib/tiers.js";
import { retrievability } from "../lib/schedule.js";

function Stimulus({ value }) {
  if (!value) return null;
  if (value.t === "passage") return (
    <figure class="qstim qstim-passage">
      <blockquote dangerouslySetInnerHTML={{ __html: M(value.text || "") }} />
      {value.source && <figcaption dangerouslySetInnerHTML={{ __html: M(value.source) }} />}
    </figure>
  );
  return <div class={`qstim qstim-${value.t}`} dangerouslySetInnerHTML={{ __html: safeMarkup(renderBlock(value, {})) }} />;
}

/* A question run. All three routes supply the same card and record the same
 * outcome; only their queue and progress chrome differ. */
export default function QuestionCard({ item, ctx, onContinue, onResult, reason = null, restore = false }) {
  const { cid, C, idx, state } = ctx;
  const signature = questionSignature(item);
  const tries = questionTries(item);
  const [saved] = useState(() => restore ? state.getAttempt(item.id, signature) : null);
  const [value, setValue] = useState(saved?.value ?? (item.response.kind === "multi" ? [] : ""));
  const [feedback, setFeedback] = useState(saved?.feedback || null);
  const [selfCheck, setSelfCheck] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const progress = useRef(saved?.progress || { used: 0, rejected: [], combinations: [] });
  const form = useRef(null);
  const committing = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const started = useRef(Date.now());
  const recorded = useRef(!!saved?.feedback?.recorded);
  const response = item.response;
  const showFeedback = async (next, nextValue = value) => {
    committing.current = true;
    // Persist before showing controls that could trigger an immediate reload.
    if (restore) await state.saveAttempt(item.id, { signature, value: nextValue, feedback: next, progress: progress.current });
    committing.current = false;
    if (active.current) setFeedback(next);
  };
  const remaining = tries - progress.current.used;
  const retryable = feedback?.correct === false && !feedback.skipped && !feedback.recorded;
  const reveal = feedback && (!retryable || response.kind === "self");

  const completeTry = correct => {
    progress.current = { ...progress.current, used: progress.current.used + 1 };
    if (!correct && progress.current.used < tries) {
      if (response.kind === "single") progress.current.rejected = [...progress.current.rejected, Number(value)];
      if (response.kind === "multi") progress.current.combinations = [...progress.current.combinations, [...value].sort((a, b) => a - b).join(",")];
      showFeedback({ correct: false, skipped: false });
    } else record(correct);
  };
  const retry = async () => {
    if (committing.current) return;
    const nextValue = response.kind === "single" ? "" : value;
    setValue(nextValue); setSelfCheck(false); setCheckError("");
    await showFeedback(null, nextValue);
    requestAnimationFrame(() => form.current?.querySelector("input:not(:disabled), textarea, math-field")?.focus());
  };

  const record = (correct, skipped = false, selfChecked = response.kind === "self") => {
    if (recorded.current) return;
    recorded.current = true;
    const cfg = retention.configOf(C);
    const before = item.concept && retention.get(cid, item.concept);
    const predictedR = before?.reps ? retrievability(before, Date.now(), cfg.target) : null;
    const criterion = item.concept ? Math.min(3, Math.max(1,
      [...(idx?.QALL || []), ...(idx?.PALL || [])].filter(q => q.concept === item.concept).length)) : 0;
    if (state.on) {
      state.rate(item.id, null, correct);
      if (item.concept) retention.answer(cid, item.concept, {
        itemId: item.id, correct, conf: null, criterion, ...cfg
      });
      append({ course: cid, loop: "Q", concept: item.concept, itemId: item.id,
        type: item.type, format: response.kind, correct, skipped,
        criterion,
        selfChecked, latencyMs: Date.now() - started.current,
        predictedR, lane: laneFor(cid) });
    }
    onResult?.({ correct, skipped });
    showFeedback({ correct, skipped, recorded: true });
  };

  const submit = async e => {
    e.preventDefault();
    if (feedback || checking || committing.current || recorded.current || !canSubmit) return;
    if (response.kind === "self") { showFeedback({ correct: null, skipped: false }); return; }
    if (response.kind === "formula") {
      setChecking(true); setCheckError("");
      try {
        const result = await checkFormula(response, value);
        if (!active.current) return;
        completeTry(result === true);
      } catch (error) { if (active.current) setCheckError(error.message); }
      finally { if (active.current) setChecking(false); }
      return;
    }
    completeTry(gradeQuestion(response, value));
  };

  const checkSelf = correct => { if (selfCheck || committing.current || recorded.current) return; setSelfCheck(true); completeTry(correct); };
  const skip = () => { if (!committing.current && !checking) record(false, true); };
  const toggle = i => setValue(value.includes(i) ? value.filter(x => x !== i) : [...value, i]);
  const repeatedSet = response.kind === "multi" && progress.current.combinations.includes([...value].sort((a, b) => a - b).join(","));
  const canSubmit = response.kind === "multi" ? value.length > 0 && !repeatedSet
    : String(value).trim() !== "" && !(response.kind === "single" && progress.current.rejected.includes(Number(value)));

  return (
    <article class="q" data-qid={item.id}>
      <div class="qhead">
        <div class="qmeta"><span class="qtype">{item.type}</span>{reason && <span class="qreason">{reason}</span>}</div>
      </div>
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
                    checked={selected} disabled={!!feedback || rejected}
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
            <span><input type="number" step="any" inputMode="decimal" value={value} readOnly={!!feedback}
              onInput={e => setValue(e.currentTarget.value)} /> {response.unit || ""}</span>
          </label>}
          {(response.kind === "self" || response.kind === "formula") && <AnswerInput response={response}
            value={value} readOnly={!!feedback || checking} onInput={next => { setValue(next); setCheckError(""); }} />}
          {checkError && <p class="qcheck-error" role="status">{checkError}</p>}
          {!feedback && <div class="qactions">
            <button class="dbtn primary" type="submit" disabled={!canSubmit || checking}>{checking ? "Checking…" : "Check answer"}{!checking && tries > 1 && <small> · {remaining} {remaining === 1 ? "try" : "tries"} left</small>}</button>
            <button class="dbtn ghost" type="button" disabled={checking} onClick={skip}>Skip</button>
          </div>}
          {!feedback && repeatedSet && <p class="qcheck-error" role="status">That combination was incorrect. Change your selection.</p>}
      </form>
      {feedback && (
        <div class="qbody" aria-live="polite">
          <strong class={"qresult " + (feedback.correct ? "is-right" : "is-miss")}>
            {feedback.skipped ? "Skipped" : feedback.correct == null ? "Compare your answer" :
              feedback.correct ? "Correct" : "Wrong"}
          </strong>
          {reveal && response.kind === "number" && <p class="ans">Answer: {response.value} {response.unit || ""}
            {Number(response.tolerance) > 0 && ` (within ±${response.tolerance})`}</p>}
          {response.kind === "self" && (response.formulaParsing ? <div class="ans"><FormulaPreview value={response.model} freeform /></div> :
            <div class="ans" dangerouslySetInnerHTML={{ __html: M(response.model) }} />)}
          {reveal && response.kind === "formula" && <div class="ans"><FormulaPreview value={response.answer} variables={response.variables} independentVariable={response.independentVariable} /></div>}
          {reveal && item.why && <div class="qexplain" dangerouslySetInnerHTML={{ __html: M(item.why) }} />}
          {retryable && <button class="dbtn primary" onClick={retry}>Try again<small> · {remaining} {remaining === 1 ? "try" : "tries"} left</small></button>}
          {feedback.correct == null && !selfCheck && !feedback.skipped && <div class="qactions">
            <span>Compared with your answer:</span>
            <button class="dbtn" onClick={() => checkSelf(true)}>Correct</button>
            <button class="dbtn" onClick={() => checkSelf(false)}>Wrong</button>
          </div>}
          {feedback.recorded && onContinue && <button class="dbtn primary qnext" onClick={onContinue}>Continue →</button>}
        </div>
      )}
    </article>
  );
}
