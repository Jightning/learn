/* Inline SVG icons. The previous build used ◈ ↻ ⌗ as text, which fell back to
 * tofu in the monospace stack — these always render. */
const P = { width: 13, height: 13, viewBox: "0 0 16 16", fill: "none",
            stroke: "currentColor", "stroke-width": 1.6,
            "stroke-linecap": "round", "stroke-linejoin": "round" };

export function IconStart()    { return <svg {...P}><path d="M2 4h12M2 8h12M2 12h7"/></svg>; }
export function IconPractice() { return <svg {...P}><path d="M13 8a5 5 0 1 1-1.6-3.7"/><path d="M13 2v3h-3"/></svg>; }
export function IconMap()      { return <svg {...P}><circle cx="4" cy="4" r="1.8"/><circle cx="12" cy="4" r="1.8"/><circle cx="8" cy="12" r="1.8"/><path d="M5.4 5.2 7 10.4M10.6 5.2 9 10.4M5.8 4h4.4"/></svg>; }
export function IconHome()     { return <svg {...P}><path d="M2.5 7 8 2.5 13.5 7"/><path d="M4 7.5V13h8V7.5"/></svg>; }
export function IconSearch()   { return <svg {...P}><circle cx="7" cy="7" r="4.3"/><path d="M10.2 10.2 14 14"/></svg>; }
/* Review: a clock, not another circular arrow. Mixed practice already wears
   the arrow, and the two differ in exactly one thing — the queue is scheduled
   and practice is not — so the icon that separates them has to be the one that
   says "when". */
export function IconReview()   { return <svg {...P}><circle cx="8" cy="8" r="5.8"/><path d="M8 4.6V8l2.4 1.6"/></svg>; }
/* The index: a page of entries with the thumb tab a back-of-book index is cut
   with. Replaces the separate concept and category marks, which were a diamond
   and a set of bins for two halves of one page. */
export function IconIndex()    { return <svg {...P}><path d="M3 2.5h8.5v11H3z"/><path d="M11.5 5h2M11.5 8h2M11.5 11h2"/><path d="M5.2 5.4h4M5.2 8h4M5.2 10.6h2.4"/></svg>; }
/* Explore: the search lens with a filter under it. */
export function IconExplore()  { return <svg {...P}><circle cx="6.6" cy="6.6" r="4.1"/><path d="M9.6 9.6 14 14"/><path d="M3.4 13.6h4"/></svg>; }
/* Saved: a page tab/bookmark, kept intentionally quieter than a star. */
export function IconSaved({ filled = false }) {
  return <svg {...P} fill={filled ? "currentColor" : "none"}>
    <path d="M4 2.3h8v11.4L8 11l-4 2.7z" />
  </svg>;
}

/* The grab handle: the two columns of dots every reorderable row in every
   toolkit wears. It is a learned shape rather than a described one, which is
   why it can be an icon at all — "drag me" has no picture. */
export function IconGrab()     { return <svg {...P}><path d="M6 3.5h.01M10 3.5h.01M6 8h.01M10 8h.01M6 12.5h.01M10 12.5h.01"/></svg>; }

export function IconTuck({ open }) {
  return !open ? (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M500-592v224q0 14 12 19t22-5l98-98q12-12 12-28t-12-28l-98-98q-10-10-22-5t-12 19ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z"/></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M660-368v-224q0-14-12-19t-22 5l-98 98q-12 12-12 28t12 28l98 98q10 10 22 5t12-19ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z"/></svg>
  );
}
