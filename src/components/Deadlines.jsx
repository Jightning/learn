import { useEffect, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { ORDER, INDEX, getAll } from '../lib/library.js';
import { buildIndex, labelOf } from '../lib/index.js';
import { forCourse } from '../lib/log.js';
import { stateFor } from '../lib/state.js';
import { goals, saveGoal, deleteGoal, planAcrossCourses } from '../lib/learn-by.js';
import { flush } from '../lib/store.js';
import { questionHelpHref } from '../lib/questions.js';
import Modal from './Modal.jsx';

const localValue = time => {
  const d = new Date(time - new Date(time).getTimezoneOffset() * 6e4);
  return d.toISOString().slice(0, 16);
};
const forecastLabel = detail => detail.expired ? 'Ended' :
  detail.forecast === 'content-gap' ? 'Question gap' :
  detail.forecast === 'insufficient-time' ? 'Time gap' :
  detail.forecast === 'availability-unknown' ? 'Time unset' : 'On plan';

export default function Deadlines({ only = null, ctx = null }) {
  const [books, setBooks] = useState(ctx ? [{ cid: ctx.cid, ...ctx }] : null);
  const [, update] = useState(0);
  const [error, setError] = useState('');
  const [cid, setCid] = useState(only || ORDER[0] || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dueAt, setDueAt] = useState(localValue(Date.now() + 7 * 864e5));
  const [intensity, setIntensity] = useState('focus');
  const [name, setName] = useState('');
  const [minutesPerDay, setMinutesPerDay] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState('');
  const [standard, setStandard] = useState('');
  const [editing, setEditing] = useState(null);
  const [readinessGoal, setReadinessGoal] = useState(null);
  useEffect(() => {
    let live = true;
    getAll(ORDER).then(pairs => {
      if (!live) return;
      const loaded = pairs.map(([id, C]) => ({ cid: id, C, idx: buildIndex(C), state: stateFor(id, C) }));
      setBooks(ctx ? [...loaded.filter(b => b.cid !== ctx.cid), { cid: ctx.cid, ...ctx }] : loaded);
    });
    return () => { live = false; };
  }, [only, ctx?.cid]);
  const book = books?.find(b => b.cid === (only || cid));
  const ids = Object.keys(book?.idx.SUBS || {});
  const allGoals = goals().filter(g => !books || books.some(b => b.cid === g.cid));
  const shown = allGoals.filter(g => !only || g.cid === only);
  const combined = books && planAcrossCourses(books, allGoals, Object.fromEntries(books.map(b => [b.cid, forCourse(b.cid, b.C)])));
  const edit = g => {
    setEditing(g.id); setCid(g.cid); setFrom(g.from); setTo(g.to); setDueAt(localValue(g.dueAt));
    setIntensity(g.intensity); setName(g.name || ''); setError('');
    setMinutesPerDay(g.minutesPerDay ?? ''); setSessionMinutes(g.sessionMinutes ?? ''); setStandard(g.standard || '');
  };
  const submit = async event => {
    event.preventDefault(); setError('');
    try {
      saveGoal({ id: editing, cid: book.cid, from: from || ids[0], to: to || ids.at(-1),
        dueAt: new Date(dueAt).getTime(), intensity, name, standard,
        minutesPerDay: minutesPerDay === '' ? undefined : Number(minutesPerDay),
        sessionMinutes: sessionMinutes === '' ? undefined : Number(sessionMinutes) }, book.idx);
      await book.state.saveSession(null);
      await flush(); update(n => n + 1); setEditing(null); setName('');
    } catch (e) { setError(e.message); }
  };
  const remove = async id => {
    try { deleteGoal(id); await flush(); update(n => n + 1); setEditing(null); setError(''); }
    catch (e) { setError(e.message); }
  };
  return <div class="deadlines-page">
    <div class="deadline-list">
      {shown.map(g => {
        const b = books?.find(x => x.cid === g.cid);
        const expired = g.dueAt <= Date.now();
        const detail = combined?.details.find(d => d.goal.id === g.id);
        return <article class="deadline-card" key={g.id}>
          <div class="deadline-card-head"><div>
            <h2>{g.name || `${labelOf(b?.idx.SUBS || {}, g.from)} through ${labelOf(b?.idx.SUBS || {}, g.to)}`}</h2>
            <div class="deadline-meta"><span>{INDEX[g.cid]?.code || g.cid}</span><span>{g.intensity === 'focus' ? 'Focus' : 'Checkpoint'}</span><time dateTime={new Date(g.dueAt).toISOString()}>{new Date(g.dueAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</time></div>
          </div><strong>{detail ? `${detail.progress}%` : '…'}</strong></div>
          {detail && <>
            <div class="deadline-meter" role="meter" aria-label="Supported requirements" aria-valuenow={detail.progress} aria-valuemin="0" aria-valuemax="100"><i style={`width:${detail.progress}%`} /></div>
            <div class="deadline-brief"><span>{Object.values(detail.states).filter(s => s.supported).length}/{detail.types.length} skills</span>
              <span>{forecastLabel(detail)}</span></div>
          </>}
          <div class="deadline-actions"><button class="dbtn" onClick={() => setReadinessGoal(g.id)}>Readiness</button><button class="dbtn ghost" onClick={() => edit(g)}>Edit</button><button class="dbtn ghost" onClick={() => remove(g.id)}>Remove</button></div>
        </article>;
      })}
      {!shown.length && <p>No learn-by goals yet.</p>}
    </div>
    {readinessGoal && (() => {
      const detail = combined?.details.find(d => d.goal.id === readinessGoal);
      const b = books?.find(x => x.cid === detail?.goal.cid);
      if (!detail || !b) return null;
      const supported = Object.values(detail.states).filter(s => s.supported).length;
      return createPortal(<Modal title={detail.goal.name || 'Readiness'} className="readiness-modal" onClose={() => setReadinessGoal(null)}>
        <div class="readiness-hero"><strong>{detail.progress}%</strong><div><span>Skills supported</span><b>{supported} / {detail.types.length}</b></div></div>
        <div class="deadline-meter" role="meter" aria-label="Supported requirements" aria-valuenow={detail.progress} aria-valuemin="0" aria-valuemax="100"><i style={`width:${detail.progress}%`} /></div>
        <div class="readiness-metrics"><div><strong>{detail.coverage}%</strong><span>Sampled</span></div><div><strong>{detail.retentionNeeds}</strong><span>Review due</span></div><div><strong>{Math.ceil(detail.workRange.typical)} min</strong><span>Work estimate</span></div></div>
        <div class="readiness-status"><span class={`readiness-chip ${detail.forecast === 'insufficient-time' || detail.forecast === 'content-gap' ? 'readiness-alert' : ''}`}>
          {forecastLabel(detail)}</span>
          <span>{detail.standardLabel}</span></div>
        <h3>Skills</h3>
        <div class="readiness-skills">{detail.types.map(id => <div class="readiness-skill" key={id}><span>{b.idx.TYPES[id]?.task || id}</span><strong class={detail.states[id]?.supported ? 'readiness-ok' : ''}>{detail.states[id]?.supported ? 'Supported' : detail.missing.includes(id) ? 'No question' : detail.states[id]?.status === 'contradicted' ? 'Needs repair' : detail.states[id]?.status === 'review' ? 'Review due' : 'Needs evidence'}</strong></div>)}</div>
        {!detail.expired && !!detail.actions.length && <><h3>Next</h3><div class="readiness-next">{detail.actions.filter(a => a.scheduledAt !== null).slice(0, 3).map(a => <div key={a.id}><span>{a.action === 'teach' && a.help ? <a href={questionHelpHref(detail.goal.cid, { help: a.help }, b.idx)} onClick={() => setReadinessGoal(null)}>{b.idx.TYPES[a.skillId]?.task || a.skillId}</a> : b.idx.TYPES[a.skillId]?.task || a.skillId}</span><strong>{a.action}</strong></div>)}</div></>}
        <div class="deadline-actions"><button class="dbtn ghost" onClick={() => { edit(detail.goal); setReadinessGoal(null); }}>Edit goal</button><a class="dbtn primary" href={`#/${detail.goal.cid}/review/mixed`} onClick={() => setReadinessGoal(null)}>Practice</a></div>
      </Modal>, document.body);
    })()}
    <form class="deadline-form" onSubmit={submit}>
      <h2>{editing ? 'Edit learn-by goal' : 'Add a learn-by goal'}</h2>
      {!only && <label>Course <select value={cid} onChange={e => { setCid(e.currentTarget.value); setFrom(''); setTo(''); setStandard(''); }}>
        {ORDER.map(id => <option value={id} key={id}>{INDEX[id]?.code || id}</option>)}
      </select></label>}
      <label>Name <input value={name} maxLength="80" placeholder="Optional" onInput={e => setName(e.currentTarget.value)} /></label>
      <div class="deadline-fields">
        <label>From <select value={from || ids[0] || ''} onChange={e => setFrom(e.currentTarget.value)}>
          {ids.map(id => <option value={id} key={id}>{labelOf(book.idx.SUBS, id)}</option>)}
        </select></label>
        <label>Through <select value={to || ids.at(-1) || ''} onChange={e => setTo(e.currentTarget.value)}>
          {ids.map(id => <option value={id} key={id}>{labelOf(book.idx.SUBS, id)}</option>)}
        </select></label>
      </div>
      <div class="deadline-fields">
        <label>Learn by <input type="datetime-local" required value={dueAt} onInput={e => setDueAt(e.currentTarget.value)} /></label>
        <label>Intensity <select value={intensity} onChange={e => setIntensity(e.currentTarget.value)}>
          <option value="focus">Focus</option><option value="checkpoint">Checkpoint</option>
        </select></label>
      </div>
      <label>Assessment standard <select value={standard} onChange={e => setStandard(e.currentTarget.value)}>
        <option value="">Automatic for selected range</option>
        {Object.keys(book?.idx.BLUEPRINTS || {}).map(id => <option value={id} key={id}>{id}</option>)}
      </select></label>
      <div class="deadline-fields">
        <label>Minutes per day <input type="number" min="1" max="1440" placeholder="Optional" value={minutesPerDay} onInput={e => setMinutesPerDay(e.currentTarget.value)} /></label>
        <label>Session minutes <input type="number" min="1" max="1440" placeholder="Optional" value={sessionMinutes} onInput={e => setSessionMinutes(e.currentTarget.value)} /></label>
      </div>
      <p>Shared goals use one study budget. Session length splits longer actions into manageable sessions.</p>
      {error && <p role="alert" class="deadline-warning">{error}</p>}
      <div class="deadline-actions"><button class="dbtn primary" disabled={!book || !ids.length}>{editing ? 'Save changes' : 'Add goal'}</button>
        {editing && <button type="button" class="dbtn ghost" onClick={() => { setEditing(null); setError(''); }}>Cancel</button>}</div>
    </form>
  </div>;
}
