#!/usr/bin/env node
/* The settings that follow the reader between devices.
 *
 *   npm run test:unit -- preferences
 *
 * The colour a course wears, the order of the shelf, and which bundled courses
 * are dismissed are the only three things about a device that belong to the
 * account instead. Two devices can set the same one, so the merge needs a rule
 * and the rule needs a test: the later stamp wins, per key, and a key nobody
 * touched is a key nobody overwrites.
 *
 * No indexedDB in node, so store.js keeps everything in its memory mirror —
 * the same read model the app uses. See tests/unit/course-order.test.mjs.
 */
const fail = [];
const check = (name, cond, extra = "") => {
  if (cond) console.log(`  ok    ${name}`);
  else { console.log(`  FAIL  ${name} ${extra}`); fail.push(name); }
};

const { getItem, setItem } = await import("../../src/lib/store.js");
const { setPref, dropPref, mine, apply, isPref } = await import("../../src/lib/prefs.js");

const of = k => mine().find(p => p.k === k);

/* ------------------------------------------------------------ what travels --*/
check("a course colour is a synced setting", isPref("hue:ma26600"));
check("so are the shelf's order and its dismissals",
      isPref("order:v1") && isPref("hidden:v1"));
/* Everything else about a device stays on it: where the reader was, how deep
   they read, which lane they are in, and above all the secret itself. */
check("a reading position is not", !isPref("study:ma26600"));
check("nor the secret", !isPref("cloud:secret"));

let refused = false;
try { setPref("cloud:secret", "x"); } catch { refused = true; }
check("and writing one through this door is refused rather than quietly allowed",
      refused && getItem("cloud:secret") == null);

/* ------------------------------------------------------------- stamping ----*/
{
  const before = Date.now();
  setPref("hue:alpha", "90");
  const p = of("hue:alpha");
  check("a setting is offered with its value", p && p.v === "90", JSON.stringify(p));
  check("and stamped when it was made", p.ts >= before && p.ts <= Date.now(), String(p && p.ts));
}

/* Clearing is a write. A device that never heard about it would otherwise hand
   the old colour straight back on its next backup. */
{
  dropPref("hue:alpha");
  const p = of("hue:alpha");
  check("clearing one leaves a tombstone rather than an absence",
        p && p.v == null && p.ts > 0, JSON.stringify(p));
  check("and the value is gone from the device", getItem("hue:alpha") == null);
}

/* A setting made before this shipped has a real value and no stamp. It has to
   beat "no opinion" or it would never travel, and lose to any dated change. */
{
  setItem("hue:legacy", "45");
  check("an unstamped setting still travels", (of("hue:legacy") || {}).ts === 1,
        String((of("hue:legacy") || {}).ts));
}

/* ---------------------------------------------------------------- merging --*/
{
  setPref("hue:beta", "180");
  const ours = of("hue:beta").ts;

  check("an older stamp from the account is ignored",
        apply([{ k: "hue:beta", ts: ours - 1000, v: "0" }]) === 0 &&
        getItem("hue:beta") === "180", getItem("hue:beta"));

  check("a newer one is taken",
        apply([{ k: "hue:beta", ts: ours + 1000, v: "270" }]) === 1 &&
        getItem("hue:beta") === "270", getItem("hue:beta"));

  check("and taking it moves the stamp, so it is not taken twice",
        apply([{ k: "hue:beta", ts: ours + 1000, v: "270" }]) === 0);

  check("a cleared setting arrives as a clearing",
        apply([{ k: "hue:beta", ts: ours + 2000, v: null }]) === 1 &&
        getItem("hue:beta") == null, getItem("hue:beta"));

  check("a key this device has never heard of is taken",
        apply([{ k: "hue:gamma", ts: 5, v: "135" }]) === 1 && getItem("hue:gamma") === "135");

  /* The listing comes off the wire, so it is data rather than instruction: a
     key outside the three is not a setting this account gets to write. */
  check("a key that is not a setting is refused",
        apply([{ k: "cloud:secret", ts: Date.now() + 1e6, v: "stolen" }]) === 0 &&
        getItem("cloud:secret") == null);
}

/* The whole point, stated once: two devices, and the shelf is the same shelf.
   A key one of them never touched is not one it can undo. */
{
  setPref("order:v1", JSON.stringify(["a", "b"]));
  const laptop = of("order:v1").ts;
  apply([{ k: "hidden:v1", ts: 1, v: JSON.stringify(["demo"]) }]);
  check("a device carrying an old opinion of one key does not overwrite another",
        getItem("order:v1") === JSON.stringify(["a", "b"]) &&
        getItem("hidden:v1") === JSON.stringify(["demo"]), getItem("order:v1"));
  check("and its own key keeps its stamp", of("order:v1").ts === laptop);
}

console.log(fail.length ? `\nFAIL prefs  ${fail.length} failing` : "\nall passing");
process.exitCode = fail.length ? 1 : 0;
