#!/usr/bin/env node
/* The speech session, driven against a fake engine.
 *
 * The Web Speech API cannot be exercised in CI — there is no audio device and
 * no platform voice — so `createSpeech` takes its synth by injection and this
 * drives the state machine directly. That is not a workaround: every behaviour
 * worth having here exists *because* a real platform misbehaves, and a
 * workaround nothing exercises is a workaround that rots. What is asserted
 * below is, in order: that a chunk can never be long enough to trip Safari's
 * truncation or Chrome's fifteen-second cutoff; that pause is a position
 * rather than `pause()`, which is the only form that works on iOS; that a
 * cancelled utterance delivering its callback late cannot advance the queue;
 * and that the two seams a conversation needs — appending to a live queue, and
 * holding at a cue until the reader answers — behave.
 */
import { chunk, flatten, createSpeech, RATES, rankVoices, bestVoice, score }
  from "../src/lib/speech.js";

let pass = 0, fail = 0;
const ck = (n, ok, x = "") => {
  if (ok) { pass++; console.log(`  ok    ${n}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? "  " + x : ""}`); }
};

/* --------------------------------------------------------------- chunking */
{
  const one = "A course is a subject you want to hold.";
  ck("a short cue is one chunk", chunk(one).length === 1);
  ck("and is unchanged", chunk(one)[0] === one);

  const many = Array.from({ length: 40 },
    (_, i) => `Sentence number ${i} says a thing about the material.`).join(" ");
  const cs = chunk(many);
  ck("a long cue is split", cs.length > 1, `${cs.length} chunks`);
  ck("no chunk can reach the platform's cutoff", cs.every(c => c.length <= 120),
     "longest " + Math.max(...cs.map(c => c.length)));
  ck("nothing is lost in the split",
     cs.join(" ").replace(/\s+/g, " ") === many.replace(/\s+/g, " "));
  /* A sentence break is the only split a listener does not hear as a fault. */
  ck("splits land on sentence ends",
     cs.slice(0, -1).every(c => /[.!?…]$/.test(c)), cs[0]);

  /* One sentence longer than the cap has to break somewhere; a clause is the
     next best seam and a word is the last resort. */
  const clause = "This is one very long sentence, and it carries a second clause, "
    + "and then a third clause that pushes it well past the cap on its own.";
  const cc = chunk(clause);
  ck("an over-long sentence breaks at a clause", cc.length > 1 && cc[0].endsWith(","), cc[0]);
  ck("and still fits", cc.every(c => c.length <= 120));

  /* A URL or an identifier has no seam at all and must still be cut, or the
     platform truncates it silently. */
  const run = "x".repeat(400);
  ck("an unbroken run is cut rather than truncated by the platform",
     chunk(run).every(c => c.length <= 120) && chunk(run).join("").length === 400);

  ck("empty text produces no chunks", chunk("   ").length === 0);
  ck("every offered rate keeps a chunk under the cutoff",
     RATES.every(r => r >= 0.75), RATES.join(", "));
}

/* ---------------------------------------------------------------- flatten */
{
  const flat = flatten([{ id: "a", text: "One. Two." }, { id: "b", text: "" }], 40);
  ck("a cue with no speakable text still holds a place",
     flat.some(f => f.cue === 1), JSON.stringify(flat));
  ck("chunks know which cue they came from",
     flat.filter(f => f.cue === 0).length >= 1);
  ck("the last chunk of a cue is marked",
     flat.filter(f => f.cue === 0).slice(-1)[0].last === true);
}

/* ------------------------------------------------------- the state machine */

/** A platform that speaks instantly and can be told to misbehave. */
function fake() {
  const f = {
    spoken: [], live: null, cancels: 0,
    getVoices: () => [],
    speak(u) { f.spoken.push(u.text); f.live = u; },
    cancel() { f.cancels++; f.live = null; },
    /* Deliver the end the real engine would deliver when it finishes. */
    finish() { const u = f.live; f.live = null; if (u && u.onend) u.onend(); }
  };
  return f;
}
const Utt = class { constructor(text) { this.text = text; } };
/* Synchronous deferral: the engine only needs a turn of the loop between
   cancel and speak, and a test does not need to wait for one. */
const now = f => f();
const make = (opts = {}) => {
  const synth = fake();
  return { synth, s: createSpeech({ synth, Utterance: Utt, defer: now, max: 40, ...opts }) };
};
/** Speak the whole queue through. */
const drain = (synth, n = 50) => { while (synth.live && n--) synth.finish(); };

{
  const { synth, s } = make();
  s.enqueue([{ id: "a", text: "First cue." }, { id: "b", text: "Second cue." }]);
  ck("nothing is spoken before play", synth.spoken.length === 0);
  s.play();
  ck("play speaks the first chunk", synth.spoken.length === 1, synth.spoken.join(" | "));
  drain(synth);
  ck("the queue runs to the end", s.state().status === "ended", s.state().status);
  ck("every cue was spoken", synth.spoken.length === 2, synth.spoken.join(" | "));
}

{
  /* Pause is a remembered position, not synth.pause(): on iOS pause is ignored
     and resume never restarts, so the only form that works everywhere is
     cancel plus somewhere to come back to. */
  const { synth, s } = make();
  s.enqueue([{ id: "a", text: "One. Two. Three. Four. Five. Six. Seven. Eight." }]);
  s.play();
  const before = s.state().chunk;
  s.pause();
  ck("pause cancels rather than calling pause()", synth.cancels > 0);
  ck("pause is a state the UI can show", s.state().status === "paused");
  ck("and it holds the position", s.state().chunk === before, `${s.state().chunk} vs ${before}`);
  const spokenBefore = synth.spoken.length;
  s.play();
  ck("resume speaks again from there", synth.spoken.length === spokenBefore + 1);
  drain(synth);
  ck("and still finishes", s.state().status === "ended");
}

{
  /* The real engine delivers `end` for an utterance it already cancelled. If
     that were acted on, one pause would skip a chunk. */
  const { synth, s } = make();
  s.enqueue([{ id: "a", text: "One. Two. Three. Four." }]);
  s.play();
  const stale = synth.live;
  const at = s.state().chunk;
  s.pause();
  stale.onend();                       /* the cancelled utterance, arriving late */
  ck("a cancelled utterance cannot advance the queue", s.state().chunk === at,
     `${s.state().chunk} vs ${at}`);
  ck("and cannot restart playback", s.state().status === "paused");
}

{
  /* The conversation seam, half one: a queue can grow while it is being read. */
  const { synth, s } = make();
  s.enqueue([{ id: "a", text: "First." }]);
  s.play();
  drain(synth);
  ck("a queue that runs out ends", s.state().status === "ended");
  s.enqueue([{ id: "b", text: "A reply that arrived later." }]);
  ck("a cue arriving after the end restarts playback", s.state().status === "speaking",
     s.state().status);
  ck("and is spoken", synth.spoken.length === 2, synth.spoken.join(" | "));
  drain(synth);
  ck("appending mid-session keeps the earlier cues", s.state().cues === 2);
}

{
  /* The conversation seam, half two: a cue can stop the session when it ends,
     which is what asking a question and waiting for a reply needs. */
  const { synth, s } = make();
  s.enqueue([
    { id: "q", text: "Question. Is your progress there?", hold: true },
    { id: "n", text: "The next paragraph." }
  ]);
  s.play();
  drain(synth);
  ck("a held cue stops the session", s.state().status === "paused", s.state().status);
  ck("and the cue after it is not spoken",
     !synth.spoken.some(t => t.includes("next paragraph")), synth.spoken.join(" | "));
  s.play();
  drain(synth);
  ck("play carries on past the hold",
     synth.spoken.some(t => t.includes("next paragraph")), synth.spoken.join(" | "));
}

{
  /* Skip moves by cue, not by chunk: a chunk is a platform workaround and a
     reader should never be made to count them. */
  const { synth, s } = make();
  s.enqueue([
    { id: "a", text: "One. Two. Three. Four. Five. Six." },
    { id: "b", text: "Second cue entirely." }
  ]);
  s.play();
  s.skip(1);
  ck("skip lands on the next cue", s.state().cue === 1, String(s.state().cue));
  ck("and keeps playing", s.state().status === "speaking");
  s.skip(-1);
  ck("skipping back lands on the cue start", s.state().cue === 0 && s.state().chunk === 0,
     `${s.state().cue}/${s.state().chunk}`);
}

{
  /* Rate is read when an utterance starts, so a change has to re-speak or the
     reader hears nothing happen until the next chunk. */
  const { synth, s } = make();
  s.enqueue([{ id: "a", text: "One. Two. Three. Four." }]);
  s.play();
  const before = synth.spoken.length;
  s.setRate(1.5);
  ck("changing speed takes effect at once", synth.spoken.length === before + 1);
  ck("and is reported", s.state().rate === 1.5);
  s.stop();
  ck("stop rewinds to the start", s.state().chunk === 0 && s.state().status === "idle");
}

{
  /* Reported: played it, closed it, and a moment later it spoke anyway.
   *
   * Every resumption is deferred by a turn, because Safari drops an utterance
   * queued in the same task as the cancel before it. A deferred call outlives
   * whatever asked for it, so stopping inside that window left a step already
   * booked, and it spoke into a session that no longer existed. */
  const synth = fake();
  const queued = [];
  const later = f => queued.push(f);
  const flushDefer = () => queued.splice(0).forEach(f => f());
  const s = createSpeech({ synth, Utterance: Utt, defer: later, max: 40 });

  s.enqueue([{ id: "a", text: "One. Two. Three." }]);
  s.play();
  ck("a resumption is booked rather than spoken in the same task",
     synth.spoken.length === 0);
  s.clear();                                   /* the reader presses stop */
  flushDefer();
  ck("a step booked before stop does not speak after it",
     synth.spoken.length === 0, synth.spoken.join(" | "));
  ck("and the session stays stopped", s.state().status === "idle", s.state().status);

  /* The same window, but starting a second session rather than stopping: the
     first booking must not speak into the second queue. */
  const synth2 = fake();
  const q2 = [];
  const s2 = createSpeech({ synth: synth2, Utterance: Utt, defer: f => q2.push(f), max: 40 });
  s2.enqueue([{ id: "a", text: "First session." }]);
  s2.play();
  s2.clear();
  s2.enqueue([{ id: "b", text: "Second session." }]);
  s2.play();
  q2.splice(0).forEach(f => f());
  ck("restarting speaks the new session once, not both",
     synth2.spoken.length === 1 && synth2.spoken[0].includes("Second"),
     synth2.spoken.join(" | "));
}

{
  /* `cancel()` only stops what has already begun. An utterance handed over but
     not yet started is not always in the queue it clears, so it starts after
     the cancel — the second cancel, a turn later, catches it. */
  const synth = fake();
  const queued = [];
  const s = createSpeech({ synth, Utterance: Utt, defer: f => queued.push(f), max: 40 });
  s.enqueue([{ id: "a", text: "One." }]);
  s.play();
  /* Let play's own deferred work settle first: it cancels before it speaks, so
     measuring across it would count that pair too. */
  queued.splice(0).forEach(f => f());
  const before = synth.cancels;
  s.pause();
  ck("stopping cancels at once", synth.cancels === before + 1);
  queued.splice(0).forEach(f => f());
  ck("and again a turn later, for what had not started yet",
     synth.cancels === before + 2, String(synth.cancels - before));
}

{
  /* The platform's default voice is not a quality bar. macOS lists two dozen
     novelty voices beside the useful ones and code that reads only a name
     cannot tell them apart, so a page could be read by Zarvox. */
  const V = (name, extra = {}) => ({ name, voiceURI: name, lang: "en-US", ...extra });
  const list = [
    V("Zarvox"), V("Bubbles"), V("Bad News"),
    V("Albert", { default: true }),
    V("Samantha"),
    V("Ava (Enhanced)"),
    V("Fred")
  ];
  ck("a novelty voice is never chosen", score(V("Zarvox")) < 0);
  ck("even when the platform calls it the default",
     bestVoice(list, "en-US").name !== "Albert", bestVoice(list, "en-US").name);
  ck("an enhanced voice outranks a plain good one",
     bestVoice(list, "en-US").name === "Ava (Enhanced)", bestVoice(list, "en-US").name);
  const ranked = rankVoices(list, "en-US");
  ck("the menu is ordered by the same judgement",
     ranked[0].name === "Ava (Enhanced)" && ranked[1].name === "Samantha",
     ranked.map(v => v.name).join(", "));
  ck("another language is not offered",
     rankVoices([...list, V("Amelie", { lang: "fr-FR" })], "en-US")
       .every(v => v.lang.startsWith("en")));
  ck("no voices at all is not a crash", bestVoice([], "en") === null);

  /* An unset preference resolves to the best one rather than to whatever the
     platform hands back first. */
  const synth = fake();
  synth.getVoices = () => list;
  const s = createSpeech({ synth, Utterance: Utt, defer: now, max: 40, lang: "en-US" });
  s.enqueue([{ id: "a", text: "Hello." }]);
  s.play();
  ck("an unset preference speaks in the best voice available",
     synth.live && synth.live.voice && synth.live.voice.name === "Ava (Enhanced)",
     synth.live && synth.live.voice && synth.live.voice.name);
}

{
  /* A browser with no speech engine is a supported configuration, not an error
     path: the UI simply never offers the control. Nothing here may throw. */
  const off = createSpeech({ synth: null, Utterance: null, defer: now });
  ck("no platform engine is a state, not a crash", off.supported === false);
  off.enqueue([{ id: "a", text: "hello" }]);
  off.play(); off.pause(); off.skip(1); off.setRate(2); off.stop(); off.clear();
  ck("and every control is inert rather than fatal", off.state().status === "idle",
     off.state().status);
}

console.log(fail ? `\n${fail} failed, ${pass} passed` : `\nall passing  (${pass})`);
process.exit(fail ? 1 : 0);
