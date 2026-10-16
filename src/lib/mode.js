/* Study, Review and Names change how much of each passage is open.
 * Optional expansions remain available in every view. Stored lane values are
 * compatibility data, not a second reading taxonomy for the learner. */

export const MODES = [
  { id: "study",  label: "Study",  lane: "apply", depth: "full",
    hint: "The full text, for a first pass" },
  { id: "review", label: "Review", lane: "apply", depth: "notes",
    hint: "Claims and structure, development closed" },
  { id: "names",  label: "Names",  lane: "apply", depth: "index",
    hint: "Names only, the lookup surface" }
];

/** Resolve by reading depth, including stored settings from earlier versions. */
export function modeOf(lane, depth) {
  const m = MODES.find(x => x.depth === depth);
  return m ? m.id : null;
}

/** Fall back to the nearest supported reading resolution. */
export function nearestMode(lane, depth) {
  return (MODES.find(m => m.depth === depth) || MODES[0]).id;
}
