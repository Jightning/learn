/* Composition inspection reuses the reader's lane, depth and block renderer.
   Component blocks stay data: pretending to render their interactions here
   would create a second reader. Inspect their final layout in the real app. */
import { renderBlock } from "../../src/blocks/index.js";
import { present } from "../../src/lib/gist.js";
import { runsOf } from "../../src/lib/tiers.js";
import { parentIndex } from "../../src/lib/follows.js";
import { INTERACTIVE } from "../../src/blocks/interactive.js";

export function readingPreview(unit, { lane = "apply", depth = "full", numberOf = () => null } = {}) {
  if (!["spine", "apply", "all"].includes(lane)) throw new Error("preview lane needs spine, apply or all");
  if (!["full", "notes", "index"].includes(depth)) throw new Error("preview depth needs full, notes or index");
  const blocks = unit.blocks || [];
  return { title: unit.title, lane, depth, runs: runsOf(blocks, lane).map(run => ({
    hidden: run.hidden, attached: run.attached,
    items: run.items.map(({ b, i }) => {
      const display = present(b, depth);
      const component = b.t === "slides" || INTERACTIVE.includes(b.t);
      return { ...(b.authorId ? { id: b.authorId } : {}), index: i, type: b.t,
        parent: parentIndex(blocks, i), ...display,
        ...(display.mode === "full" ? component ? { component: b } : {
          html: renderBlock(b, { fignum: numberOf(b), prevSource: blocks[i - 1]?.source || null })
        } : {}), ...(b.asides ? { asides: b.asides } : {}) };
    })
  })) };
}
