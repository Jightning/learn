/* The main reading is complete; only explicitly optional material collapses.
 * Old tier and lane values remain readable without filtering examples out of
 * the teaching path. New courses use optional: true, independent of block type. */
import { getItem, setItem, removeItem } from "./store.js";
import { isFollow } from "./follows.js";
export const TIERS = ["spine", "depth", "apply"];

export const isOptional = b => typeof b?.optional === "boolean" ? b.optional : b?.tier === "depth";
export const tierOf = b => isOptional(b) ? "depth" : "spine";

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
  const runs = [];
  blocks.forEach((b, i) => {
    const hidden = isOptional(b) && lane !== "all";
    const last = runs[runs.length - 1];
    const ends = last && last.attached && !isFollow(b);
    if (last && last.hidden === hidden && !ends) last.items.push({ b, i });
    else runs.push({ hidden, attached: hidden && isFollow(b) && i > 0, items: [{ b, i }] });
  });
  return runs;
}

const KEY = cid => `lane:${cid}`;

/* Retain stored "all" for readers who had expanded optional material. */
export function laneFor(cid) { return getItem(KEY(cid)) || "apply"; }
export function setLane(cid, lane) { setItem(KEY(cid), lane); }

/** Forget which lane a course was being read in. lib/purge.js is the caller. */
export function dropLane(cid) { removeItem(KEY(cid)); }
