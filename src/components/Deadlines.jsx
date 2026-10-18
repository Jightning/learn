import { useEffect, useState } from 'preact/hooks';
import { ORDER, INDEX, getAll } from '../lib/library.js';
import { buildIndex, labelOf } from '../lib/index.js';
import { forCourse } from '../lib/log.js';
import { stateFor } from '../lib/state.js';
import { goals, saveGoal, deleteGoal, planAcrossCourses } from '../lib/learn-by.js';
import { flush } from '../lib/store.js';
import { questionHelpHref } from '../lib/questions.js';

const localValue = time => {
  const d = new Date(time - new Date(time).getTimezoneOffset() * 6e4);
  return d.toISOString().slice(0, 16);
};

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
          </div><strong>{detail ? `${detail.progress}%${expired ? ' at deadline' : ''}` : 'Loading…'}</strong></div>
          <p>{labelOf(b?.idx.SUBS || {}, g.from)} through {labelOf(b?.idx.SUBS || {}, g.to)}</p>
          {detail && <>
            <div class="deadline-meter" role="meter" aria-label="Supported requirements" aria-valuenow={detail.progress} aria-valuemin="0" aria-valuemax="100"><i style={`width:${detail.progress}%`} /></div>
            <div class="practice-stats">
              <div><strong>{Object.values(detail.states || {}).filter(s => s.supported).length} / {detail.types.length}</strong><span>Independent evidence supported</span></div>
              {!expired && <div><strong>{Math.round(detail.workRange.lower)}–{Math.ceil(detail.workRange.upper)} min</strong><span>Estimated remaining work</span></div>}
            </div>
            <p>{detail.standardLabel}. {detail.coverage}% of requirements sampled.</p>
            {!expired && detail.retentionNeeds > 0 && <p>{detail.retentionNeeds} supported skill{detail.retentionNeeds === 1 ? '' : 's'} need fresh retrieval before the deadline.</p>}
            {!expired && detail.availableMinutes !== null && detail.spentToday > 0 && <p>{Math.round(detail.spentToday)} minutes studied today are already counted against the shared daily budget.</p>}
            {!expired && detail.forecast === 'availability-unknown' && <p>Add daily study time to assess feasibility. The next actions remain available.</p>}
            {!expired && detail.forecast === 'fits-typical-estimate' && <p>The typical work estimate fits your daily budget; extra practice may still be needed.</p>}
            {!expired && detail.forecast === 'insufficient-time' && <p class="deadline-warning">Remaining work exceeds available study time. Unscheduled skills: {[...new Set(detail.unscheduled)].join(', ')}. Add time, move the deadline, or narrow the range. Essential outcomes should receive priority.</p>}
            {!expired && detail.delayedRetention === 'unverified' && <p>Time is too short to verify delayed retention.</p>}
            {!expired && detail.progress < 100 && detail.dueInDays < 1 && <p>Time is short. Practice will favor uncovered skills and useful repairs.</p>}
            {!detail.types.length && <p class="deadline-warning">No skills are mapped to this range. The course needs question coverage before readiness can be measured.</p>}
            {detail.error && <p class="deadline-warning">{detail.error}</p>}
            {!!detail.missing.length && <p class="deadline-warning">No practice questions for {detail.missing.join(', ')}. This goal cannot reach full coverage yet.</p>}
            {!expired && detail.progress === 100 && <p>Independent evidence supports every requirement. Review needs remain separate from this achievement.</p>}
            {!expired && detail.actions.length > 0 && <ol aria-label="Learning actions">{detail.actions.slice(0, 8).map(a => <li key={a.id}>
              {a.action === 'teach' && a.help ? <a href={questionHelpHref(g.cid, { help: a.help }, b.idx)}>Revisit {b.idx.TYPES[a.skillId]?.task || a.skillId}</a> : `${a.action[0].toUpperCase()}${a.action.slice(1)}: ${b.idx.TYPES[a.skillId]?.task || a.skillId}`}
              {', '}{Math.ceil(a.minutes)} min{', '}{a.scheduledAt === null ? 'needs more time' : new Date(a.scheduledAt).toLocaleDateString()}
              {a.conditional && ', if the diagnostic shows a gap'}
              {a.goalIds.length > 1 && ', shared with another goal'}
            </li>)}</ol>}
            {expired && <p>This goal remains recorded. Edit its date to replan from your current evidence.</p>}
          </>}
          <div class="deadline-actions"><button class="dbtn ghost" onClick={() => edit(g)}>Edit</button><button class="dbtn ghost" onClick={() => remove(g.id)}>Remove</button></div>
        </article>;
      })}
      {!shown.length && <p>No learn-by goals yet.</p>}
    </div>
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
