import { Marked } from "marked";
import { highlightCode } from "./code-highlight.js";

const parser = new Marked({ gfm: true, breaks: false, renderer: {
  code({ text, lang }) {
    const name = String(lang || "").trim().split(/\s+/)[0].toLowerCase();
    const cls = /^[\w+-]+$/.test(name) ? ` class="language-${name}"` : "";
    const code = text.replace(/\n$/, "");
    return `<pre><code${cls}>${code ? highlightCode(code, name) + "\n" : ""}</code></pre>\n`;
  }
} });
const STRUCTURAL = /<(?:p|div|ol|ul|li|table|pre|h[1-6]|blockquote)\b/i;

/** Render authored text before math/references and final safeMarkup sanitization.
 * Existing block markup supplies its own structure; code and TeX stay literal. */
export function courseMarkdown(value) {
  const source = String(value ?? "");
  if (!/[\n*_`\[~#>]/.test(source)) return source;
  let prefix = "\uE000course";
  while (source.includes(prefix)) prefix += "x";
  const saved = [];
  const masked = source.replace(
    /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1\s*$|(`+)[\s\S]*?\2|<(m|pre|code|svg|math|script|style)\b[^>]*>[\s\S]*?<\/\3\s*>|\\[\\`*{}\[\]()#+.!_>~|-]|&(?:#x?[\da-f]+|\w+);/gim,
    text => {
      const html = text.startsWith("\\") ? `&#${text.codePointAt(1)};`
        : /^ {0,3}(?:`{3,}|~{3,})/.test(text) && text.includes("\n")
        ? parser.parse(text) : text.startsWith("`") ? parser.parseInline(text) : text;
      return `${prefix}${saved.push(html) - 1}\uE001`;
    });
  const structural = STRUCTURAL.test(source);
  let out = structural ? parser.parseInline(masked) : parser.parse(masked);
  // A single text field must also fit headings, labels and table cells.
  if (!structural && /^<p>[^]*<\/p>\n$/.test(out) && !out.slice(3, -5).includes("</p>"))
    out = out.slice(3, -5);
  const token = new RegExp(`${prefix}(\\d+)\uE001`, "g");
  out = out.replace(new RegExp(`<p>(${prefix}\\d+\uE001)</p>\\n?`, "g"), "$1");
  return out.replace(token, (_, i) => saved[Number(i)]);
}
