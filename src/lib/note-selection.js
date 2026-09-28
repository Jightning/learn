/* A learner's selection is stored as character offsets in the block's text.
 * The DOM can reflow without changing those offsets. The quote prevents an
 * edited course from highlighting unrelated text at the old position. */
const NAME = "learner-note";
let activeRoot = null;

export function selectedIn(root) {
  const sel = getSelection();
  if (!root || !sel?.rangeCount || sel.isCollapsed) return null;
  const chosen = sel.getRangeAt(0);
  if (!chosen.intersectsNode(root)) return null;
  const whole = document.createRange();
  whole.selectNodeContents(root);
  const clipped = chosen.cloneRange();
  if (whole.compareBoundaryPoints(Range.START_TO_START, chosen) > 0)
    clipped.setStart(whole.startContainer, whole.startOffset);
  if (whole.compareBoundaryPoints(Range.END_TO_END, chosen) < 0)
    clipped.setEnd(whole.endContainer, whole.endOffset);
  if (clipped.collapsed || !clipped.toString().trim()) return null;
  const before = document.createRange();
  before.setStart(whole.startContainer, whole.startOffset);
  before.setEnd(clipped.startContainer, clipped.startOffset);
  const start = before.toString().length;
  return { start, end: start + clipped.toString().length, quote: clipped.toString() };
}

export function rangeFor(root, saved) {
  if (!root || !saved || !Number.isInteger(saved.start) ||
      !Number.isInteger(saved.end) || saved.start < 0 || saved.end <= saved.start)
    return null;
  const text = root.textContent;
  if (text.slice(saved.start, saved.end) !== saved.quote) return null;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node, pos = 0, started = false;
  while ((node = walk.nextNode())) {
    const next = pos + node.length;
    if (!started && saved.start < next) {
      range.setStart(node, saved.start - pos);
      started = true;
    }
    if (started && saved.end <= next) {
      range.setEnd(node, saved.end - pos);
      return range;
    }
    pos = next;
  }
  return null;
}

export function showNoteSelection(root, saved) {
  clearNoteSelection(activeRoot);
  const range = rangeFor(root, saved);
  if (!range || !globalThis.CSS?.highlights || !globalThis.Highlight) return;
  CSS.highlights.set(NAME, new Highlight(range));
  activeRoot = root;
}

export function clearNoteSelection(root) {
  if (root !== activeRoot) return;
  CSS.highlights?.delete(NAME);
  activeRoot = null;
}
