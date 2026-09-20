/* ============================================================================
 * tools/lib/structure.mjs — how blocks relate: lists, follow-ups and asides
 *
 * The three checks validate.mjs runs over the structure authors declare
 * inside and between blocks. They live apart from the script so
 * tests/unit/structure.test.mjs can call them on a hand-built course rather than
 * planting a probe folder under courses/.
 *
 * Each takes the loaded course `C` and pushes strings onto `errs`/`warns`.
 * ==========================================================================*/
import { tierOf } from "../../src/lib/tiers.js";
import { textOf } from "../../src/lib/util.js";
import { parentIndex } from "../../src/lib/follows.js";
import { anchorKeys } from "../../src/lib/asides.js";

/* An enumeration is written as one, not run into a sentence.
 *
 * "(1) Confirm the test. (2) Integrate M. (3) …" is a list set as a
 * paragraph: it reads as a wall, the reader cannot find step 3 again, and the
 * engine cannot open it at a closed depth because it cannot see it. It was
 * the form authors reached for because a callout had nowhere else to put
 * steps; `items:` is that place now, so the run-in form fails.
 *
 * Three consecutive markers, because two are as often equation numbers
 * ("from (1) and (2)"). Maths is blanked first, since `y^{(1)}` is notation. */
const RUN_IN = /(?:^|[\s>:])\((1|a|i)\)\s[\s\S]*?\((2|b|ii)\)\s[\s\S]*?\((3|c|iii)\)\s/;
const CALLOUTS = new Set(["def", "key", "trap", "note"]);

export function checkRunInLists(C, errs) {
  for (const s of C.sections)
    for (const u of s.subs)
      (u.blocks || []).forEach((b, i) => {
        if (!b || b.t === "code") return;
        for (const k of ["h", "core"]) {
          const v = String(Array.isArray(b[k]) ? b[k].join(" ") : b[k] || "")
            .replace(/<m>[\s\S]*?<\/m>/g, " ");
          if (RUN_IN.test(v))
            errs.push(`${u.id} block ${i + 1} (${b.t}) ${k}: an enumeration run into prose — ` +
              (CALLOUTS.has(b.t) || b.t === "list"
                ? `move the steps into items: (with ordered: true)`
                : `write it as <ol>, or as a list block`));
        }
        if (b.items != null && !CALLOUTS.has(b.t) && b.t !== "list")
          errs.push(`${u.id} block ${i + 1} (${b.t}): items: renders only on ` +
            `list, ${[...CALLOUTS].join(", ")} — on a ${b.t} it draws nothing`);
      });
}

/* Follow-ups (src/lib/follows.js) keep the lane's promise.
 *
 * A follow-up hangs off its parent, so it has to have one, and the spine may
 * never need the tiers it can collapse (§6.3): a spine block following a
 * depth block would be spine content only reachable by opening depth. The
 * same holds between the two collapsible tiers, which the lane hides
 * independently, so a follow-up of a non-spine parent shares its tier. */
export function checkFollows(C, errs) {
  for (const s of C.sections)
    for (const u of s.subs) {
      const bs = u.blocks || [];
      bs.forEach((b, i) => {
        if (!b || b.follows == null) return;
        const at = `${u.id} block ${i + 1} (${b.t})`;
        if (b.follows !== true) {
          errs.push(`${at}: follows: is true or absent, not ${JSON.stringify(b.follows)}`);
          return;
        }
        const p = parentIndex(bs, i);
        if (p < 0) { errs.push(`${at}: follows: on the first block — there is nothing above it to follow`); return; }
        if (b.t === "attempt") errs.push(`${at}: an attempt cannot follow anything`);
        const pt = tierOf(bs[p]), t = tierOf(b);
        if (pt !== "spine" && t !== pt)
          errs.push(`${at}: a ${t} block follows block ${p + 1}, which is ${pt} — ` +
            `the lane hides ${pt} on its own, so a follow-up of it must be ${pt} too`);
      });
    }
}

/* Asides (src/lib/asides.js) pair one anchor with one note, in one block.
 *
 * An anchor with no note highlights a phrase that explains nothing; a note
 * with no anchor is never drawn. Both are silent on the page, so both fail.
 * Length is a warning: an aside is shown whole in a 13rem margin, and past a
 * few sentences it is a block that wants to be a `depth` follow-up instead. */
const ASIDE_MAX = 320;

export function checkAsides(C, errs, warns) {
  const strip = v => String(v).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  for (const s of C.sections)
    for (const u of s.subs) {
      (u.blocks || []).forEach((b, i) => {
        if (!b) return;
        const at = `${u.id} block ${i + 1} (${b.t})`;
        const own = textOf({ ...b, asides: null });
        const anchors = anchorKeys(own);
        const notes = b.asides == null ? {} : b.asides;
        if (typeof notes !== "object" || Array.isArray(notes)) {
          errs.push(`${at}: asides: is a mapping of anchor key to note`); return;
        }
        const seen = new Set();
        for (const k of anchors) {
          if (seen.has(k)) errs.push(`${at}: anchor "${k}" is used twice — one anchor, one aside`);
          seen.add(k);
          if (notes[k] == null) errs.push(`${at}: <n k="${k}"> has no asides.${k}`);
        }
        for (const [k, v] of Object.entries(notes)) {
          if (!seen.has(k)) errs.push(`${at}: asides.${k} has no <n k="${k}"> anchor in the block, so it is never shown`);
          if (typeof v !== "string") { errs.push(`${at}: asides.${k} is not a string`); continue; }
          if (anchorKeys(v).length) errs.push(`${at}: asides.${k} contains an anchor — asides do not nest`);
          if (strip(v).length > ASIDE_MAX)
            warns.push(`${at}: asides.${k} runs past ${ASIDE_MAX} characters — ` +
              `consider a depth follow-up if this crowds the margin (no length limit)`);
        }
      });
      if (anchorKeys(textOf(u.quiz || [])).length)
        errs.push(`${u.id}: an aside anchor in a question — asides belong to blocks`);
    }
}
