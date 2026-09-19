/* The page actions that are not navigation and not the review queue.
 *
 * Defined once and mounted twice, but no longer as two copies of the same row
 * behind a breakpoint: the toolbar mounts them only in the library, where
 * there is no sidebar to hold them, and the sidebar mounts them under Reading
 * options everywhere else. So the two mounts now differ in what they carry —
 * the library has nothing to reveal and no depth to reset a zoom against —
 * which is what `cls` and the optional props are for.
 *
 * Why they left the toolbar at all: a sticky bar is on screen for the whole
 * session and sits directly above the prose. Reading needs the material, the
 * mode and search. A theme is set once and a zoom almost never, so they go one
 * disclosure deeper rather than staying permanently in the way.
 *
 * `Reset` used to be here, a destructive and unrecoverable action one
 * thumb-width from `Search`. Moving it one tap deeper was never the fix: it is
 * the only control on the site that can lose work, and what it erases — the
 * answer log — is displayed and exported on the calibration page. It now sits
 * there, under the row that offers to export the thing first.
 *
 * `show` is which of them the caller wants, and it exists for one reason: the
 * sidebar reads Reveal all, Listen, Theme, and Listen is not defined here —
 * speech has to start inside a user gesture on a button the Speaker owns. So
 * the sidebar mounts this twice around it rather than accepting whatever order
 * one mount would impose. The library asks for all three; it has no Listen.
 */
export default function CourseActions({ inCourse, expanded, onExpand,
                                        zoom = 1, onZoomReset, cls = "tbtn",
                                        show = "all" }) {
  const page = show === "all" || show === "page";
  const look = show === "all" || show === "look";

  const toggleTheme = () => {
    const el = document.documentElement;
    let cur = el.getAttribute("data-theme");
    if (!cur) cur = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    el.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* One control, two directions. "Close all" puts the page back the way
          the depth had it rather than to the full text — otherwise closing is a
          different act from never having opened, and the reader who opened one
          block to check something can never get their view back. */}
      {inCourse && page && (
        <button class={cls} onClick={onExpand}
                title={expanded ? "Put the page back the way this depth had it"
                                : "Open every block and reveal every answer"}>
          {expanded ? "Close all" : "Reveal all"}
        </button>
      )}
      {look && (
        <button class={cls} onClick={toggleTheme} aria-label="Toggle colour theme">Theme</button>
      )}
      {/* Only once it is off its default, so it reports a state the reader set
          rather than adding a permanent control to a panel of them. */}
      {page && zoom !== 1 && onZoomReset && (
        <button class={cls + " zoomchip"} onClick={onZoomReset}
                title="Reset content zoom  (ctrl 0)" aria-label="Reset content zoom">
          {Math.round(zoom * 100)}%
        </button>
      )}
    </>
  );
}
