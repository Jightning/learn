/* Sidebar icons: Google Material Icons Outlined (Apache-2.0).
 * https://github.com/google/material-design-icons/tree/master/src
 * view_agenda, schedule, device_hub, explore, bookmark_border, bookmark, thumb_down.
 * License: docs/material-icons-LICENSE.txt. */
const M = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "currentColor",
            "aria-hidden": "true", focusable: "false" };

/* Inline SVG icons. The previous build used ◈ ↻ ⌗ as text, which fell back to
 * tofu in the monospace stack — these always render. */
const P = { width: 13, height: 13, viewBox: "0 0 16 16", fill: "none",
            stroke: "currentColor", "stroke-width": 1.6,
            "stroke-linecap": "round", "stroke-linejoin": "round" };

export function IconThumbDown() { return <svg {...M}><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm0 12l-4.34 4.34L12 14H3v-2l3-7h9v10zm4-12h4v12h-4z" /></svg>; }

export function IconStart() { return <svg {...M}><path d="M19,13H5c-1.1,0-2,0.9-2,2v4c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2v-4C21,13.9,20.1,13,19,13z M19,19H5v-4h14V19z" /><path d="M19,3H5C3.9,3,3,3.9,3,5v4c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,9H5V5h14V9z" /></svg>; }
export function IconPractice() { return <svg {...P}><path d="M13 8a5 5 0 1 1-1.6-3.7"/><path d="M13 2v3h-3"/></svg>; }
export function IconMap() { return <svg {...M}><path d="M17 16l-4-4V8.82C14.16 8.4 15 7.3 15 6c0-1.66-1.34-3-3-3S9 4.34 9 6c0 1.3.84 2.4 2 2.82V12l-4 4H3v5h5v-3.05l4-4.2 4 4.2V21h5v-5h-4z" /></svg>; }
export function IconHome()     { return <svg {...P}><path d="M2.5 7 8 2.5 13.5 7"/><path d="M4 7.5V13h8V7.5"/></svg>; }
export function IconSearch()   { return <svg {...P}><circle cx="7" cy="7" r="4.3"/><path d="M10.2 10.2 14 14"/></svg>; }
/* Review leads with its scheduled queue; mixed practice lives inside it. */
export function IconReview() { return <svg {...M}><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>; }
/* The index: a page of entries with the thumb tab a back-of-book index is cut
   with. Replaces the separate concept and category marks, which were a diamond
   and a set of bins for two halves of one page. */
export function IconIndex()    { return <svg {...P}><path d="M3 2.5h8.5v11H3z"/><path d="M11.5 5h2M11.5 8h2M11.5 11h2"/><path d="M5.2 5.4h4M5.2 8h4M5.2 10.6h2.4"/></svg>; }
/* Explore uses the Material compass. */
export function IconExplore() { return <svg {...M}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" /></svg>; }
/* Saved: a page tab/bookmark, kept intentionally quieter than a star. */
export function IconSaved({ filled = false }) {
  return <svg {...M}>{filled ? <><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></> : <><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" /></>}</svg>;
}

/* The grab handle: the two columns of dots every reorderable row in every
   toolkit wears. It is a learned shape rather than a described one, which is
   why it can be an icon at all — "drag me" has no picture. */
export function IconGrab()     { return <svg {...P}><path d="M6 3.5h.01M10 3.5h.01M6 8h.01M10 8h.01M6 12.5h.01M10 12.5h.01"/></svg>; }

export function IconTuck({ open }) {
  return !open ? (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M500-592v224q0 14 12 19t22-5l98-98q12-12 12-28t-12-28l-98-98q-10-10-22-5t-12 19ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z"/></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M660-368v-224q0-14-12-19t-22 5l-98 98q-12 12-12 28t12 28l98 98q10 10 22 5t12-19ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z"/></svg>
  );
}
