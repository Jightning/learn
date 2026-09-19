/* ============================================================================
 * src/lib/speech.js — a speech session over the Web Speech API
 *
 * The engine knows nothing about the page. It is handed *cues* — `{id, text}`
 * — and speaks them in order, and that is deliberately the whole contract,
 * because the queue is the seam a conversation would arrive on. Reading a
 * section pushes every paragraph up front; a conversation would push one turn
 * at a time as answers arrive. `enqueue` while already speaking is a supported
 * path rather than an accident, and `hold` on a cue stops playback when that
 * cue ends, which is what "ask a question and wait for the reader" needs. Both
 * are tested. Nothing else has to change to grow the second mode.
 *
 * Everything below is shaped by the platform being much worse than its
 * specification.
 *
 * `speak()` must be reached from a user gesture, or nothing happens and no
 * error is raised. The UI never auto-starts.
 *
 * `getVoices()` is empty until the list loads, `voiceschanged` is how you learn
 * that it has, and several browsers never fire it. So the list is polled as
 * well, and an empty list is a working state — omitting `voice` gets the
 * platform default, which is the right voice on most devices anyway.
 *
 * Long utterances fail. Safari truncates them and Chrome stops speaking after
 * roughly fifteen seconds, both silently. Chunking is therefore not a nicety:
 * `CHUNK` is small enough that one chunk cannot reach either limit even at the
 * slowest rate offered (120 characters is about eight seconds at 1x, eleven at
 * 0.75x). This also removes any need for the `pause()/resume()` watchdog that
 * is usually bolted on for the Chrome bug — a watchdog that breaks speech
 * outright on iOS, so not needing one is worth more than it costs.
 *
 * `pause()` and `resume()` are unreliable on Safari and iOS: pause is ignored,
 * or resume never restarts. So pause is not `pause()`. It is `cancel()` plus a
 * remembered position, which behaves identically on every engine and is the
 * reason the chunk list is addressable at all. Where `boundary` fires (not
 * iOS) the character offset is remembered too and the chunk resumes mid-way;
 * where it does not, the current chunk restarts, which costs at most a few
 * seconds of repetition and is the honest failure.
 *
 * `cancel()` immediately followed by `speak()` drops the new utterance in
 * Safari, so the two are always separated by a turn of the event loop.
 *
 * The synth is injected rather than reached for, which is what lets the state
 * machine be tested in node against a fake (tools/test-speech.mjs). Every
 * platform bug listed above is a behaviour, and a behaviour nothing exercises
 * is a behaviour that regresses.
 * ==========================================================================*/

/** Speeds offered. Below 0.75 the chunk cap stops protecting us from the
 *  fifteen-second cutoff; above 2 most platform voices distort. */
export const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export const DEFAULT_RATE = 1;

/* Characters, not words: the limits being dodged are wall-clock, and characters
   track speaking time far better than word count across languages. */
const CHUNK = 120;

/** Sentence boundaries without lookbehind, which iOS Safari lacked until 16.4. */
const SENTENCES = /[^.!?…]+[.!?…]+["'”’)\]]*\s*|[^.!?…]+$/g;

/**
 * Split one cue into speakable pieces, each at most `max` characters.
 *
 * Sentences first, because a sentence break is the only split a listener does
 * not hear as a fault. A sentence over the cap is broken at a clause, then at a
 * space, then — only for a single unbroken run longer than the cap, which is a
 * URL or an identifier rather than prose — mid-word.
 */
export function chunk(text, max = CHUNK) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const out = [];
  let buf = "";
  const flush = () => { if (buf.trim()) out.push(buf.trim()); buf = ""; };

  for (const raw of clean.match(SENTENCES) || [clean]) {
    const s = raw.trim();
    if (!s) continue;
    /* Pack whole sentences together while they fit: fewer utterances means
       fewer seams, and a seam is audible. */
    if (buf && (buf + " " + s).length <= max) { buf += " " + s; continue; }
    flush();
    if (s.length <= max) { buf = s; continue; }
    for (const part of split(s, max)) out.push(part);
  }
  flush();
  return out;
}

/** One over-long sentence, cut at the best boundary that fits. */
function split(s, max) {
  const out = [];
  let rest = s;
  while (rest.length > max) {
    const window = rest.slice(0, max + 1);
    /* Prefer a clause end, then any space. lastIndexOf over a set of marks
       rather than a regex so the *latest* one that fits wins. */
    let at = -1;
    for (const mark of [", ", "; ", ": ", ") ", " — ", " - "]) {
      at = Math.max(at, window.lastIndexOf(mark) + (mark.length - 1));
    }
    if (at <= 0) at = window.lastIndexOf(" ");
    /* No boundary at all: an unbroken run. Cut it rather than emit something
       the platform will silently truncate. */
    if (at <= 0) at = max;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Flatten cues to the chunk list actually spoken. Exported for the tests. */
export function flatten(cues, max = CHUNK) {
  const flat = [];
  cues.forEach((cue, ci) => {
    const parts = chunk(cue.text, max);
    /* A cue with no speakable text still has to exist in the list, or a `hold`
       on it is lost and skip() counts cues that are not there. */
    if (!parts.length) parts.push("");
    parts.forEach((text, k) =>
      flat.push({ text, cue: ci, first: k === 0, last: k === parts.length - 1 }));
  });
  return flat;
}

/* --------------------------------------------------------------- voices ---
 *
 * "The system default" is not a quality bar, it is whatever the platform put
 * first, and on macOS that list also contains two dozen novelty voices —
 * Zarvox, Bubbles, Deranged, Bad News — which are shipped as toys and are
 * indistinguishable from the useful ones to any code that only reads a name.
 * Leaving the choice to the platform therefore risks a page read by a robot
 * doing a bit, and guarantees only that nobody hears the good voice their
 * device already has installed.
 *
 * So voices are ranked, the best is what an unset preference resolves to, and
 * the menu is ordered by the same score so the good ones are at the top rather
 * than alphabetised among the toys.
 *
 * The lists are names, which is unlovely, but the API exposes nothing else:
 * there is no quality field, no category, and `localService` is the only
 * structural hint — and it means "not fetched over the network", which
 * correlates with quality only loosely and backwards on iOS. Names it is.
 */
const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|junior|princess|ralph|fred|grandma|grandpa|rocko|shelley|sandy|eddy|reed|flo|kathy|bahh)\b/i;
/* The vendors' own words for their better synthesis. */
const PREMIUM = /\b(natural|enhanced|premium|neural|siri)\b/i;
/* Voices that are simply good, and are the ones a person would pick by ear. */
const GOOD = /\b(samantha|ava|allison|susan|zoe|evan|nathan|serena|daniel|kate|oliver|stephanie|karen|moira|tessa|aria|jenny|guy|ryan|sonia|libby|emma)\b|google (uk|us)/i;

/** Higher is better. Exported so the menu can order by the same judgement. */
export function score(v, lang = "en") {
  const name = v.name || "";
  let n = 0;
  if (NOVELTY.test(name)) return -100;          /* never, whatever else it is */
  if (PREMIUM.test(name)) n += 40;
  if (GOOD.test(name)) n += 20;
  if (v.localService === false) n += 10;        /* a served voice is a newer one */
  if (v.default) n += 5;
  if ((v.lang || "").toLowerCase().replace("_", "-") === lang.toLowerCase()) n += 5;
  return n;
}

/** The voices worth offering for a language, best first. */
export function rankVoices(voices, lang = "en") {
  const base = lang.slice(0, 2).toLowerCase();
  return (voices || [])
    .filter(v => (v.lang || "").slice(0, 2).toLowerCase() === base)
    .map(v => ({ v, s: score(v, lang) }))
    .sort((a, b) => b.s - a.s || (a.v.name || "").localeCompare(b.v.name || ""))
    .map(x => x.v);
}

/** What an unset preference resolves to. Null when there is nothing to pick. */
export function bestVoice(voices, lang = "en") {
  const ranked = rankVoices(voices, lang).filter(v => score(v, lang) > -100);
  return ranked[0] || null;
}

/**
 * A session.
 *
 * `synth` and `Utterance` are injected so the state machine can be driven by a
 * fake. In a browser they default to the platform's.
 */
export function createSpeech({
  synth = typeof speechSynthesis !== "undefined" ? speechSynthesis : null,
  Utterance = typeof SpeechSynthesisUtterance !== "undefined" ? SpeechSynthesisUtterance : null,
  rate = DEFAULT_RATE,
  voiceURI = null,
  lang = "en",
  max = CHUNK,
  defer = (f, ms = 0) => setTimeout(f, ms)
} = {}) {
  const supported = !!(synth && Utterance);

  let cues = [], flat = [], pos = 0;
  /* `charAt` is the absolute offset reached inside the current chunk; `from` is
     the offset the utterance now speaking began at. Boundary events report an
     index into the string handed to *that* utterance, so after a resume they
     are relative to the slice, and the two have to be tracked separately or a
     second pause lands further along than the reader actually got. */
  let charAt = 0, from = 0;
  let status = "idle";                 /* idle | speaking | paused | ended */
  let voices = [];
  /* Bumped on every cancel. A cancelled utterance still delivers its `end` or
     `error` to us afterwards, and acting on it advances a position that has
     already moved. Every callback checks the generation it was born in. */
  let gen = 0;
  const subs = new Set();

  const state = () => ({
    supported, status, rate, voiceURI, voices,
    cue: flat[pos] ? flat[pos].cue : cues.length ? cues.length - 1 : -1,
    cues: cues.length,
    chunk: Math.min(pos, flat.length),
    chunks: flat.length,
    id: flat[pos] && cues[flat[pos].cue] ? cues[flat[pos].cue].id : null
  });
  const notify = () => { const s = state(); subs.forEach(f => f(s)); };

  /* ---------------------------------------------------------------- voices */
  function readVoices() {
    if (!supported) return;
    const got = synth.getVoices ? synth.getVoices() || [] : [];
    if (got.length === voices.length) return;
    voices = got;
    notify();
  }
  if (supported) {
    readVoices();
    if (synth.addEventListener) synth.addEventListener("voiceschanged", readVoices);
    /* Several engines never fire voiceschanged. Polling for a second costs
       nothing and is the difference between a voice menu and an empty one. */
    [60, 200, 500, 1000].forEach(t => defer(readVoices, t));
  }
  /* An explicit choice, or the best one on the device. Never "whatever the
     platform hands back first", which is how a novelty voice gets the job. */
  const voiceObj = () =>
    (voiceURI && voices.find(v => v.voiceURI === voiceURI)) || bestVoice(voices, lang);

  /* --------------------------------------------------------------- speaking */
  function step() {
    if (!supported) return;
    if (pos >= flat.length) { status = "ended"; notify(); return; }

    const piece = flat[pos];
    from = charAt;
    const text = from > 0 ? piece.text.slice(from) : piece.text;
    /* An empty cue (a heading the DOM gave us nothing for) is stepped over
       rather than spoken, but it still counts as reached, so a `hold` on it
       still holds. */
    if (!text.trim()) { finish(piece); return; }

    const my = gen;
    const u = new Utterance(text);
    u.rate = rate;
    u.lang = (voiceObj() && voiceObj().lang) || lang;
    if (voiceObj()) u.voice = voiceObj();
    /* Where it fires, this is what lets a pause resume mid-sentence instead of
       repeating the chunk. iOS never fires it; the fallback is the repeat. */
    u.onboundary = e => { if (my === gen && typeof e.charIndex === "number") charAt = from + e.charIndex; };
    u.onend = () => { if (my === gen) finish(piece); };
    u.onerror = e => {
      if (my !== gen) return;
      /* "interrupted"/"canceled" are our own cancel arriving late. Anything
         else is a real fault on this chunk, and skipping it beats stopping the
         session over one bad string. */
      const why = e && e.error;
      if (why === "interrupted" || why === "canceled") return;
      finish(piece);
    };
    synth.speak(u);
  }

  function finish(piece) {
    charAt = 0; from = 0;
    pos++;
    const cue = cues[piece.cue];
    /* A cue may ask playback to stop when it ends: a question waiting for an
       answer. This is the hook a conversation turn hangs on. */
    if (piece.last && cue && cue.hold) { status = "paused"; notify(); return; }
    notify();
    step();
  }

  function cancel() {
    gen++;
    if (!supported || !synth.cancel) return;
    synth.cancel();
    /* Twice, a turn apart.
     *
     * `cancel()` only stops what the engine has already started. An utterance
     * handed over but not yet begun — there is a startup delay on every
     * platform and it is tens of milliseconds on Safari — is not always in the
     * queue it clears, so it starts *after* the cancel and plays to the end.
     * That is the "I stopped it and it spoke anyway a moment later" fault. The
     * second cancel catches whatever had not started in time for the first. */
    defer(() => { if (synth.cancel) synth.cancel(); });
  }

  /* Schedule a step that a later cancel can call off.
   *
   * Every resumption is deferred, because Safari drops an utterance queued in
   * the same task as the cancel before it — and a deferred call outlives the
   * state that asked for it. Pressing stop, or starting a second session, in
   * that window left a step already booked, and it spoke into a session that
   * no longer existed. The generation it was booked in is checked when it
   * fires, which is the same guard the utterance callbacks already use. */
  function schedule() {
    const my = gen;
    defer(() => { if (my === gen) step(); });
  }

  /* ------------------------------------------------------------------- api */
  function play() {
    if (!supported || !flat.length) return;
    if (status === "speaking") return;
    cancel();
    status = "speaking";
    notify();
    schedule();
  }

  function pause() {
    if (status !== "speaking") return;
    /* Not synth.pause(). See the header: it is ignored or unrecoverable on
       Safari and iOS, and cancel-with-a-position behaves the same everywhere. */
    cancel();
    status = "paused";
    notify();
  }

  function stop() {
    cancel();
    pos = 0; charAt = 0; from = 0;
    status = "idle";
    notify();
  }

  function clear() {
    cancel();
    cues = []; flat = []; pos = 0; charAt = 0; from = 0;
    status = "idle";
    notify();
  }

  /** Append cues. Safe while speaking, which is the conversation path. */
  function enqueue(more) {
    const add = (Array.isArray(more) ? more : [more]).filter(Boolean);
    if (!add.length) return;
    const base = cues.length;
    cues = cues.concat(add);
    flatten(add, max).forEach(f => flat.push({ ...f, cue: f.cue + base }));
    /* Arriving into a finished session restarts it at the new material rather
       than requiring the caller to know whether it had run dry. */
    if (status === "ended") { status = "speaking"; notify(); schedule(); }
    else notify();
  }

  /** Move by whole cues; `to` jumps to one. Keeps playing if it was playing. */
  function seek(cueIndex) {
    const i = Math.max(0, Math.min(cueIndex, cues.length - 1));
    const at = flat.findIndex(f => f.cue === i && f.first);
    if (at < 0) return;
    const wasSpeaking = status === "speaking";
    cancel();
    pos = at; charAt = 0; from = 0;
    status = wasSpeaking ? "speaking" : "paused";
    notify();
    if (wasSpeaking) schedule();
  }
  const skip = n => seek((flat[pos] ? flat[pos].cue : 0) + n);

  function setRate(r) {
    rate = r;
    /* The platform reads rate when an utterance starts, so a change mid-chunk
       is inaudible until the next one. Re-speaking the current chunk from where
       it is applies it now, which is what a reader who just pressed 1.5x
       expects to hear. */
    if (status === "speaking") { cancel(); status = "speaking"; schedule(); }
    notify();
  }

  function setVoice(uri) {
    voiceURI = uri || null;
    if (status === "speaking") { cancel(); charAt = 0; from = 0; status = "speaking"; schedule(); }
    notify();
  }

  function subscribe(fn) { subs.add(fn); fn(state()); return () => subs.delete(fn); }

  return { supported, subscribe, state, enqueue, clear, play, pause, stop,
           seek, skip, setRate, setVoice, get rate() { return rate; } };
}
