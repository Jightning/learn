/* Imported course CSS is data, not a stylesheet with authority over the app.
 * A selector must name a class declared for table/grid values or in the
 * course's styleClasses list. Every rule is then scoped under rendered block
 * content, so even a declared class cannot restyle navigation or dialogs. */
const CLASS = /^[a-z][\w-]*$/i;
const COLOR = /^(?:var\(--(?:hi-ink|lo-ink|dc-ink|accent|ink-2|ink-3|rule|hi|lo|dc|hz)\)|#[0-9a-f]{3,8}|transparent|currentColor)$/i;
const LENGTH = /^(?:0|(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em))$/;
const NUM = /^(?:0|1|0?\.\d+)$/;
const VAR_LENGTH = /^var\(--sp-[1-9]\)$/;
const SPACE = value => value.split(/\s+/).every(x => LENGTH.test(x) || VAR_LENGTH.test(x));
const RULES = {
  color: value => COLOR.test(value),
  "background-color": value => COLOR.test(value),
  "font-weight": value => /^(?:400|500|600|700|bold|normal)$/.test(value),
  "font-style": value => /^(?:normal|italic)$/.test(value),
  "font-family": value => /^(?:var\(--mono\)|var\(--sans\)|var\(--serif\))$/.test(value),
  "font-size": value => LENGTH.test(value),
  opacity: value => NUM.test(value) && Number(value) <= 1,
  display: value => /^(?:block|inline|inline-block|flex|inline-flex)$/.test(value),
  "flex-direction": value => /^(?:row|column)$/.test(value),
  "font-variant-numeric": value => value === "tabular-nums",
  gap: value => LENGTH.test(value),
  padding: SPACE,
  margin: SPACE,
  "border-radius": value => LENGTH.test(value),
  border: value => /^1px solid var\(--rule\)$/.test(value)
};

export function safeCourseStyles(input, course = {}) {
  const css = String(input || "");
  if (css.length > 12000) return "";
  const valueStyles = course.valueStyles && typeof course.valueStyles === "object" &&
    !Array.isArray(course.valueStyles) ? Object.values(course.valueStyles) : [];
  const extra = Array.isArray(course.styleClasses) ? course.styleClasses : [];
  if (valueStyles.length + extra.length > 128) return "";
  const allowed = new Set([...valueStyles, ...extra].filter(name =>
    typeof name === "string" && CLASS.test(name)));
  const out = [];
  const rule = /\s*\.([a-z][\w-]*)\s*\{([^{}]*)\}/gy;
  let at = 0;
  while (at < css.length) {
    if (/^\s*$/.test(css.slice(at))) break;
    rule.lastIndex = at;
    const match = rule.exec(css);
    if (!match || match.index !== at || out.length >= 80 || !allowed.has(match[1])) return "";
    const decls = [];
    for (const part of match[2].split(";")) {
      if (!part.trim()) continue;
      const colon = part.indexOf(":");
      if (colon < 0) return "";
      const key = part.slice(0, colon).trim().toLowerCase();
      const value = part.slice(colon + 1).trim();
      if (!RULES[key]?.(value)) return "";
      decls.push(`${key}:${value}`);
    }
    if (decls.length) out.push(`.shell:not(.solo) .bhtml .${match[1]}{${decls.join(";")}}`);
    at = rule.lastIndex;
  }
  return out.join("\n");
}
