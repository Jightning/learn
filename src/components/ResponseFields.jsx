import { authored as M } from "../lib/safe-markup.js";

/* A blank is a labeled field, so it remains usable without a visual layout. */
export default function ResponseFields({ fields, value, onInput, readOnly }) {
  return <fieldset class="qfields"><legend>Complete each field</legend>
    {fields.map(field => {
      const response = field.response, current = value?.[field.id] ?? (response.kind === "multi" ? [] : "");
      const change = next => onInput({ ...value, [field.id]: next });
      if (response.kind === "single" || response.kind === "multi") return <fieldset key={field.id} class="qchoices">
        <legend dangerouslySetInnerHTML={{ __html: M(field.label) }} />
        {response.choices.map((choice, at) => <label class="qchoice" key={at}>
          <input type={response.kind === "multi" ? "checkbox" : "radio"} name={field.id}
            checked={response.kind === "multi" ? current.includes(at+1) : Number(current) === at+1} disabled={readOnly}
            onChange={() => change(response.kind === "multi" ? current.includes(at+1) ? current.filter(n => n !== at+1) : [...current, at+1] : at+1)} />
          <span dangerouslySetInnerHTML={{ __html: M(choice.text) }} />
        </label>)}
      </fieldset>;
      return <label class="qentry" key={field.id}>
        <span dangerouslySetInnerHTML={{ __html: M(field.label) }} />
        <input type={response.kind === "number" ? "number" : "text"} step={response.kind === "number" ? "any" : undefined}
          maxLength={response.kind === "text" ? 1024 : undefined} value={current} readOnly={readOnly} onInput={event => change(event.currentTarget.value)} />
      </label>;
    })}
  </fieldset>;
}
