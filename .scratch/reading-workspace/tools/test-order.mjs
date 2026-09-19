#!/usr/bin/env node
/* The shelf's order, which is the reader's arrangement of a set that keeps
 * changing underneath it.
 *
 *   node tools/test-order.mjs
 *
 * The browser test drives the handle and the arrow keys; what cannot be seen
 * from there is what happens to a saved order when the shelf is not the one it
 * was saved against — a course removed, a course imported, a course restored.
 * Each of those is a different answer, and all three are the same function.
 *
 * No indexedDB in node, so store.js keeps everything in its memory mirror and
 * never opens a database. That is the same read model the app uses.
 */
const fail = [];
const check = (name, cond, extra = "") => {
  if (cond) console.log(`  ok    ${name}`);
  else { console.log(`  FAIL  ${name} ${extra}`); fail.push(name); }
};

const { ordered, setOrder, move } = await import("../src/lib/order.js");

/* ------------------------------------------------------------------ move -- */
const shelf = ["a", "b", "c", "d"];

check("a course moves to the place it was dropped on",
      move(shelf, "a", 2).join("") === "bcad", move(shelf, "a", 2).join(""));
check("and backwards as well as forwards",
      move(shelf, "d", 0).join("") === "dabc", move(shelf, "d", 0).join(""));
/* The arrow keys hand this an out-of-range index at either end of the shelf
   rather than clamping first, so it has to be the no-op and not a wrap. */
check("a move off the end of the shelf changes nothing",
      move(shelf, "a", -1) === shelf && move(shelf, "d", 4) === shelf);
check("moving a course to where it already is changes nothing",
      move(shelf, "b", 1) === shelf);
check("moving a course that is not there changes nothing",
      move(shelf, "zz", 0) === shelf);
check("the original is never mutated", shelf.join("") === "abcd", shelf.join(""));

/* --------------------------------------------------------------- ordered -- */
check("with nothing saved, the shelf is the order it was given in",
      ordered(shelf).join("") === "abcd", ordered(shelf).join(""));

setOrder(["c", "a", "d", "b"]);
check("a saved order is what the shelf reads",
      ordered(shelf).join("") === "cadb", ordered(shelf).join(""));
check("and the set it is applied to may be in any order",
      ordered(["d", "c", "b", "a"]).join("") === "cadb",
      ordered(["d", "c", "b", "a"]).join(""));

/* A course arriving after an arrangement goes to the end, which is where a new
   thing goes on a shelf someone has already arranged. */
check("a newly imported course lands at the end",
      ordered([...shelf, "e"]).join("") === "cadbe", ordered([...shelf, "e"]).join(""));

/* A removed course leaves the list rather than leaving a hole — and the entry
   is kept rather than swept, so re-importing it puts the card back where it
   was. That second half is the reason nothing prunes the saved list. */
check("a removed course simply does not appear",
      ordered(["a", "b", "d"]).join("") === "adb", ordered(["a", "b", "d"]).join(""));
check("and coming back puts it where it was",
      ordered(shelf).join("") === "cadb", ordered(shelf).join(""));

/* Nothing saved yet for a course means nothing saved *about* it: the ids the
   reader has never touched keep their given order among themselves. */
setOrder(["d"]);
check("courses never moved keep their given order behind the ones that were",
      ordered(shelf).join("") === "dabc", ordered(shelf).join(""));

/* Garbage in the store is a shelf, not a crash: the reader's other device may
   be running a build that wrote something else there. */
const { setItem } = await import("../src/lib/store.js");
setItem("order:v1", "{not json");
check("an unreadable saved order falls back to the given one",
      ordered(shelf).join("") === "abcd", ordered(shelf).join(""));
setItem("order:v1", JSON.stringify(["a", 7, null, "c"]));
check("and entries that are not course ids are ignored",
      ordered(shelf).join("") === "acbd", ordered(shelf).join(""));

console.log(fail.length ? `\n${fail.length} failed` : "\nall passed");
process.exit(fail.length ? 1 : 0);
