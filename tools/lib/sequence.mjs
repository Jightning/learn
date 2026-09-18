/* ============================================================================
 * tools/lib/sequence.mjs — sentences that point at what the reader has not read
 *
 * M14: the reader has read what precedes a subsection and nothing else. Two
 * ways to break it, and the second is the one that gets written — a sentence
 * claiming a past that has not happened. "As we saw" is a factual claim about
 * the reader's history, and the author of a `depth` block or a late `why` is
 * the worst-placed person to check it: by then the whole course exists for
 * them and almost none of it does for the reader.
 *
 * Only the phrase is detectable, never what it points at, so this lists rather
 * than counts. A backward reference to a genuinely earlier subsection is
 * correct and common; what the list buys is that the author reads their own
 * "as we saw" with the subsection id beside it (create_course.md §12b).
 *
 * The patterns are phrases, not words, because the words are ordinary. A site
 * about retrieval practice says "recall" constantly and means the verb;
 * "recall from" is a prose reminder standing in for a link (M16).
 * ==========================================================================*/

/** [pattern, the phrase to print]. Backward claims first, then forward ones. */
export const POINTS = [
  [/\bas (?:we|you) (?:saw|established|showed|covered|discussed)\b/i, "as we saw"],
  /* Not "recall the <thing>": a drill that asks you to recall a threshold is
     the verb doing its job, and a list nobody trusts is a list nobody reads. */
  [/\brecall (?:that|from)\b/i, "recall that"],
  [/\bas (?:established|shown|discussed|noted|described) (?:above|earlier|previously)\b/i, "as shown above"],
  [/\b(?:we|you) (?:have )?already (?:saw|seen|know|met|covered)\b/i, "you already know"],
  [/\bby now you\b/i, "by now you"],
  [/\bearlier (?:we|you) (?:saw|met|defined|built)\b/i, "earlier we"],
  [/\bfrom (?:the )?(?:previous|last) (?:section|subsection|chapter|page)\b/i, "from the previous section"],
  [/\b(?:we|you)(?:'ll| will) (?:see|cover|meet|get to)\b/i, "we will see"],
  [/\b(?:later|further) (?:in this|on in the) (?:course|section)\b/i, "later in this course"],
  [/\bmore on (?:this|that) later\b/i, "more on this later"],
  [/\bin (?:a|the) later (?:section|subsection)\b/i, "in a later section"]
];

/** Which phrases one passage carries. Empty for prose that points nowhere. */
export const pointsIn = text =>
  POINTS.filter(([re]) => re.test(String(text || ""))).map(([, name]) => name);

/* Where prose hides in a subsection. The asides and the quiz `why` are the two
   an author reads last and so checks least, which is exactly where a late
   backward reference lands. `items` holds strings or blocks. */
function passages(u) {
  const out = [];
  const add = (where, text) => { if (text) out.push([where, String(text)]); };
  for (const b of u.blocks || []) {
    const at = b.label ? `${b.t} "${b.label}"` : b.t;
    add(at, b.h); add(at, b.core); add(at, b.gist);
    for (const it of b.items || []) add(at, typeof it === "string" ? it : it && it.h);
    for (const [k, v] of Object.entries(b.asides || {})) add(`${at} aside ${k}`, v);
  }
  for (const q of u.quiz || []) { add("quiz why", q.why); add("quiz q", q.q); }
  return out;
}

/** Every pointing phrase in a loaded course, as "<sub id> <where>: "<phrase>"". */
export function pointsAtNothing(C) {
  const out = [];
  for (const s of C.sections || [])
    for (const u of s.subs || [])
      for (const [where, text] of passages(u))
        for (const name of pointsIn(text)) out.push(`${u.id} ${where}: "${name}"`);
  return out;
}
