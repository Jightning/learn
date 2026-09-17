/* ============================================================================
 * tools/lib/coverage.mjs — how much of a source page a subsection says
 *
 * A heading checker would be wrong in both directions: a course may rename a
 * heading, merge two, or split one. So this scores words instead.
 *
 * Every source topic (the text under one textbook heading) is a bag of
 * content words. A word's weight is how rare it is across the course's topics
 * (inverse document frequency) times how many of the topic's paragraphs use
 * it. "equation" is everywhere and weighs nothing; "reducible" is in one topic,
 * in most of its paragraphs, and weighs a lot. A topic's coverage is the weight
 * of its ten heaviest words the subsection uses, over the weight of all ten,
 * so a topic the course never touches scores near 0 however short it is.
 *
 * The score is a pointer, not a gate. It cannot see a paraphrase, and a
 * topic can be deliberately skipped or moved. The low topics it prints, and
 * the words they miss, are where a human (or a model) should look.
 *
 *   terms(text)            -> Set of stemmed content words
 *   bag(heading, body)     -> Map term -> paragraphs using it
 *   idf(bags)              -> Map term -> rarity weight
 *   score(bag, have, w)    -> { score 0..1, weight, missing: [term] }
 * ==========================================================================*/

import { describesFigure } from "./sources.mjs";

/* Function words and textbook scaffolding. Anything this common in a math
   book says nothing about which topic a paragraph is on. */
const STOP = new Set(`a about above after again against all also an and any are as at be
because been before being below between both but by can could did do does doing down
during each few for from further had has have having here how however if in into is it
its itself just let may more most much must no nor not now of off on once only or other
our out over own same shall should since so some such than that the their them then there
these they this those through thus to too under until up upon very was we were what when
where which while who whom why will with would you your example solution figure problem
problems section equation equations eq see find given use using used get show shown note
recall one two three called form following obtain obtained follows
write written thereby hence therefore consider case cases now since readily`.split(/\s+/));

/* A light stemmer, the same on both sides, so "substitutions" meets
   "substitution". It does not need to be linguistically right, only consistent. */
const stem = w => w.endsWith("ss") ? w : w
  .replace(/ies$/, "y")
  .replace(/(ing|ed|es|s|ly)$/, "")
  .replace(/(.)\1$/, "$1");

/** Stemmed content words of `text`, with markup and math removed. */
export function terms(text) {
  const plain = String(text)
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$\n]*\$/g, " ")
    .replace(/<m>[\s\S]*?<\/m>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    /* The extractor glues headings to the next sentence: "EquationsA second". */
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  const out = new Set();
  for (const w of plain.toLowerCase().split(/[^a-z]+/)) {
    if (w.length < 3 || STOP.has(w)) continue;
    const s = stem(w);
    if (s.length >= 3 && !STOP.has(s)) out.add(s);
  }
  return out;
}

/* A paragraph with fewer content words than this is a display equation the
   extractor left as text ("x(t)=c1x1(t)+⋯+cnxn(t)"), whose letter runs are
   not words. */
const MIN_TERMS = 3;

/* The heading names the topic, so its words count as if this many
   paragraphs used them. Without it "Reducible Second-Order Equations" loses
   "reducible", the one word that says what the topic is. */
const HEADING = 3;

/* Only a topic's heaviest terms are scored. The long tail is one-off colour
   ("journey", "blown") that no summary repeats and no reader needs, and
   counting it makes every topic score alike. */
const TOP = 10;

/**
 * A topic as a bag of words: each term counted once per paragraph it
 * appears in. That count is the "distribution" half of the score: a term the
 * source returns to in four paragraphs is what the topic is about; a term
 * that appears once ("journey", "blown") is colour.
 */
export function bag(heading, body) {
  const tf = new Map();
  const add = (ts, n) => { for (const t of ts) tf.set(t, (tf.get(t) || 0) + n); };
  add(terms(heading), HEADING);
  for (const para of body.split(/\n\s*\n/)) {
    const text = para.trim();
    if (/^\[figure/.test(text) || describesFigure(text)) continue;
    const ts = terms(text);
    if (ts.size >= MIN_TERMS) add(ts, 1);
  }
  return tf;
}

/** Rarity of every term across a set of bags (inverse document frequency). */
export function idf(bags) {
  const df = new Map();
  for (const b of bags) for (const t of b.keys()) df.set(t, (df.get(t) || 0) + 1);
  const w = new Map();
  for (const [t, d] of df) w.set(t, Math.log((bags.length + 1) / (d + 1)));
  return w;
}

const weightIn = (tf, w) => {
  const out = new Map();
  for (const [t, n] of tf) out.set(t, (w.get(t) || 0) * (1 + Math.log(n)));
  return out;
};

/**
 * How much of a topic `have` says: the weight of the topic's heaviest terms
 * that `have` contains, over the weight of all of them. 1 when the topic has
 * no weighted terms (nothing to miss). `missing` is what the gap is about,
 * heaviest first.
 */
export function score(tf, have, w) {
  const top = [...weightIn(tf, w)].sort((a, b) => b[1] - a[1]).slice(0, TOP);
  let hit = 0, all = 0;
  for (const [t, x] of top) { all += x; if (have.has(t)) hit += x; }
  const missing = top.filter(([t]) => !have.has(t)).map(([t]) => t);
  return { score: all ? hit / all : 1, weight: all, missing };
}

/** Every string anywhere inside a parsed YAML value, joined. */
export function textOf(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join("\n");
  if (value && typeof value === "object") return Object.values(value).map(textOf).join("\n");
  return "";
}
