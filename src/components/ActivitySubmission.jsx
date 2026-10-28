import { useRef, useState } from 'preact/hooks';
import { commitSubmission, saveSubmissionDraft, submissionsFor, feedbackReady, defenseComplete, importSubmissionResult, revealSubmissionFeedback } from '../lib/activity-submission.js';

const blankArtifact = existing => ({ id: Array.from({ length: 8 }, (_, i) => `artifact-${i + 1}`).find(id => !existing.some(a => a.id === id)), url: '', sha256: '', bytes: 0, mediaType: 'text/plain' });

export default function ActivitySubmission({ ctx, activity, state, onChange }) {
  const { C, cid } = ctx;
  const savedDraft = state.drafts.find(d => d.activityId === activity.id && d.compatible);
  const draft = savedDraft?.input, context = savedDraft?.context;
  const [text, setText] = useState(draft?.text || ''), [artifacts, setArtifacts] = useState(draft?.artifacts || []);
  const [prompt, setPrompt] = useState(draft?.followup?.prompt || ''), [reviewer, setReviewer] = useState(draft?.followup?.reviewerId || '');
  const [assistance, setAssistance] = useState(context?.assistance.sources || []), [exposed, setExposed] = useState(context?.assistance.answerExposed || false);
  const [active, setActive] = useState(context?.timing.activeMs == null ? '' : String(context.timing.activeMs / 60000)), [setup, setSetup] = useState(context?.timing.setupMs == null ? '' : String(context.timing.setupMs / 60000)), [environment, setEnvironment] = useState(context?.environment.description || '');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [result, setResult] = useState(''), [target, setTarget] = useState('');
  const lock = useRef(false), attempt = useRef(crypto.randomUUID());
  const followupHash = useRef(draft?.followup?.submissionHash || null);
  const submissions = submissionsFor(state, activity.id), latest = submissions.at(-1);
  const initial = submissions.filter(r => !r.request.input.followup).at(-1);
  const followup = activity.kind === 'written-defense' && initial && !defenseComplete(state, activity.id);
  if (followup && !followupHash.current) followupHash.current = initial.request.submissionHash;
  const input = () => ({ text, ...(artifacts.length ? { artifacts } : {}),
    ...(followup ? { followup: { submissionHash: followupHash.current, prompt, reviewerId: reviewer } } : {}) });
  const run = async task => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await task(); onChange(); }
    catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const minutes = value => {
    if (value === '') return null;
    const n = Number(value) * 60000;
    if (!Number.isSafeInteger(n) || n < 0) throw new Error('Time must be a nonnegative number of minutes');
    return n;
  };
  const reportedContext = () => ({ assistance: { sources: assistance, answerExposed: exposed || assistance.includes('solution') },
    timing: { activeMs: minutes(active), setupMs: minutes(setup), wallMs: null, source: 'external-report', interrupted: false },
    environment: { description: environment } });
  const ready = feedbackReady(C, state, activity.id);
  const patchArtifact = (index, field, value) => setArtifacts(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r));
  return <div class="activity-submission">
    {activity.lab && <div>
      <p>{activity.lab.instructions}</p>
      <a class="dbtn" href={activity.lab.url} target="_blank" rel="noopener noreferrer">Open public package</a>
      <p>Package {activity.lab.id}, version {activity.lab.version}. Verify SHA-256 before using it:</p>
      <code class="submission-hash">{activity.lab.sha256}</code>
      <p>Run externally: <code>{activity.lab.command}</code></p>
      {activity.lab.cleanup && <p>Cleanup: {activity.lab.cleanup}</p>}
    </div>}
    {activity.environment?.instructions && <p>{activity.environment.instructions}</p>}
    <p>Files run in your external environment. References retain their location and claimed checksum; file bytes are unavailable here and do not sync.</p>
    <h4>Rubric</h4>
    <ul>{activity.tests.map(t => {
      const root = C.mastery.roots[t.root], policy = C.mastery.policies[root.policy];
      return <li>{root.label} · {root.facets[t.facet].standard} · anchor {t.anchor}
        <ul>{t.criteria.map(id => <li>{policy.criteria[id].standard}{policy.criteria[id].critical ? ' (required criterion)' : ''}</li>)}</ul>
      </li>;
    })}</ul>
    {!ctx.state.on && <p role="status">Answer saving is disabled for this course. Enable it to submit activity work.</p>}
    <form onSubmit={e => { e.preventDefault(); run(async () => {
      await commitSubmission(cid, C, activity.id, input(), reportedContext(), attempt.current);
      attempt.current = crypto.randomUUID(); followupHash.current = null; setText(''); setArtifacts([]); setPrompt(''); setReviewer('');
      setMessage('Submission committed. Original input is retained.');
    }); }}>
      <fieldset disabled={busy || !ctx.state.on}>
        <legend>{followup ? 'Fresh reviewer follow-up' : activity.kind === 'written-defense' ? 'Written explanation before feedback' : 'External work'}</legend>
        {followup && <>
          <p>Ask a reviewer for a fresh question about this explanation. The reviewer name is a claim and does not verify review.</p>
          <label>Reviewer name or ID<input required maxLength={512} value={reviewer} onInput={e => setReviewer(e.currentTarget.value)} /></label>
          <label>Reviewer-selected fresh prompt<textarea required maxLength={2048} value={prompt} onInput={e => setPrompt(e.currentTarget.value)} /></label>
        </>}
        <label>{followup ? 'Follow-up answer' : 'Code, report or explanation'}<textarea value={text} maxLength={12000} onInput={e => setText(e.currentTarget.value)} /></label>
        {artifacts.map((a, i) => <fieldset><legend>Artifact reference {i + 1}</legend>
          <label>HTTPS file URL<input type="url" required value={a.url} onInput={e => patchArtifact(i, 'url', e.currentTarget.value)} /></label>
          <label>Artifact SHA-256<input required pattern="[a-f0-9]{64}" value={a.sha256} onInput={e => patchArtifact(i, 'sha256', e.currentTarget.value)} /></label>
          <label>File size in bytes<input type="number" min="0" required value={a.bytes} onInput={e => patchArtifact(i, 'bytes', Number(e.currentTarget.value))} /></label>
          <label>Media type<input required value={a.mediaType} onInput={e => patchArtifact(i, 'mediaType', e.currentTarget.value)} /></label>
          <button type="button" class="dbtn ghost" onClick={() => setArtifacts(rows => rows.filter((_, n) => n !== i))}>Remove reference {i + 1}</button>
        </fieldset>)}
        {activity.kind === 'external-lab' && artifacts.length < 8 && <button type="button" class="dbtn ghost" onClick={() => setArtifacts(rows => [...rows, blankArtifact(rows)])}>Add artifact reference</button>}
        <button type="button" class="dbtn" onClick={() => run(async () => { await saveSubmissionDraft(cid, C, activity.id, input(), reportedContext()); setMessage('Draft saved with assistance and reported time.'); })}>Save draft</button>
        <button type="button" class="dbtn ghost" onClick={() => run(async () => {
          await saveSubmissionDraft(cid, C, activity.id, null);
          followupHash.current = initial?.request.submissionHash || null;
          setText(''); setArtifacts([]); setPrompt(''); setReviewer(''); setAssistance([]); setExposed(false); setActive(''); setSetup(''); setEnvironment('');
          setMessage('Draft cleared. Committed work is retained.');
        })}>Start a fresh draft</button>
        <fieldset><legend>Assistance used</legend>{['hint','reference','collaboration','instructor','ai','solution'].map(source => <label><input type="checkbox" checked={assistance.includes(source)} onChange={e => setAssistance(xs => e.currentTarget.checked ? [...xs, source] : xs.filter(x => x !== source))} /> {source}</label>)}
          <label><input type="checkbox" checked={exposed} onChange={e => setExposed(e.currentTarget.checked)} /> Saw an answer or solution</label>
        </fieldset>
        <label>Active minutes (blank means unknown)<input type="number" min="0" step="0.01" value={active} onInput={e => setActive(e.currentTarget.value)} /></label>
        <label>Setup minutes (blank means unknown)<input type="number" min="0" step="0.01" value={setup} onInput={e => setSetup(e.currentTarget.value)} /></label>
        <label>Environment used<input required maxLength={2048} value={environment} onInput={e => setEnvironment(e.currentTarget.value)} /></label>
        <button class="dbtn primary" type="submit">{followup ? 'Commit follow-up before feedback' : 'Commit submission'}</button>
      </fieldset>
    </form>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {latest && <p>Saved attempts: {submissions.length}. Changed work creates a new immutable attempt.</p>}
    {latest && activity.kind === 'external-lab' && Object.values(C.activityIndex.activities)
      .filter(a => a.kind === 'written-defense' && a.after.includes(activity.id))
      .map(a => <a class="dbtn" href={`#/${cid}/activity/${encodeURIComponent(a.id)}`}>Continue to written defense</a>)}
    {submissions.map(row => <details key={row.id}><summary>Committed {row.request.input.followup ? 'follow-up' : 'submission'} · {new Date(row.ts).toLocaleString()}</summary>
      <p class="submission-hash">Input SHA-256: {row.request.submissionHash}</p>
      <pre>{row.request.input.text}</pre>
      {row.request.input.followup && <p>Reviewer claim: {row.request.input.followup.reviewerId}. Prompt: {row.request.input.followup.prompt}</p>}
      {(row.request.input.artifacts || []).map(a => <p><a href={a.url} target="_blank" rel="noopener noreferrer">External reference</a> · bytes unavailable here · <span class="submission-hash">{a.sha256}</span></p>)}
      <p>Assistance: {row.assistance.sources.join(', ') || 'None reported'}. Answer exposed: {row.assistance.answerExposed ? 'Yes' : 'No'}.</p>
      <p>Reported active minutes: {row.timing.activeMs === null ? 'Unknown' : row.timing.activeMs / 60000}. Setup: {row.timing.setupMs === null ? 'Unknown' : row.timing.setupMs / 60000}. Environment: {row.environment.description}.</p>
      <label>Submission envelope for external review<textarea readOnly value={JSON.stringify(row.request, null, 2)} /></label>
    </details>)}
    {latest && !ready && <p>Feedback is held until the written defense and fresh reviewer follow-up are committed.</p>}
    {latest && ready && <div>
      <h4>External rubric result</h4><p>Imported results remain provisional. A human label or public-test report cannot authenticate review or satisfy private checks.</p>
      <label>Result for submission<select value={target || latest.id} onChange={e => setTarget(e.currentTarget.value)}>{submissions.map(r => <option value={r.id}>{r.id}</option>)}</select></label>
      <label>Result JSON<textarea maxLength={16000} value={result} onInput={e => setResult(e.currentTarget.value)} /></label>
      <button class="dbtn" disabled={busy || !ctx.state.on} onClick={() => run(async () => { await importSubmissionResult(cid, C, target || latest.id, JSON.parse(result)); setResult(''); setMessage('Provisional result saved.'); })}>Import provisional result</button>
      {state.rows.filter(r => r.event === 'activity-evaluation' && submissions.some(s => s.id === r.submissionId)).map(evaluation => {
        const revealed = state.rows.some(r => r.event === 'activity-feedback' && r.evaluationId === evaluation.id);
        return <div key={evaluation.id}>{revealed ? <div><p>{evaluation.result.status} · Provisional feedback ({evaluation.result.provenance.kind})</p><ul>{evaluation.result.criteria.map(c => <li>{c.root} · {c.facet} · {c.criterion}: {c.outcome}</li>)}</ul></div> :
          <button class="dbtn" disabled={busy || !ctx.state.on} onClick={() => run(() => revealSubmissionFeedback(cid, C, evaluation.id))}>Show saved rubric feedback</button>}</div>;
      })}
    </div>}
  </div>;
}
