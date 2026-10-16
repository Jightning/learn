import { esc } from "./util.js";

/* Display a portable locator while leaving the authored evidence unchanged. */
export function sourceLabel(value) {
  const text = String(value).trim();
  if (text.includes('<')) return text;
  const path = text.replaceAll('\\', '/');
  if (/^(?:file:\/\/|[a-z]:\/|\/(?!\/))/i.test(path)) {
    const root = path.lastIndexOf('/sources/');
    return root >= 0 ? path.slice(root + '/sources/'.length) : path.slice(path.lastIndexOf('/') + 1);
  }
  return path.replace(/^sources\//, '');
}

export function sourceReference(value) {
  const label = sourceLabel(value);
  if (label.includes("<") || label.length <= 48) return `<span class="bsrc">${label}</span>`;
  const at = label.length - 20;
  return `<span class="bsrc is-long" title="${esc(label).replaceAll('"', '&quot;')}">` +
    `<span class="bsrc-head">${esc(label.slice(0, at))}</span>` +
    `<span class="bsrc-tail">${esc(label.slice(at))}</span></span>`;
}
