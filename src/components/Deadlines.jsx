import { useEffect, useState } from 'preact/hooks';
import { ORDER, INDEX, getAll } from '../lib/library.js';
import { buildIndex, labelOf } from '../lib/index.js';
import { forCourse } from '../lib/log.js';
import { stateFor } from '../lib/state.js';
import { goals, saveGoal, deleteGoal, deadlinePlan } from '../lib/learn-by.js';
import { flush } from '../lib/store.js';

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
  const [editing, setEditing] = useState(null);
  useEffect(() => {
    if (ctx) { setBooks([{ cid: ctx.cid, ...ctx }]); return; }
    let live = true;
    getAll(ORDER).then(pairs => { if (live) setBooks(pairs.map(([id, C]) => ({ cid: id, C, idx: buildIndex(C), state: stateFor(id, C) }))); });
    return () => { live = false; };
  }, [only, ctx?.cid]);
  const book = books?.find(b => b.cid === (only || cid));
  const ids = Object.keys(book?.idx.SUBS || {});
  const shown = goals(only).filter(g => !books || books.some(b => b.cid === g.cid));
  const edit = g => {
    setEditing(g.id); setCid(g.cid); setFrom(g.from); setTo(g.to); setDueAt(localValue(g.dueAt));
    setIntensity(g.intensity); setName(g.name || ''); setError('');
  };
  const submit = async event => {
    event.preventDefault(); setError('');
    try {
      saveGoal({ id: editing, cid: book.cid, from: from || ids[0], to: to || ids.at(-1),
        dueAt: new Date(dueAt).getTime(), intensity, name }, book.idx);
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
        const evidence = b && forCourse(g.cid, b.C).filter(r => !expired || r.ts <= g.dueAt);
        const detail = b && deadlinePlan(b.idx, [g], evidence,
          { now: expired ? g.dueAt - 1 : Date.now() }).details[0];
        return <article class="deadline-card" key={g.id}>
          <div class="deadline-card-head"><div>
            <h2>{g.name || `${labelOf(b?.idx.SUBS || {}, g.from)} through ${labelOf(b?.idx.SUBS || {}, g.to)}`}</h2>
            <div class="deadline-meta"><span>{INDEX[g.cid]?.code || g.cid}</span><span>{g.intensity === 'focus' ? 'Focus' : 'Checkpoint'}</span><time dateTime={new Date(g.dueAt).toISOString()}>{new Date(g.dueAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</time></div>
          </div><strong>{detail ? `${detail.progress}%${expired ? ' at deadline' : ''}` : 'Loading…'}</strong></div>
          <p>{labelOf(b?.idx.SUBS || {}, g.from)} through {labelOf(b?.idx.SUBS || {}, g.to)}</p>
          {detail && <>
            <div class="deadline-meter" role="meter" aria-label="Ready coverage" aria-valuenow={detail.progress} aria-valuemin="0" aria-valuemax="100"><i style={`width:${detail.progress}%`} /></div>
            <div class="practice-stats">
              <div><strong>{Object.values(detail.states || {}).filter(s => s.ready).length} / {detail.types.length}</strong><span>Ready</span></div>
              {!expired && <div><strong>~{detail.minutes} min</strong><span>Estimated practice</span></div>}
            </div>
            {!expired && detail.retentionNeeds > 0 && <p>{detail.retentionNeeds} ready type{detail.retentionNeeds === 1 ? '' : 's'} may need retrieval again before the deadline.</p>}
            {!expired && detail.progress < 100 && detail.minutes > detail.dueInDays * 1440 && <p class="deadline-warning">The rough work estimate exceeds the time left. Full readiness cannot be verified yet.</p>}
            {!expired && detail.progress < 100 && detail.dueInDays < 1 && <p>Time is short. Practice will favor uncovered types and useful repairs.</p>}
            {!detail.types.length && <p class="deadline-warning">No question types are mapped to this range. The course needs question coverage before readiness can be measured.</p>}
            {!!detail.missing.length && <p class="deadline-warning">No practice questions for {detail.missing.join(', ')}. This goal cannot reach full coverage yet.</p>}
            {!expired && detail.progress === 100 && <p>Practice is lighter now. Retention review can return as the deadline approaches.</p>}
          </>}
          <div class="deadline-actions"><button class="dbtn ghost" onClick={() => edit(g)}>Edit</button><button class="dbtn ghost" onClick={() => remove(g.id)}>Remove</button></div>
        </article>;
      })}
      {!shown.length && <p>No learn-by goals yet.</p>}
    </div>
    <form class="deadline-form" onSubmit={submit}>
      <h2>{editing ? 'Edit learn-by goal' : 'Add a learn-by goal'}</h2>
      {!only && <label>Course <select value={cid} onChange={e => { setCid(e.currentTarget.value); setFrom(''); setTo(''); }}>
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
      {error && <p role="alert" class="deadline-warning">{error}</p>}
      <div class="deadline-actions"><button class="dbtn primary" disabled={!book || !ids.length}>{editing ? 'Save changes' : 'Add goal'}</button>
        {editing && <button type="button" class="dbtn ghost" onClick={() => { setEditing(null); setError(''); }}>Cancel</button>}</div>
    </form>
  </div>;
}
