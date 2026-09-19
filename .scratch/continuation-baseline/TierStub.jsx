import { stubLabel, attachedLabel } from "../lib/tiers.js";
import { nameOf } from "../lib/gist.js";
import { RefChip } from "./MarginNote.jsx";

/* What the lane collapsed, and what it holds.
 *
 * A dashed rule with a count, not a coloured band: colour never carries meaning
 * on its own, and the count is the signal. The stub sits in the row's own
 * leading gap rather than in a block of its own, so expanding it cannot move
 * the next block out of line with its margin card.
 *
 * References inside a collapsed run demote to chips on the stub line. A stub
 * is one line tall, and a margin card anchored to a one-line row is a hole by
 * construction — which is the same reason "used later in" rides a block
 * rather than a heading.
 *
 * An `attached` run is a follow-up of the block above it (lib/follows.js), so
 * it names what it holds instead of counting it: the reader deciding whether
 * to open a "why" needs to know which why. */
export default function TierStub({ items, refs, ctx, onExpand, attached }) {
  return (
    <div class="tstub">
      <button class="tstub-b" aria-expanded="false" onClick={onExpand}>
        <span class="tstub-t">{attached ? attachedLabel(items, nameOf) : stubLabel(items)}</span>
        <span class="tstub-chev" aria-hidden="true">▸</span>
      </button>
      {refs.length > 0 && (
        <span class="tstub-chips">
          {refs.map(r => <RefChip key={r.kind + r.id} r={r} ctx={ctx} />)}
        </span>
      )}
    </div>
  );
}

/* The same collapsed run, as a tab in the margin.
 *
 * Two things ask for this shape. A closed depth draws a whole run as a handful
 * of one-line rows, and a dashed rule across the measure between them is the
 * loudest thing on the page — it announces what is *not* there more firmly
 * than the rows announce what is. And a run the reader opened needs its way
 * back: the stub disappears the moment it is pressed, so closing the run again
 * meant changing the lane.
 *
 * So the tab is the control in both states and says only how much it holds.
 * The name an attached stub carries is the first read's question — "which
 * why?" — and the margin is not where a first read happens; `stubLabel`'s
 * count is what is left, and a count is what the eye can take from a margin
 * without leaving the column. */
export function DepthTab({ items, open, onToggle }) {
  return (
    <button class={"dtab" + (open ? " is-open" : "")}
            aria-expanded={open ? "true" : "false"}
            title={open ? "Hide this again" : "Show this"}
            onClick={onToggle}>
      <span class="dtab-chev" aria-hidden="true">{open ? "\u25be" : "\u25b8"}</span>
      <span class="dtab-t">{stubLabel(items)}</span>
    </button>
  );
}
