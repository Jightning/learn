/* composedPath includes editors inside shadow DOM, unlike event.target. */
export function isEditingEvent(event) {
  return event.defaultPrevented || (event.composedPath?.() || [event.target]).some(node =>
    node?.isContentEditable || node?.matches?.('input,textarea,select,math-field,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="spinbutton"],[role="searchbox"],[role="listbox"],[aria-haspopup="listbox"],dialog[open]'));
}
