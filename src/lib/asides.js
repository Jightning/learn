/* Asides: the course's own margin notes, anchored to a phrase in a block.
 *
 * A block's prose says what is true; an aside says a little more about one
 * specific part of it — why this step works, what this symbol hides — without
 * making the block longer for every reader. The author marks the phrase
 * inline and writes the note on the same block:
 *
 *   h: ... solve for <n k="indep">g'(y)</n> ...
 *   asides:
 *     indep: The x-terms cancel exactly because M_y = N_x.
 *
 * On the page the phrase is highlighted and the note is a margin card beside
 * it, paired on hover exactly as a concept mention and its card are. The
 * anchor is markup rather than a line number or a text search, so it moves
 * with the phrase when the prose is edited. validate.mjs fails an anchor with
 * no aside and an aside with no anchor.
 */
import { textOf } from "./util.js";

const ANCHOR = /<n\s+k="([^"]+)"\s*>([\s\S]*?)<\/n>/g;

/** every anchored aside in one block, in order of appearance: [{ id, phrase, body }]
 *  `phrase` is the anchored HTML as written, so maths in it still renders. */
export function asidesOf(b) {
  if (!b || !b.asides || typeof b.asides !== "object") return [];
  /* The asides' own text is not where anchors live. */
  const own = textOf({ ...b, asides: null });
  const seen = new Set(), out = [];
  for (const m of own.matchAll(ANCHOR)) {
    const id = m[1];
    if (seen.has(id) || b.asides[id] == null) continue;
    seen.add(id);
    out.push({ id, phrase: m[2], body: String(b.asides[id]) });
  }
  return out;
}

/** every anchor key written in a string, for the build's pairing check */
export const anchorKeys = s => [...String(s || "").matchAll(ANCHOR)].map(m => m[1]);

/** the anchor as page markup: a highlighted phrase paired with its card */
export const renderAnchors = html =>
  String(html).replace(ANCHOR, (_, k, text) => `<span class="nref" data-xr="n:${k}">${text}</span>`);

/** the anchor dropped, for places that show no margin to pair it with */
export const dropAnchors = html => String(html).replace(ANCHOR, (_, _k, text) => text);
