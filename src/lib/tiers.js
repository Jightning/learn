/* Block tiers, and the lane the reader is in.
 *
 * The spine is the whole course, stated once: definition, rule, mechanism, one
 * canonical instance. `depth` answers "why" and "what if"; `apply` instantiates
 * a concept the spine already states. The spine alone is complete — depth and
 * apply may lean on it, never the other way round — so collapsing them removes
 * repetition rather than material.
 */
import { getItem, setItem, removeItem } from "./store.js";
import { isFollow } from "./follows.js";
export const TIERS = ["spine", "depth", "apply"];

export const LANES = [
  { id: "spine", label: "Spine" },
  { id: "apply", label: "Spine + Apply" },
  { id: "all",   label: "All" }
];

const SHOWN = { spine: ["spine"], apply: ["spine", "apply"], all: TIERS };

export const tierOf = b => (TIERS.includes(b.tier) ? b.tier : "spine");

/* One line, one count per tier. The count is the signal, and it is text, so a
 * reader knows what they skipped instead of meeting an invisible hole. */
const NOUN = { depth: n => `${n} in depth`, apply: n => `${n} more application${n === 1 ? "" : "s"}` };

export function stubLabel(items) {
  const n = {};
  for (const it of items) n[tierOf(it.b)] = (n[tierOf(it.b)] || 0) + 1;
  return ["depth", "apply"].filter(t => n[t]).map(t => NOUN[t](n[t])).join(", ");
}

/* What an attached stub says: the kind of follow-up and its name, so the
 * reader sees "In depth: the mixed-partials argument" beside the block it explains
 * rather than a count at the foot of the subsection. */
const FOLLOW_NOUN = { depth: "In depth", apply: "Another example" };

export function attachedLabel(items, nameOf) {
  return items.map(it => `${FOLLOW_NOUN[tierOf(it.b)] || "More"}: ${nameOf(it.b)}`).join(" · ");
}

/** blocks, grouped into runs the lane either shows or collapses into one stub
 *
 * A collapsed run that starts with a follow-up is attached to the block above
 * it, so it ends where the follow-ups do: a hidden block that follows nothing
 * is a separate idea and gets a stub of its own. `attached` records that. */
export function runsOf(blocks, lane) {
  const shown = SHOWN[lane] || SHOWN.apply;
  const runs = [];
  blocks.forEach((b, i) => {
    const hidden = !shown.includes(tierOf(b));
    const last = runs[runs.length - 1];
    const ends = last && last.attached && !isFollow(b);
    if (last && last.hidden === hidden && !ends) last.items.push({ b, i });
    else runs.push({ hidden, attached: hidden && isFollow(b) && i > 0, items: [{ b, i }] });
  });
  return runs;
}

const KEY = cid => `lane:${cid}`;

/* Spine + Apply, not Spine, is the default: a first read without worked
   instances is the wrong trade for a novice, and the fast pass is one key away
   and persists per course. */
export function laneFor(cid) { return getItem(KEY(cid)) || "apply"; }
export function setLane(cid, lane) { setItem(KEY(cid), lane); }

/** Forget which lane a course was being read in. lib/purge.js is the caller. */
export function dropLane(cid) { removeItem(KEY(cid)); }
