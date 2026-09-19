import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { createSpeech, RATES, DEFAULT_RATE, rankVoices, bestVoice } from "../lib/speech.js";
import { cuesFrom, startAt, readable, QUIZ } from "../lib/readaloud.js";
import { getItem, setItem } from "../lib/store.js";
import Dropdown, { Item } from "./Dropdown.jsx";

/* Listening to a page.
 *
 * The session lives here rather than in the engine's module scope because it
 * has to be torn down when the reader leaves the page, and because two things
 * far apart in the tree drive it: the Listen button under Reading options in
 * the rail, and the bar docked at the foot of the column. `useSpeaker` owns it
 * and both are handed the same object.
 *
 * Cues are built at the moment Listen is pressed, from the DOM as it then
 * stands, and not rebuilt afterwards. That is a choice: re-reading the page
 * mid-session because a reader opened one block would move the position under
 * them and re-speak what they just heard. Changing the depth stops the session
 * for the same reason — what is on the page is no longer what is queued.
 */
const K = { rate: "speech:rate", voice: "speech:voice", quiz: "speech:quiz" };

const num = (v, fallback) => (Number.isFinite(+v) && +v > 0 ? +v : fallback);

export function useSpeaker(rootRef, route) {
  const engine = useRef(null);
  const cues = useRef([]);
  const [st, setSt] = useState(null);
  const [quiz, setQuizState] = useState(() =>
    getItem(K.quiz) === QUIZ.ASK ? QUIZ.ASK : QUIZ.SKIP);

  if (!engine.current) {
    engine.current = createSpeech({
      rate: num(getItem(K.rate), DEFAULT_RATE),
      voiceURI: getItem(K.voice) || null,
      lang: document.documentElement.lang || "en"
    });
  }
  const e = engine.current;

  useEffect(() => e.subscribe(setSt), [e]);

  /* Leaving the page ends the session. The queue describes a page that is no
     longer on screen, and speech that outlives its page is speech the reader
     cannot see the source of or scroll to. */
  useEffect(() => { e.clear(); cues.current = []; }, [route]);

  /* Backgrounding a tab suspends the platform's speech without telling the
     page, so the bar would sit there claiming to be playing. iOS does this
     whenever the screen locks, which is exactly when a listener is listening.

     `pagehide` is the harder case and the one worth the extra listener: the
     speech engine belongs to the browser, not to the document, so a page that
     is navigated away from or closed mid-utterance can go on talking with
     nothing left on screen to stop it. Not `beforeunload`, which does not fire
     on iOS when a tab is discarded. */
  useEffect(() => {
    const hide = () => { if (document.hidden) e.pause(); };
    const gone = () => e.clear();
    document.addEventListener("visibilitychange", hide);
    addEventListener("pagehide", gone);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      removeEventListener("pagehide", gone);
      /* Unmounting is the same event for our purposes: nothing on screen owns
         this session any more. */
      e.clear();
    };
  }, [e]);

  /* Mark the paragraph being spoken, and follow it only when it has left the
     screen — a reader who has scrolled somewhere else on purpose is not
     corrected, but a listener who is not looking is not left behind either. */
  useEffect(() => {
    const cur = st && st.id ? (cues.current.find(c => c.id === st.id) || {}).el : null;
    if (!cur) return;
    cur.classList.add("is-speaking");
    const box = cur.getBoundingClientRect();
    if (box.top < 0 || box.bottom > innerHeight) {
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      cur.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    }
    return () => cur.classList.remove("is-speaking");
  }, [st && st.id]);

  const start = useCallback(() => {
    const list = cuesFrom(rootRef.current, quiz);
    cues.current = list;
    e.clear();
    if (!list.length) return;
    e.enqueue(list.map(c => ({ id: c.id, text: c.text, hold: c.hold })));
    /* Where the reader is, not the top of the page. Pressing Listen half way
       down a section meant "from here"; starting at the section title instead
       makes the control useless for exactly the reader who needed it. */
    e.seek(startAt(list));
    /* Reached straight from the button press, which is the gesture iOS and
       Chrome's autoplay policy require the first `speak()` to sit inside. */
    e.play();
  }, [e, rootRef, quiz]);

  const setRate = r => { setItem(K.rate, String(r)); e.setRate(r); };
  const setVoice = v => { setItem(K.voice, v || ""); e.setVoice(v); };
  const setQuiz = q => { setItem(K.quiz, q); setQuizState(q); };

  return {
    supported: e.supported, st, quiz, start, setRate, setVoice, setQuiz,
    cues: cues.current,
    live: !!st && st.chunks > 0 && st.status !== "idle",
    pause: () => e.pause(), play: () => e.play(),
    skip: n => e.skip(n), stop: () => { e.clear(); cues.current = []; }
  };
}

/** The label for where in the page the voice has got to. */
function whereOf(cues, id) {
  const at = cues.findIndex(c => c.id === id);
  if (at < 0) return "";
  for (let i = at; i >= 0; i--) {
    const h = cues[i].el && cues[i].el.closest && cues[i].el.closest(".sub");
    const head = h && h.querySelector("h3");
    /* `readable`, not textContent. A subsection heading is "<span
       class=sid>1.2</span>Answering a question" with no whitespace between the
       two, so textContent fuses them into "1.2Answering a question" — the same
       reason the cue extractor exists rather than reading textContent. */
    if (head) return readable(head);
  }
  return "";
}

/* The bar. Present only while a session is, so it costs nothing the rest of
   the time — which is the whole reason it is here rather than in the toolbar. */
export default function Speaker({ s }) {
  if (!s.supported || !s.live) return null;
  const { st } = s;
  const playing = st.status === "speaking";
  const held = st.status === "paused";
  const where = whereOf(s.cues, st.id);
  const rate = st.rate;

  /* Ranked, not just filtered to the language: the platform list is in no
     useful order and on macOS it has the novelty voices in it. lib/speech.js
     says why. Picking one while it is talking re-speaks at once, so the menu
     is also how you audition them. */
  const lang = document.documentElement.lang || "en";
  const voices = rankVoices(st.voices || [], lang);
  const named = (st.voices || []).find(v => v.voiceURI === st.voiceURI);
  const auto = bestVoice(st.voices || [], lang);

  return (
    <div class="spk" role="group" aria-label="Read aloud">
      <div class="spk-run">
        <button class="spk-b" onClick={() => s.skip(-1)} aria-label="Previous paragraph">‹‹</button>
        <button class="spk-b spk-play" aria-label={playing ? "Pause" : "Play"}
                onClick={() => (playing ? s.pause() : s.play())}>
          {playing ? "❙❙" : "▶"}
        </button>
        <button class="spk-b" onClick={() => s.skip(1)} aria-label="Next paragraph">››</button>
        <span class="spk-where">
          {/* A question that has stopped for an answer says so, because
              otherwise a deliberate silence is indistinguishable from a fault. */}
          {held && st.id && (s.cues.find(c => c.id === st.id) || {}).hold
            ? "Waiting for you"
            : where || "Reading"}
        </span>
        <span class="spk-n">{Math.min(st.chunk + 1, st.chunks)} of {st.chunks}</span>
        <button class="spk-b spk-x" onClick={s.stop} aria-label="Stop reading">✕</button>
      </div>

      <div class="spk-set">
        <Dropdown label="Speed" value={rate + "×"}>
          {close => RATES.map(r => (
            <Item key={r} sel={r === rate} text={r + "×"}
                  onPick={() => { s.setRate(r); close(); }} />
          ))}
        </Dropdown>

        {/* Only where the platform admitted to having any. Several report none
            until well after load, and one that never does is not a fault: an
            utterance with no voice set speaks in the system default. */}
        {voices.length > 0 && (
          <Dropdown label="Voice" wide value={named ? named.name : ""}>
            {close => (
              <>
                <Item sel={!st.voiceURI} text="Best available"
                      sub={auto ? auto.name : "whatever this device provides"}
                      onPick={() => { s.setVoice(null); close(); }} />
                {voices.map(v => (
                  <Item key={v.voiceURI} sel={v.voiceURI === st.voiceURI}
                        text={v.name} sub={v.lang}
                        onPick={() => { s.setVoice(v.voiceURI); close(); }} />
                ))}
                {/* The ceiling is the platform's, not ours: a page can only
                    use voices the device has, and the good ones are usually a
                    download rather than a default. Worth saying, because the
                    fix is one the reader can actually apply and would not
                    otherwise guess. */}
                <p class="dd-foot">
                  These are the voices this device offers a web page. Higher
                  quality ones can be installed in the system's
                  spoken-content settings, and appear here once they are.
                </p>
              </>
            )}
          </Dropdown>
        )}

        <Dropdown label="Questions" value={s.quiz === QUIZ.ASK ? "Ask" : "Skip"}>
          {close => (
            <>
              <Item sel={s.quiz === QUIZ.SKIP} text="Skip" sub="skip quizzes"
                    onPick={() => { s.setQuiz(QUIZ.SKIP); close(); }} />
              <Item sel={s.quiz === QUIZ.ASK} text="Ask"
                    sub="waits for the user to answer a question"
                    onPick={() => { s.setQuiz(QUIZ.ASK); close(); }} />
            </>
          )}
        </Dropdown>
        {/* Named, because speed and voice take effect on the next breath and
            this one does not: the queue is built when Listen is pressed, and
            rebuilding it mid-session would move the reader's position under
            them. Saying "takes effect later" without saying *what* would leave
            all three controls under suspicion. */}
      </div>
    </div>
  );
}
