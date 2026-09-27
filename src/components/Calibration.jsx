import { forCourse, toJSON, usage, fromJSON, all } from "../lib/log.js";
import { invalidate } from "../lib/replay.js";
import { useState } from "preact/hooks";
import { modelBands } from "../lib/calibrate.js";
import PrivacyNote from "./PrivacyNote.jsx";

const pct = x => `${Math.round(x * 100)}%`;

const Bar = ({ v, label }) => (
  <span class="cal-bar" role="img" aria-label={label}><i style={`width:${Math.round(v * 100)}%`} /></span>
);

/* Compare scheduled predictions with recorded outcomes. */
export default function Calibration({ ctx, onReset }) {
  const { cid } = ctx;
  const [note, setNote] = useState("");
  const rows = forCourse(cid);
  const model = modelBands(rows);
  const answers = rows.filter(r => r.correct != null);
  const misses = answers.filter(r => !r.correct).length;
  const selfChecked = answers.filter(r => r.selfChecked).length;

  const save = () => {
    const url = URL.createObjectURL(new Blob([toJSON()], { type: "application/json" }));
    const a2 = Object.assign(document.createElement("a"), { href: url, download: `study-log-${cid}.json` });
    a2.click(); URL.revokeObjectURL(url);
  };

  const load = async e => {
    const f = e.currentTarget.files && e.currentTarget.files[0];
    e.currentTarget.value = "";
    if (!f) return;
    try {
      const r = fromJSON(await f.text());
      /* Imported rows can predate any checkpoint, so every course refolds. */
      for (const id of new Set(all().map(x => x.course))) if (id) invalidate(id);
      setNote(r.merged ? `Merged ${r.merged} new answer(s). Reload to see them.`
                       : "Nothing new: those answers are already here.");
    } catch (err) { setNote(err.message); }
  };

  return (
    <div class="chub cal">
      <h1>Practice history</h1>

      {answers.length === 0 ? (
        <p class="cal-lede">
          No answers recorded yet. Answer a few questions to see how your practice is going.
        </p>
      ) : (
        <p class="cal-lede">
          {answers.length} answered; {misses} marked for more work.
          {selfChecked > 0 && <> {selfChecked} {selfChecked === 1 ? "answer was" : "answers were"} self-checked against a model answer.</>}
        </p>
      )}

      <h2 class="cal-h">Predicted against observed</h2>
      {model.length ? (
        <table class="cal-t">
          <tbody>
            {model.map(r => (
              <tr key={r.label}>
                <th>{r.label}</th>
                <td class="cal-c">{r.n}</td>
                <td><Bar v={r.observed} label={`${pct(r.observed)} observed`} /></td>
                <td class="cal-v">{pct(r.predicted)} → {pct(r.observed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p class="cal-empty">No scheduled reviews answered yet.</p>}

      <div class="cal-foot">
        <button class="dbtn ghost" id="cal-export" onClick={save}>Export the log →</button>
        <label class="dbtn ghost">
          Import a log →
          <input type="file" accept=".json,application/json" onChange={load} hidden />
        </label>
        <span class="cal-cap">{usage().n} rows kept</span>
      </div>

      {/* The only control on the site that can lose work, and it lives here
          rather than in the toolbar.
       *
       * It used to sit one thumb-width from Search, which is the wrong distance
       * for something unrecoverable. Here it is beside the log it erases, under
       * the row that offers to export that log first — so the way to keep the
       * history is in front of the reader at the moment they are considering
       * discarding it. Every count on this page is a fold over those same rows,
       * which is what makes this the page it belongs on. */}
      {onReset && ctx.state.on && (
        <div class="cal-danger">
          <button class="dbtn danger" onClick={onReset}>Clear this course's history</button>
          <span class="cal-cap">
            Erases every answer and review interval for {ctx.C.code}. Export first, because this
            cannot be undone.
          </span>
        </div>
      )}

      {note && <p class="cio-msg">{note}</p>}
      <PrivacyNote />
    </div>
  );
}
