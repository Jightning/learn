/* ============================================================================
 * src/lib/order.js — the shelf's order, which belongs to the reader
 *
 * The library used to list the bundled courses in the order the site ships
 * them and the reader's own in the order they happened to be imported. Neither
 * is a statement about what the reader is working on: the course they open
 * every day sits wherever the build put it, and on a shelf of eight cards that
 * is two rows down.
 *
 * So the order is a preference, stored per device like every other thing the
 * browser holds about the reader — not part of a course, and never synced as
 * one: a course is content, and where its card sits is not.
 *
 * What is stored is a list of ids and nothing else. An id the reader has never
 * moved is not in it, an id for a course that has since been removed is
 * ignored on read rather than swept (re-importing it puts the card back where
 * it was), and a course that arrives after a reorder goes to the end — which
 * is where a new thing goes on a shelf someone has already arranged.
 * ==========================================================================*/
import { getItem, setItem } from "./store.js";

const KEY = "order:v1";

const read = () => {
  try {
    const a = JSON.parse(getItem(KEY));
    return Array.isArray(a) ? a.filter(x => typeof x === "string") : [];
  } catch { return []; }
};

/** Record an order. The caller passes the whole shelf, in the order it is in. */
export const setOrder = ids => setItem(KEY, JSON.stringify(ids));

/**
 * `ids` as the reader arranged them: everything they have placed, in their
 * order, then everything else in the order it was given in.
 */
export function ordered(ids) {
  const here = new Set(ids);
  const placed = read().filter(id => here.has(id));
  const done = new Set(placed);
  return [...placed, ...ids.filter(id => !done.has(id))];
}

/**
 * `ids` with `cid` moved to the index `to`, everything else keeping its
 * relative order. Out-of-range targets and unknown ids are no-ops, so a caller
 * may hand this the result of an arrow key at either end of the shelf.
 */
export function move(ids, cid, to) {
  const from = ids.indexOf(cid);
  if (from < 0 || to < 0 || to >= ids.length || to === from) return ids;
  const out = ids.slice();
  out.splice(from, 1);
  out.splice(to, 0, cid);
  return out;
}
