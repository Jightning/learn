import hljs from "highlight.js/lib/common";

const escape = source => source.replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

/** Use explicit language labels; guessing can misrepresent pseudocode or output. */
export function highlightCode(value, language) {
  const source = String(value ?? "");
  const name = String(language ?? "").trim().split(/\s+/)[0].toLowerCase();
  if (!name || !hljs.getLanguage(name)) return escape(source);
  return hljs.highlight(source, { language: name, ignoreIllegals: true }).value;
}
