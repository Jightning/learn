/* The one policy for HTML made from course fields. Every HTML sink calls this
 * after formatting, references, figures and KaTeX have produced their markup.
 * Parse in an inert document, then copy only known presentation nodes and
 * attributes. Unknown elements are dropped with their contents: unwrapping an
 * SVG foreignObject or a script would change its meaning. */
import { M as renderMath } from "./math.js";
const TAGS = new Set((
  "a b blockquote br caption code dd div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img li mark ol p pre s small span strong sub sup table tbody td th thead tr u ul " +
  "svg g path line rect circle ellipse polyline polygon text title defs marker " +
  "math semantics annotation mrow mi mn mo mtext mspace mfrac msqrt mroot msup msub msubsup mover munder munderover mtable mtr mtd mpadded mphantom menclose"
).split(" "));
const VOID = new Set(["br", "hr", "img"]);
const STRUCTURAL = new Set("blockquote caption dd div dl dt figcaption figure h1 h2 h3 h4 h5 h6 hr li ol p pre table tbody td th thead tr ul".split(" "));
const ATTRS = new Set((
  "class role aria-label aria-hidden aria-live aria-atomic data-xr data-node data-wire " +
  "alt loading colspan rowspan viewbox preserveaspectratio d x y x1 x2 y1 y2 cx cy r rx ry width height points " +
  "transform text-anchor stroke-width stroke-dasharray fill-rule opacity font-size " +
  "refx refy markerwidth markerheight orient xmlns displaystyle scriptlevel encoding"
).split(" "));
const CSS = new Set((
  "height width min-width max-width top left margin-right margin-left padding-left padding-right " +
  "vertical-align border-bottom-width stroke background color"
).split(" "));
const CSS_VALUE = /^(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:px|em|rem|%|ex)?|var\(--(?:hi|lo|dc|hz)\)|currentColor|transparent)$/i;
/* SVG data URLs are allowed only in an img src. Browsers render SVG images in
 * image mode, where scripts and interactive content cannot run. */
const IMAGE = /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,[a-z0-9+/=]+$/i;
const PAINT = /^(?:none|currentColor|transparent|#[0-9a-f]{3,8}|var\(--(?:hi|lo|dc|hz|ink-2|ink-3|surface-2|rule)\))$/i;

export function safeImageURL(value) {
  const url = String(value || "").trim();
  return IMAGE.test(url) ? url : "";
}

function safeLink(value, svg) {
  const url = String(value || "").trim();
  if (/[\u0000-\u0020\u007f]/.test(url)) return "";
  if (svg) return /^#[a-z0-9_-]+$/i.test(url) ? url : "";
  if (url.startsWith("#") && /^#[\/a-z0-9_~.%-]+$/i.test(url)) return url;
  if (/^https?:\/\/[^\s]+$/i.test(url) || /^mailto:[^\s@]+@[^\s@]+$/i.test(url)) return url;
  return "";
}

function safeStyle(value) {
  return String(value).split(";").map(part => {
    const at = part.indexOf(":");
    if (at < 0) return "";
    const key = part.slice(0, at).trim().toLowerCase();
    const val = part.slice(at + 1).trim();
    return CSS.has(key) && CSS_VALUE.test(val) ? `${key}:${val}` : "";
  }).filter(Boolean).join(";");
}

/** Safe HTML for dangerouslySetInnerHTML. Node has no DOM sink; browser paths
 * always use the inert parser before anything is inserted into the page. */
export function safeMarkup(value) {
  const source = String(value == null ? "" : value);
  if (typeof DOMParser === "undefined") return source;
  const doc = new DOMParser().parseFromString(source, "text/html");
  const clean = (node, preserveNewlines = false) => {
    if (node.nodeType === 3) {
      const text = node.nodeValue;
      /* Whitespace between structural elements is indentation. Between two
         inline phrases it is an authored break even when both phrases are
         wholly bold/math/etc. Code and MathML retain their own spacing. */
      const betweenInline = [node.previousSibling, node.nextSibling].every(sibling =>
        sibling?.nodeType === 1 && !STRUCTURAL.has(sibling.localName.toLowerCase()));
      if (!preserveNewlines && (/\S/.test(text) || betweenInline) && /\r?\n/.test(text)) {
        const fragment = doc.createDocumentFragment();
        const lines = text.split(/\r?\n/);
        lines.forEach((line, i) => {
          if (i) fragment.appendChild(doc.createElement("br"));
          if (line) fragment.appendChild(doc.createTextNode(line));
        });
        return fragment;
      }
      return doc.createTextNode(text);
    }
    if (node.nodeType !== 1) return null;
    const tag = node.localName.toLowerCase();
    if (!TAGS.has(tag)) return null;
    const out = doc.createElementNS(node.namespaceURI, node.localName);
    for (const attr of node.attributes) {
      const name = attr.name.toLowerCase();
      if (name === "href") {
        const url = safeLink(attr.value, node.namespaceURI === "http://www.w3.org/2000/svg");
        if (tag === "a" && url) out.setAttribute("href", url);
      } else if (name === "src") {
        const url = safeImageURL(attr.value);
        if (tag === "img" && url) out.setAttribute("src", url);
      } else if (name === "style") {
        const style = safeStyle(attr.value);
        if (style) out.setAttribute("style", style);
      } else if ((name === "fill" || name === "stroke") && PAINT.test(attr.value)) {
        out.setAttribute(name, attr.value);
      } else if ((name === "marker-end" || name === "marker-start") &&
                 /^url\(#[a-z][\w-]*\)$/i.test(attr.value)) {
        out.setAttribute(name, attr.value);
      } else if (name === "id" && node.namespaceURI === "http://www.w3.org/2000/svg" &&
                 /^[a-z][\w-]*$/i.test(attr.value)) {
        out.setAttribute("id", attr.value);
      } else if (ATTRS.has(name)) out.setAttribute(attr.name, attr.value);
    }
    const keepSpacing = preserveNewlines || tag === "pre" || tag === "code" ||
      node.namespaceURI === "http://www.w3.org/1998/Math/MathML" ||
      node.namespaceURI === "http://www.w3.org/2000/svg";
    if (!VOID.has(tag)) for (const child of node.childNodes) {
      const safe = clean(child, keepSpacing);
      if (safe) out.appendChild(safe);
    }
    return out;
  };
  const holder = doc.createElement("div");
  for (const child of [...doc.body.childNodes]) {
    const safe = clean(child);
    if (safe) holder.appendChild(safe);
  }
  return holder.innerHTML;
}

export const authored = value => safeMarkup(renderMath(value));
