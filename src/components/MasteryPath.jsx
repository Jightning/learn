import { useEffect, useState } from 'preact/hooks';
import { loadMasteryPath, availableEnvironment, setEnvironment, pathSettings, savePathSettings, exposeLesson, actionHref, reasonText } from '../lib/mastery-path.js';
import { normalizeQuestion } from '../lib/questions.js';
import QuestionCard from './QuestionCard.jsx';

const names = { teach: 'Read lesson', guided: 'Guided practice', independent: 'Independent check', practical: 'Practical task', defense: 'Written defense', delayed: 'Delayed check', repair: 'Review explanation', 'request-review': 'Request review' };

export default function MasteryPath({ ctx, selected = null }) {
  const { C, cid, idx } = ctx;
  const [data, setData] = useState(null), [error, setError] = useState('');
  const [revision, refresh] = useState(0);
  useEffect(() => {
    if (!C.mastery) return;
    let live = true;
    const load = () => { loadMasteryPath(cid, C).then(value => { if (live) { setData(value); setError(''); } }, e => { if (live) { setData(null); setError(e.message); } }); };
    load();
    const visible = () => { if (!document.hidden) load(); };
    addEventListener('focus', load); addEventListener('learn:synced', load);
    document.addEventListener('visibilitychange', visible);
    const timer = setInterval(visible, 30000);
    return () => { live = false; clearInterval(timer); removeEventListener('focus', load); removeEventListener('learn:synced', load); document.removeEventListener('visibilitychange', visible); };
  }, [C, cid, revision]);
  if (!C.mastery) return null;
  const commit = async write => {
    try { await write(); setData(null); refresh(n => n + 1); }
    catch (e) { setError(e.message); }
  };
  const update = patch => commit(() => savePathSettings(cid, { ...pathSettings(cid), ...patch }));
  if (error) return <section class="pcfg" aria-label="Required learning path"><p role="alert">{error}</p></section>;
  if (!data) return <p role="status">Loading required learning path…</p>;
  const { plan, state, settings } = data;
  const action = selected && plan.actions.find(a => a.id === selected);
  const activity = action?.activityId && C.activityIndex.activities[action.activityId];
  const question = activity?.question && idx.BANK[activity.question];
  return <section class="pcfg mastery-path" aria-label="Required learning path">
    <h2>Required learning path</h2>
    <p>{state.projection.complete ? 'All technical targets supported.' : 'Incomplete: required evidence remains.'} Historical claims are separate.</p>
    <div class="pcfg-row">
      <label>Session <select value={settings.minutes} onChange={e => update({ minutes: Number(e.currentTarget.value) })}>{[15,30,60,120].map(n => <option value={n}>{n} minutes</option>)}</select></label>
      <label>Wave <select value={settings.wave} onChange={e => update({ wave: Number(e.currentTarget.value) })}>{[...new Set([1, ...Object.values(C.activityIndex.activities).map(a => a.wave)])].sort((a,b)=>a-b).map(n => <option value={n}>{n}</option>)}</select></label>
      <label><input type="checkbox" checked={settings.placement} onChange={e => update({ placement: e.currentTarget.checked })} /> Offer placement checks</label>
    </div>
    {[...new Set(Object.values(C.activityIndex.activities).flatMap(a => a.environment?.capabilities || []))].map(id =>
      <label><input type="checkbox" checked={availableEnvironment(cid, C).has(id)} onChange={e => { const checked = e.currentTarget.checked; commit(() => setEnvironment(cid, id, checked)); }} /> I have access to {id}</label>)}
    {selected && <a class="dbtn ghost" href={`#/${cid}`}>Back to required path</a>}
    {selected && !action && <p role="status">This action is complete or no longer available. Return to the current path.</p>}
    {action && <article aria-label="Selected activity" data-activity-id={action.id}>
      <h3>{names[action.kind] || action.kind}: {idx.SUBS[action.lesson]?.sub.title || action.lesson}</h3>
      {action.reasons.map(r => <p>{reasonText(r)}</p>)}
      <a class="dbtn" href={`#/${cid}/${action.lesson}`}>Open lesson</a>
      {['teach','repair'].includes(action.kind) && <button class="dbtn" onClick={() => commit(() => exposeLesson(cid, action.lesson))}>I have read this lesson</button>}
      {['teach','repair'].includes(action.kind) && <p>Reading records exposure only; it does not establish mastery.</p>}
      {question && action.status === 'ready' && <QuestionCard key={action.id} item={normalizeQuestion(question, { id: activity.question, subId: activity.lesson })} ctx={ctx} sessionId={`path:${activity.id}:${activity.evidenceVersion}:${activity.rubricVersion}`} restore context={activity.delay ? "check" : "practice"} delayed={!!activity.delay} onResult={() => refresh(n => n + 1)} />}
      {activity?.lab && <p>{activity.lab.instructions}</p>}
      {activity?.kind === 'written-defense' && <p>Explain your reasoning against the activity criteria: {activity.tests.flatMap(t => t.criteria).join(', ')}.</p>}
      {activity && activity.kind !== 'question' && <p>Submission controls are not available yet. This activity remains incomplete.</p>}
      {question && !ctx.state.on && <p>Answer saving is disabled for this course.</p>}
      {question && <p>Practice answers alone do not certify this activity; verified activity evidence is required.</p>}
    </article>}
    <h3>Next required action</h3>
    {plan.queue.length ? <a class="dbtn primary" href={actionHref(cid, plan.queue[0])}>{names[plan.queue[0].kind] || plan.queue[0].kind} — {idx.SUBS[plan.queue[0].lesson]?.sub.title || plan.queue[0].lesson}</a> : <p>No executable action in this session. Check the gaps below.</p>}
    <details><summary>All remaining actions ({plan.actions.length})</summary>
      <ul>{plan.actions.map(a => <li key={a.id}><a href={actionHref(cid, a)}>{names[a.kind] || a.kind} · {a.id}</a> — {a.status === 'ready' ? 'Ready' : a.reasons.map(reasonText).join('; ')}</li>)}</ul>
    </details>
    <details><summary>Targets and evidence gaps</summary>
      <ul>{Object.values(C.mastery.roots).map(root => {
        const projected = state.projection.roots[root.id], provisional = state.projection.provisional[root.id];
        const facets = projected.anchors[root.requiredAnchor].facets;
        return <li key={root.id}><strong>{root.label}</strong>: {projected.anchor ?? 'Unknown'} / target {root.requiredAnchor}.
          <p>Open facets: {Object.entries(facets).filter(([, f]) => !f.complete).map(([name]) => name).join(', ') || 'None'}.
            Delayed checks remaining: {Object.values(facets).reduce((n,f) => n + f.missingDelayDays.length, 0)}.
            Provisional anchor: {provisional.anchor ?? 'Unknown'}.
            Historical claim: {state.projection.claims[root.id].status}.</p></li>;
      })}</ul>
    </details>
  </section>;
}
