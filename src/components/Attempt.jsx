import { useState } from "preact/hooks";
import { readTryFirst, writeTryFirst } from "../lib/notes.js";
import { authored as M } from "../lib/safe-markup.js";
import Inline from "./Inline.jsx";

/* A problem before the instruction that solves it.
 *
 * The reader cannot answer it from what they have read, and no answer is
 * available here — the subsection teaches the concept next and refers back to
 * what they tried. A deliberate failure that primes the definition is not the
 * exception M10 keeps out of the opening; it is the opposite of one.
 *
 * What they wrote is learner content, so it is stored and styled as a note. */
export default function Attempt({ b, cid, anchor }) {
  const [stored] = useState(() => readTryFirst(cid, anchor));
  const [text, setText] = useState(stored.text);
  const [done, setDone] = useState(stored.submitted);

  const submit = () => { writeTryFirst(cid, anchor, text, true); setDone(true); };

  return (
    <div class="attempt" data-attempt={anchor}>
      <span class="blabel"><Inline text={b.label || "Try it first"} /></span>
      <div dangerouslySetInnerHTML={{ __html: M(b.h) }} />
      <textarea class="attempt-in" rows="3" value={text} placeholder="However far you get."
                onInput={e => { const value = e.currentTarget.value; setText(value); writeTryFirst(cid, anchor, value, done); }} />
      {done
        ? <p class="attempt-done">Compare this with what you will now learn.</p>
        : <button class="dbtn" data-attempt-go onClick={submit} disabled={!text.trim()}>Submit and read on →</button>}
    </div>
  );
}
