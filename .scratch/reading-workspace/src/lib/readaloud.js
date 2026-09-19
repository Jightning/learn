/* ============================================================================
 * src/lib/readaloud.js — the reading column, as cues
 *
 * This reads the *rendered page*, not the course data, and that is the whole
 * design. A block's data says what could be shown; the DOM says what is shown.
 * Reading the DOM means the lane, the depth, a tier the reader expanded and a
 * block they opened are all honoured for free, no renderer needs a speech
 * branch, and a course type added later is spoken the day it renders. "It
 * reads what is on the screen" is also the only rule a listener can predict.
 *
 * What it will not say
 * --------------------
 * Only text a reader can already see. Nothing here invents a description, so
 * nothing can drift from the material or say something the page does not.
 *
 *   figures, tables   the caption, which is on the page and is written to be
 *                     read ("Figure 4.1, graph, circle layout: a concept's
 *                     retention state"). The SVG and the cells are skipped:
 *                     they do not linearise, and narrating them would mean
 *                     authoring alt text nobody sees.
 *   maths             skipped entirely. A KaTeX fragment flattens to its
 *                     glyphs — "∫0∞e−stdt" — which is not a sentence in any
 *                     language, and the honest alternative is a spoken form
 *                     the author would have to write and the reader would
 *                     never see. The prose around a formula still reads.
 *   code              skipped. Punctuation-dense and read aloud as noise.
 *   citations         `.bsrc` is a file path and a rule number, and an image's
 *                     `.credit` is provenance rather than content.
 *   margin cards      references duplicate the link they sit beside, and a
 *                     reader's own notes are not the material.
 *   quizzes           a setting; see `QUIZ`.
 *
 * Cue granularity is one element, because that is the unit the reader sees as
 * a thing: a paragraph, a heading, a caption, a list item. It is what gets
 * marked on the page while it is spoken and what skip moves by.
 * ==========================================================================*/

/** The page's readable pieces, in document order. */
const CUE = [
  ".sec-head .eyebrow",
  ".sec-head h2",
  ".sec-head .sec-blurb",
  ".sub h3",
  ".sub .bmain dt",
  ".sub .bmain p",
  ".sub .bmain li",
  /* Three block kinds carry a caption and each renders it as a different
     element: a declarative figure as `.fcap`, a table as `<caption>`, an image
     as `<figcaption>`. Knowing only the first meant a table's caption — the one
     part of a table that linearises at all — was silent. */
  ".sub .bmain .fcap",
  ".sub .bmain caption",
  ".sub .bmain figcaption"
].join(",");

/** Never spoken, wherever it appears. */
const MUTE = ".bside,.bsrc,.credit,.tstub,.katex,.katex-mathml,svg,pre,code,table,.sep,.gmore,.qmark";

/** A cue inside one of these is not prose. */
const OUTSIDE = ".bside,.quiz,.tstub,.mnote,.figure > :not(.fcap)";

export const QUIZ = { SKIP: "skip", ASK: "ask" };

/**
 * Text of one element, as a listener should hear it.
 *
 * Cloned and pruned rather than read with `textContent`, which would drag in
 * the citation and the flattened formula, and rather than `innerText`, which
 * cannot be taken from a detached node.
 *
 * A space goes on *both* sides of every element, because an element fuses with
 * whatever abuts it on either side and only one of the two is ever obvious.
 * Padding the front alone was enough for `<b>Figure 4.1</b><i></i>caption`,
 * where the empty `<i>` happened to carry the space — and silently wrong for
 * `<span class="sid">1.3</span>Review and drills`, which has nothing between
 * the number and the title and so read as "1.3Review and drills". Runs of
 * whitespace collapse on the way out, so padding both sides costs nothing.
 */
export function readable(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll(MUTE).forEach(n => n.remove());
  c.querySelectorAll("*").forEach(n => {
    if (!n.parentNode) return;
    n.parentNode.insertBefore(document.createTextNode(" "), n);
    n.parentNode.insertBefore(document.createTextNode(" "), n.nextSibling);
  });
  return (c.textContent || "").replace(/\s+/g, " ").trim();
}
/* Kept as the local name the rest of this file reads better with. */
const say = readable;

/* A closed depth leaves the block in the document and hides its prose, so
   "is it displayed" is the question, not "is it in the DOM". offsetParent is
   null for a hidden element and is the check every browser here has;
   checkVisibility is better where it exists and newer than our floor. */
const shown = el => (el.checkVisibility ? el.checkVisibility() : el.offsetParent !== null);

/**
 * The cue the reader is looking at.
 *
 * Reading from the top is right when the page has just been opened and wrong
 * every other time: a reader who has scrolled to §1.4 and pressed Listen meant
 * §1.4. "Looking at" is the first cue not yet scrolled past, measured against
 * the bottom of the sticky toolbar rather than the top of the window, because
 * everything under the toolbar is behind it and cannot be what they meant.
 *
 * Not the first *fully* visible cue: a reader half way down a paragraph is
 * still reading that paragraph, and starting at the next one would skip the
 * half they had not got to.
 */
export function startAt(cues) {
  const bar = document.querySelector(".topbar");
  const top = bar ? bar.getBoundingClientRect().bottom : 0;
  const at = cues.findIndex(c => c.el && c.el.getBoundingClientRect().bottom > top + 1);
  return at < 0 ? 0 : at;
}

/**
 * Build the cue list for a rendered page.
 *
 * @param root   the element holding the reading column
 * @param quiz   QUIZ.SKIP or QUIZ.ASK
 * @returns [{ id, text, el, hold }]
 */
export function cuesFrom(root, quiz = QUIZ.SKIP) {
  if (!root) return [];
  const out = [];
  let n = 0;
  const push = (el, text, hold) => {
    if (!text) return;
    out.push({ id: "c" + n++, text, el, hold: !!hold });
  };

  /* One pass in document order over everything speakable, prose and questions
     together, so a question is spoken where it sits rather than collected to
     the end. `matches(OUTSIDE)` cannot answer "is an ancestor one of these",
     hence closest(). */
  const wanted = quiz === QUIZ.ASK ? CUE + ",.quiz .qtext" : CUE;
  for (const el of root.querySelectorAll(wanted)) {
    if (!shown(el)) continue;

    if (el.matches(".qtext")) {
      /* The question, then silence. The answer is never spoken: hearing it
         before you have produced it costs exactly what reading it costs, and
         the quiz exists for the gap between the two. `hold` is the engine's
         primitive for stopping at a cue, and it is the same one a spoken
         conversation would wait for a reply on. */
      push(el, "Question. " + say(el), true);
      continue;
    }
    if (el.closest(OUTSIDE)) continue;
    push(el, say(el), false);
  }
  return out;
}
