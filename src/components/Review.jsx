import { useState, useMemo, useEffect } from "preact/hooks";
import { INDEX, ORDER, getAll } from "../lib/library.js";
import { indexDrills } from "../lib/drills.js";
import { buildQueue } from "../lib/queue.js";
import { counts } from "../lib/retention.js";
import DrillRun from "./DrillRun.jsx";
import { peek } from "../lib/place.js";

const SESSION = 20;   /* about ten minutes */

/* Review, at one of two scopes.
 *
 * The scheduler is cross-course, so for a long time this was too: one queue
 * over every installed course, on a route of its own (`#/review`) that drew
 * its own full-bleed frame with no sidebar and a Close button to get out of.
 * That made it the only page on the site that was not a page — a modal wearing
 * a URL — and once the queue became a row in the navigation like every other
 * destination, being a modal was the last thing left that said otherwise.
 *
 * So it is an ordinary view now, and it comes at two scopes rather than one,
 * because the scope should match the frame it is drawn in:
 *
 *   `#/<cid>/review`  this course only, inside that course's shell
 *   `#/review`        every course, on the library, which has no course either
 *
 * A course's sidebar drilling another course's material was the mismatch; the
 * split removes it without giving up the cross-course queue, which is still
 * what the dashboard offers. `buildQueue` and `counts` read a list of books
 * and nothing else, so a scope is a narrower list — the same trick mixed
 * practice and a category page already use.
 *
 * There is no way out of here except the ways out every other page has: the
 * rail, the breadcrumb, the back button.
 */
export default function Review({ only = null }) {
  /* Only the courses that actually owe something, narrowed to the scope. The
     index carries the drill keys and whether a concept is due is local state,
     so the set is decided before a single course is fetched — the queue never
     pulls a library. */
  const wanted = useMemo(() => ORDER.filter(cid => {
    if (only && cid !== only) return false;
    const keys = (INDEX[cid] || {}).drillKeys || [];
    return keys.length && counts(cid, keys).due > 0;
  }), [only]);

  const [books, setBooks] = useState(null);
  const [queue, setQueue] = useState([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let live = true;
    setBooks(null); setQueue([]); setI(0);
    getAll(wanted).then(pairs => {
      if (!live) return;
      const bs = pairs
        .map(([cid, C]) => ({ cid, C, drills: indexDrills(C) }))
        .filter(b => b.drills.has);
      setBooks(bs);
      setQueue(buildQueue(bs, { limit: SESSION }));
    });
    return () => { live = false; };
  }, [wanted]);

  const again = () => { setQueue(buildQueue(books || [], { limit: SESSION })); setI(0); };
  const scope = only ? (INDEX[only] || {}).code || only : "all courses";

  if (books === null && wanted.length) {
    return (
      <div class="review">
        <ReviewBar i={0} n={0} scope={scope} />
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!queue.length || i >= queue.length) {
    /* Somewhere to go from here.
     *
     * An empty queue is the moment a reader decides whether to come back, and
     * "Nothing due." with a paragraph explaining the mechanism is the worst
     * answer the site can give: it is a dead end that reads as a scolding for
     * being early. Nothing due is a *good* state and it is also the only state
     * in which reading ahead is unambiguously the right thing to do.
     *
     * At course scope the course to offer is obvious. Globally it is the one
     * the reader was last in, from the stored place, falling back to the first
     * on the shelf. A link rather than a computed recommendation, because the
     * Desk is where that judgement lives — this only has to not be a wall. */
    const p = only ? null : peek();
    const lastCid = p && (p.hash.match(/^#\/([^/]+)/) || [])[1];
    const backTo = only || (lastCid && INDEX[lastCid] ? lastCid : null) || ORDER[0] || null;
    const backC = backTo ? INDEX[backTo] : null;

    return (
      <div class="review">
        <ReviewBar i={queue.length} n={queue.length} scope={scope} />
        <h1>{queue.length ? "Session complete." : "Nothing is due."}</h1>
        <p class="lede">
          {queue.length
            ? "Come back tomorrow, a concept recalled once in each of three spaced sessions outlasts one recalled three times today."
            : only
              ? "You are ahead of this course's schedule. Concepts arrive here when an interval comes due, or when you miss a question you were confident about."
              : "You are ahead of the schedule. Concepts arrive here when an interval comes due, or when you miss a question you were confident about."}
        </p>
        <div class="review-nav">
          {queue.length > 0 && (
            <button class="dbtn" id="rv-again" onClick={again}>Another set</button>
          )}
          {backC && (
            <a class="dbtn" href={`#/${backTo}`}>
              {queue.length ? "Back to" : "Read ahead in"} {backC.code || backC.title} →
            </a>
          )}
        </div>
      </div>
    );
  }

  const row = queue[i];
  return (
    <div class="review">
      <ReviewBar i={i} n={queue.length} scope={scope} />
      <DrillRun row={row} at={i} onNext={() => setI(i + 1)} />
    </div>
  );
}

/* Progress is dots and a count. Dots alone are shape and colour carrying
   meaning with no words, which is what T26 forbids. The scope is named because
   the same bar now serves one course and all of them, and a count of twelve
   means a different thing in each. */
function ReviewBar({ i, n, scope }) {
  return (
    <div class="review-bar">
      <span class="review-t">Review</span>
      <span class="review-scope">{scope}</span>
      <span class="review-dots" aria-hidden="true">
        {Array.from({ length: Math.min(n, 12) }, (_, k) =>
          <i key={k} class={k < i ? "on" : ""} />)}
      </span>
      <span class="review-n">{Math.min(i + 1, n)} of {n}</span>
    </div>
  );
}
