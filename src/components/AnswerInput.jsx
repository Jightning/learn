import { useEffect, useRef, useState } from "preact/hooks";
import { authored as M } from "../lib/safe-markup.js";
import MathAnswer from "./MathAnswer.jsx";
import { normalizeMathText } from "../lib/math-text.js";

const BASIC = [["√", "sqrt()", 5], ["xⁿ", "^()", 2], ["Fraction", "()/()", 1], ["π", "pi", 2]];
const GROUPS = [
  ["Functions", [["sin", "sin()", 4], ["cos", "cos()", 4], ["tan", "tan()", 4],
    ["log", "log()", 4], ["eˣ", "e^()", 3], ["|x|", "abs()", 4]]],
  ["Calculus", [["Integral", "integral(,x)", 9, "\\int #0\\,d x"],
    ["Definite integral", "integral(,x,0,1)", 9, "\\int_{#?}^{#?} #0\\,d x"],
    ["Derivative", "diff(,x)", 5, "\\frac{d}{dx}#0"],
    ["dy/dx", "diff(y,x)", 9, "\\frac{dy}{dx}"],
    ["Prime", "'", 1, "^{\\prime}"]]],
  ["Greek letters", [["α", "alpha"], ["β", "beta"], ["γ", "gamma"], ["δ", "delta"],
    ["ε", "epsilon"], ["θ", "theta"], ["λ", "lambda"], ["μ", "mu"], ["ρ", "rho"],
    ["σ", "sigma"], ["φ", "phi"], ["ψ", "psi"], ["ω", "omega"]].map(([glyph, name]) => [glyph, name, name.length])]
];
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function FormulaPreview({ value, freeform = false, variables = null, independentVariable = "x" }) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    let active = true;
    setPreview(freeform ? M(value) : escape(value));
    const timer = setTimeout(async () => {
      if (!value.trim()) return;
      try {
        const { parseFormula } = await import("../lib/formula.js");
        const render = text => M(`<m>${escape(parseFormula(text, variables, independentVariable, false, true).tex)}</m>`);
        let html;
        if (!freeform) html = render(value);
        else {
          // Parse text nodes only: preserve authored HTML and existing <m> math.
          const holder = document.createElement("div");
          holder.innerHTML = M(value);
          const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT), texts = [];
          while (walker.nextNode()) if (!walker.currentNode.parentElement.closest(".katex,code,pre")) texts.push(walker.currentNode);
          const pattern = /(?:sqrt|sin|cos|tan|log|exp|abs|diff|derivative|integral)\([^()\n]{1,80}\)|(?:[A-Za-z]|\d+)\^(?:\([^()\n]{1,80}\)|[+-]?[A-Za-z0-9]+)|[A-Za-z]'+/g;
          for (const node of texts) {
            const source = node.textContent;
            let end = 0, replacement = "";
            for (const match of source.matchAll(pattern)) {
              replacement += escape(source.slice(end, match.index));
              try { replacement += render(match[0]); } catch { replacement += escape(match[0]); }
              end = match.index + match[0].length;
            }
            replacement += escape(source.slice(end));
            const span = document.createElement("span"); span.innerHTML = replacement;
            node.replaceWith(...span.childNodes);
          }
          html = holder.innerHTML;
          if (!/[<>]/.test(value) && /[=^*/()+\-']/.test(value) && !/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(value)) {
            try { html = render(value); } catch { /* A prose answer keeps its inline rendering. */ }
          }
        }
        if (active) setPreview(html);
      } catch { if (active) setPreview(freeform ? M(value) : escape(value)); }
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [value, freeform, variables, independentVariable]);
  return <div class="qpreview" aria-label="Formula preview" dangerouslySetInnerHTML={{ __html: preview }} />;
}

export default function AnswerInput({ response, value, onInput, readOnly }) {
  const entry = useRef(null), dialog = useRef(null), more = useRef(null);
  const formula = response.kind === "formula";
  const symbols = formula || response.mathSymbols === true;
  const preview = formula || response.formulaParsing === true;
  const insert = ([, template, position, mathTemplate]) => {
    const el = entry.current;
    if (preview) {
      if (!el) return;
      const latex = mathTemplate || (template === "sqrt()" ? "\\sqrt{#0}" : template === "^()" ? "^{#0}" :
        template === "()/()" ? "\\frac{#0}{#?}" : template === "e^()" ? "e^{#0}" :
        template === "abs()" ? "\\left|#0\\right|" : template === "log()" ? "\\ln(#0)" :
        template.endsWith("()") ? `\\${template.slice(0, -2)}(#0)` : `\\${template}`);
      el.insert(latex, { format: "latex", mode: "math", selectionMode: "placeholder" });
      onInput(normalizeMathText(el.getValue("ascii-math")));
      dialog.current?.close();
      requestAnimationFrame(() => el.focus());
      return;
    }
    const start = el.selectionStart ?? value.length, end = el.selectionEnd ?? start;
    const selected = value.slice(start, end);
    let text = template, caret = position;
    if (selected && template === "^()") { text = `(${selected})^()`; caret = selected.length + 4; }
    else if (selected && template === "()/()") { text = `(${selected})/()`; caret = selected.length + 4; }
    else if (selected && template.endsWith("()")) { text = template.slice(0, -1) + selected + ")"; caret = text.length; }
    onInput(value.slice(0, start) + text + value.slice(end));
    dialog.current?.close();
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + caret, start + caret); });
  };
  const button = option => <button class="dbtn" type="button" disabled={readOnly}
    aria-label={`Insert ${option[1].match(/^[a-z]+$/) ? option[1] : option[0]}`} title={option[1].match(/^[a-z]+$/) ? option[1] : option[0]}
    onClick={() => insert(option)} key={option[0]}>{option[0]}</button>;
  return <div class="qanswer">
    <label class="qentry">Your answer
      {preview ? <MathAnswer editor={entry} value={value} onInput={onInput} readOnly={readOnly} freeform={!formula} /> :
        <textarea ref={entry} rows="4" value={value} readOnly={readOnly} onInput={e => onInput(e.currentTarget.value)} />}
    </label>
    {symbols && <div class="qsymbols" role="group" aria-label="Math symbols">
      {BASIC.map(button)}
      <button ref={more} class="dbtn" type="button" disabled={readOnly} aria-label="More math symbols"
        onClick={() => dialog.current.showModal()}>…</button>
    </div>}
    {symbols && <dialog class="qsymbol-dialog" ref={dialog} aria-label="More math symbols"
      onClick={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom)) event.currentTarget.close();
      }}
      onClose={() => more.current?.focus()}>
      <p>More math symbols</p>
      <div class="qsymbol-groups">{GROUPS.map(([title, options]) => <section key={title}><h3>{title}</h3><div class="qsymbols">{options.map(button)}</div></section>)}</div>
      <button class="dbtn" type="button" onClick={() => dialog.current.close()}>Close</button>
    </dialog>}
  </div>;
}
