#!/usr/bin/env node
/* Sentences that point at what the reader has not read (M14).
 *
 *   npm run test:unit -- sequence
 *
 * The rule is the author's to enforce — only they know which subsection an
 * "as we saw" meant. What a script can do is put the phrase in front of them,
 * and the whole value of that list is its precision: a list with innocent
 * sentences in it is a list nobody reads, and then the rule is unenforced
 * again. So both halves are tested, and the second half is the one that
 * matters — the words here are ordinary words in a course about studying.
 */
const fail = [];
const check = (name, cond, extra = "") => {
  if (cond) console.log(`  ok    ${name}`);
  else { console.log(`  FAIL  ${name} ${extra}`); fail.push(name); }
};

const { pointsIn, pointsAtNothing } = await import("../../tools/lib/sequence.mjs");

/* ------------------------------------------------- a past that may not exist */
const caught = [
  "As we saw in the last part, the carry bit is not the sign bit.",
  "Recall that a separable equation divides by g(y).",
  "As established above, the potential exists.",
  "You already know how to integrate this.",
  "By now you can read a truth table.",
  "Earlier we defined the Jacobian.",
  "The method from the previous section applies here too."
];
for (const s of caught)
  check(`caught: ${s.slice(0, 42)}…`, pointsIn(s).length > 0, JSON.stringify(pointsIn(s)));

/* ------------------------------------------------------------ and forwards --*/
const ahead = [
  "We will see why this matters when we get to eigenvalues.",
  "There is more on this later.",
  "A fuller argument waits in a later section.",
  "The rest comes later in this course."
];
for (const s of ahead)
  check(`caught: ${s.slice(0, 42)}…`, pointsIn(s).length > 0, JSON.stringify(pointsIn(s)));

/* ----------------------------------------------------------- and left alone --
 * The cost of a false positive is the whole list: an author who has learned
 * that the warnings are noise stops reading them, and M14 goes back to being
 * unchecked. These are sentences a study site writes constantly. */
const innocent = [
  "Cued recall is the format that retrieves a stated constant.",
  "Recall improves when the test is spaced rather than massed.",
  "The drill asks you to recall the threshold without the prompt.",
  "Free recall and recognition are different retrieval formats.",
  "You saw one instance of this above, and here is the general rule.",
  "The reader will recall nothing they never retrieved.",
  "Later work on this problem uses the same substitution.",
  "This is covered by the prerequisite on complex arithmetic."
];
for (const s of innocent)
  check(`left alone: ${s.slice(0, 42)}…`, pointsIn(s).length === 0, JSON.stringify(pointsIn(s)));

/* ------------------------------------------------- where prose actually sits --
 * An `h:` is the obvious place and the one an author checks. The three below
 * are the ones written last: a margin note, a quiz `why`, and a list item. */
{
  const C = { sections: [{ subs: [{
    id: "s3-2",
    blocks: [
      { t: "p", h: "<p>Nothing to see.</p>" },
      { t: "key", label: "Building it", items: ["Differentiate F in y.", "As we saw, set it equal to N."] },
      { t: "def", h: "<p>Fine.</p>", asides: { only_y: "<p>Recall that only y survives.</p>" } }
    ],
    quiz: [{ q: "<p>What is it?</p>", why: "<p>You already know the first half.</p>" }]
  }] }] };
  const found = pointsAtNothing(C);
  check("a list item is read", found.some(f => f.includes('key "Building it"')), found.join(" | "));
  check("an aside is read", found.some(f => f.includes("aside only_y")), found.join(" | "));
  check("a quiz why is read", found.some(f => f.includes("quiz why")), found.join(" | "));
  check("and each names the subsection it is in", found.every(f => f.startsWith("s3-2 ")), found.join(" | "));
  check("prose that points nowhere is not listed", found.length === 3, found.join(" | "));
}

/* A course with nothing in it must not throw: `finish` runs the audit on a
   course whose sections are still empty. */
check("an empty course is quiet", pointsAtNothing({}).length === 0);

console.log(fail.length ? `\nFAIL sequence  ${fail.length} failing` : "\nall passing");
process.exitCode = fail.length ? 1 : 0;
