import { useState, useRef, useEffect, useLayoutEffect } from "preact/hooks";

/* A facet, closed until asked for.
 *
 * Explore used to lay every value of every facet on the page at once: four
 * rows of chips, one per axis, forty-odd buttons above an empty result list.
 * That is a defensible shape for two or three values and stops being one the
 * moment a course declares twenty categories — the filters then cost more
 * vertical space than the results they filter, and a reader has to read the
 * whole panel to find out that the axis they wanted holds one option.
 *
 * So each axis collapses to its own name and its current value, which is the
 * one thing about it worth showing at rest. The menu is a real popover rather
 * than a <select> because two of the four cannot be one: Kind takes several
 * values at once, and Category has to show its monogram, its population and
 * its boundary, none of which an <option> can carry.
 *
 * `children` is a function so a chosen item can close the menu behind it — a
 * single-value facet should not need a second click to dismiss, and a
 * multi-value one should not close after the first tick.
 */
export default function Dropdown({ label, value, wide, children }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const menu = useRef(null);

  /* Open towards the room there is.
   *
   * Downwards is the right default and was the only option, which is fine for
   * a facet row near the top of a page and wrong for the read-aloud bar, which
   * is docked at the *bottom* of the screen: every one of its menus opened
   * into the space below the viewport and could not be seen at all.
   *
   * Measured rather than guessed, because the same component is used in both
   * places and neither should have to declare which way it points. Laid out
   * before paint so the menu never appears in the wrong place first, and the
   * height is capped to the side it chose, so a long list scrolls inside the
   * screen instead of running off it. */
  useLayoutEffect(() => {
    if (!open || !box.current || !menu.current) return;
    const b = box.current.getBoundingClientRect();
    const GAP = 8;
    const below = innerHeight - b.bottom - GAP;
    const above = b.top - GAP;
    const wants = menu.current.scrollHeight;
    const up = below < Math.min(wants, 180) && above > below;
    menu.current.classList.toggle("is-up", up);
    menu.current.style.maxHeight = Math.max(96, (up ? above : below)) + "px";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    /* pointerdown, not click: a click that lands on another facet's button
       would otherwise close this one and open that one in the same gesture,
       and the second menu would appear to have been opened by nothing. */
    const away = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const key = e => {
      if (e.key !== "Escape") return;
      setOpen(false);
      box.current?.querySelector(".dd-b")?.focus();
    };
    addEventListener("pointerdown", away);
    addEventListener("keydown", key);
    return () => { removeEventListener("pointerdown", away); removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div class={"dd" + (open ? " is-open" : "")} ref={box}>
      <button class={"dd-b" + (value ? " set" : "")} type="button"
              aria-expanded={open} aria-haspopup="menu"
              onClick={() => setOpen(v => !v)}>
        <span class="dd-l">{label}</span>
        {value && <span class="dd-v">{value}</span>}
        <i class="caret dd-c" aria-hidden="true" />
      </button>
      {open && (
        <div class={"dd-menu" + (wide ? " wide" : "")} role="menu" ref={menu}
             aria-label={label}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** one row of a menu. `multi` draws a box rather than a dot. */
export function Item({ sel, multi, lead, text, sub, n, onPick }) {
  return (
    <button class={"dd-i" + (sel ? " sel" : "")} type="button"
            role={multi ? "menuitemcheckbox" : "menuitemradio"} aria-checked={sel}
            onClick={onPick}>
      <span class={"dd-mark" + (multi ? " box" : "")} aria-hidden="true" />
      {lead}
      <span class="dd-t">{text}</span>
      {n != null && <span class="dd-n">{n}</span>}
      {sub && <span class="dd-sub">{sub}</span>}
    </button>
  );
}
