import { useState, useRef } from "preact/hooks";
import { authored as M, safeMarkup } from "../lib/safe-markup.js";
import { renderBlock } from "../blocks/index.js";
import { gradeQuestion } from "../lib/questions.js";
import { append } from "../lib/log.js";
import * as retention from "../lib/retention.js";
import { laneFor } from "../lib/tiers.js";
import { retrievability } from "../lib/schedule.js";

function Stimulus({ value }) {
  if (!value) return null;
  if (value.t === "passage") return (
    <figure class="qstim">
      <blockquote dangerouslySetInnerHTML={{ __html: M(value.text || "") }} />
      {value.source && <figcaption dangerouslySetInnerHTML={{ __html: M(value.source) }} />}
    </figure>
  );
  return <div class="qstim" dangerouslySetInnerHTML={{ __html: safeMarkup(renderBlock(value, {})) }} />;
}

/* A single attempt. All three routes supply the same card and record the same
 * outcome; only their queue and progress chrome differ. */
export default function QuestionCard({ item, ctx, onContinue, onResult, reason = null }) {
  const { cid, C, idx, state } = ctx;
  const [value, setValue] = useState(item.response.kind === "multi" ? [] : "");
  const [feedback, setFeedback] = useState(null);
  const [selfCheck, setSelfCheck] = useState(false);
  const started = useRef(Date.now());
  const recorded = useRef(false);
  const response = item.response;

  const record = (correct, skipped = false) => {
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
        selfChecked: response.kind === "self", latencyMs: Date.now() - started.current,
        predictedR, lane: laneFor(cid) });
    }
    onResult?.({ correct, skipped });
    setFeedback({ correct, skipped, recorded: true });
  };

  const submit = e => {
    e.preventDefault();
    if (feedback) return;
    if (response.kind === "self") { setFeedback({ correct: null, skipped: false }); return; }
    record(gradeQuestion(response, value));
  };

  const checkSelf = correct => { setSelfCheck(true); record(correct); };
  const skip = () => record(false, true);
  const toggle = i => setValue(value.includes(i) ? value.filter(x => x !== i) : [...value, i]);
  const canSubmit = response.kind === "multi" ? value.length > 0 : String(value).trim() !== "";

  return (
    <article class="q" data-qid={item.id}>
      <div class="qhead">
        <div class="qmeta"><span class="qtype">{item.type}</span>{reason && <span class="qreason">{reason}</span>}</div>
        <Stimulus value={item.stimulus} />
        <div class="qtext" dangerouslySetInnerHTML={{ __html: M(item.prompt) }} />
      </div>
      <form class="qform" onSubmit={submit}>
          {(response.kind === "single" || response.kind === "multi") && (
            <fieldset class="qchoices">
              <legend>{response.kind === "multi" ? "Select all that apply" : "Choose one answer"}</legend>
              {(response.choices || []).map((choice, at) => {
                const i = at + 1;
                const right = response.kind === "single" ? i === Number(response.correct)
                  : (response.correct || []).includes(i);
                const selected = response.kind === "multi" ? value.includes(i) : Number(value) === i;
                return <label class={"qchoice" + (feedback ? right ? " is-right" : selected ? " is-selected" : "" : "")} key={i}>
                  <input type={response.kind === "multi" ? "checkbox" : "radio"}
                    name={response.kind === "single" ? `answer-${item.id}` : undefined}
                    checked={selected} disabled={!!feedback}
                    onChange={() => response.kind === "multi" ? toggle(i) : setValue(i)} />
                  <span class="qchoice-content">
                    <span class="qchoice-text" dangerouslySetInnerHTML={{ __html: M(choice.text) }} />
                    {feedback && <span class="qchoice-why">
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
          {response.kind === "self" && <label class="qentry">Your answer
            <textarea rows="4" value={value} readOnly={!!feedback} onInput={e => setValue(e.currentTarget.value)} />
          </label>}
          {!feedback && <div class="qactions">
            <button class="dbtn primary" type="submit" disabled={!canSubmit}>Check answer</button>
            <button class="dbtn ghost" type="button" onClick={skip}>Skip</button>
          </div>}
      </form>
      {feedback && (
        <div class="qbody" aria-live="polite">
          <strong class={"qresult " + (feedback.correct ? "is-right" : "is-miss")}>
            {feedback.skipped ? "Skipped" : feedback.correct == null ? "Compare your answer" :
              feedback.correct ? "Correct" : "Needs work"}
          </strong>
          {response.kind === "number" && <p class="ans">Answer: {response.value} {response.unit || ""}
            {Number(response.tolerance) > 0 && ` (within ±${response.tolerance})`}</p>}
          {response.kind === "self" && <div class="ans" dangerouslySetInnerHTML={{ __html: M(response.model) }} />}
          {item.why && <div class="qexplain" dangerouslySetInnerHTML={{ __html: M(item.why) }} />}
          {response.kind === "self" && !selfCheck && !feedback.skipped && <div class="qactions">
            <span>Compared with your answer:</span>
            <button class="dbtn" onClick={() => checkSelf(true)}>Got it</button>
            <button class="dbtn" onClick={() => checkSelf(false)}>Needs work</button>
          </div>}
          {feedback.recorded && onContinue && <button class="dbtn primary qnext" onClick={onContinue}>Continue →</button>}
        </div>
      )}
    </article>
  );
}
