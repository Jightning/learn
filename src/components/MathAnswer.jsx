import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { normalizeMathText } from "../lib/math-text.js";

/* Delegate caret, selection, fractions and superscripts to a maintained editor.
 * Its ASCII export keeps authored keys and the checker independent of MathLive. */
export default function MathAnswer({ value, onInput, readOnly, editor, freeform = false }) {
  const host = useRef(null), props = useRef({ value, onInput, readOnly });
  props.current = { value, onInput, readOnly };
  const [error, setError] = useState(""), [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true, field;
    Promise.all([import("mathlive"), import("mathlive/fonts.css")]).then(([{ MathfieldElement }]) => {
      if (!active) return;
      // Fonts are bundled by Vite's CSS asset pipeline; never fetch a CDN.
      MathfieldElement.fontsDirectory = null;
      MathfieldElement.soundsDirectory = null;
      field = new MathfieldElement();
      // MathLive option getters require a connected field.
      host.current.replaceChildren(field);
      field.setAttribute("aria-label", "Your answer");
      field.mathVirtualKeyboardPolicy = "manual";
      field.smartFence = true;
      field.smartMode = freeform;
      // Recognize completed function names even when the reader types slowly.
      field.inlineShortcutTimeout = 0;
      field.inlineShortcuts = { ...field.inlineShortcuts,
        sqrt: "\\sqrt{#?}", abs: "\\left|#?\\right|",
        sin: "\\sin", cos: "\\cos", tan: "\\tan", exp: "\\exp", log: "\\ln", ln: "\\ln"
      };
      field.readOnly = props.current.readOnly;
      field.setValue(props.current.value, { format: "ascii-math", silenceNotifications: true });
      // MathLive defers keyboard-sink focus by 60 ms. Focus its exposed part
      // immediately on primary clicks so fast typing cannot land on the page.
      field.addEventListener("pointerdown", event => {
        if (event.button === 0 && !field.readOnly)
          field.shadowRoot?.querySelector('[part="keyboard-sink"]')?.focus({ preventScroll: true });
      }, true);
      field.addEventListener("input", () => props.current.onInput(normalizeMathText(field.getValue("ascii-math"))));
      field.addEventListener("keydown", event => {
        if (event.key === "Enter") { event.preventDefault(); field.closest("form")?.requestSubmit(); }
      }, true);
      editor.current = field;
      setReady(true);
    }).catch(error => {
      console.error("Math input initialization failed", error);
      if (active) setError("Math input could not load. Reload the page to try again.");
    });
    return () => { active = false; field?.remove(); editor.current = null; };
  }, [editor, freeform]);
  useLayoutEffect(() => {
    if (editor.current) editor.current.readOnly = readOnly;
  }, [readOnly, ready, editor]);
  useEffect(() => {
    const field = editor.current;
    if (!field) return;
    if (normalizeMathText(field.getValue("ascii-math")) !== value)
      field.setValue(value, { format: "ascii-math", silenceNotifications: true });
  }, [value, editor]);
  return <div class="qmath"><div ref={host} />{error ? <span role="status">{error}</span> : !ready && <span>Loading math input…</span>}</div>;
}
