import { IconSearch, IconHome } from "./Icon.jsx";
import CourseActions from "./CourseActions.jsx";
import ModeSwitch from "./ModeSwitch.jsx";
import { M } from "../lib/math.js";

/* The toolbar carries three things and no more: where you are, what you are
 * reading for, and the way to find something.
 *
 * It used to carry seven — breadcrumb, zoom chip, review queue, mode switch,
 * search, reveal-all and theme — and at 1440px that is a row of controls
 * running the width of the screen above every page of prose, most of them
 * things a reader sets once a session or never. Crowding a sticky bar is
 * expensive twice: it is the one element on screen for the whole session, and
 * it sits directly above the reading column it is supposed to be quieter than.
 *
 * The rest did not disappear, they went to the sidebar: the queue is a place
 * you go, so it is a navigation row, and reveal-all, theme and zoom are
 * reading settings, so they are under Reading options with the other two.
 *
 * The library is the exception and the reason `inCourse` gates the group
 * below. It renders no sidebar (`shell.solo`), so a control moved off its
 * toolbar is a control with nowhere to live — and the queue in particular is
 * cross-course, which is exactly what the library is. */
export default function Topbar({ crumb, inCourse, home, onSearch, onMenu, zoom, onZoomReset,
                                 due, onReview, reading, lane, depth, onMode }) {
  return (
    <div class="topbar">
      {/* Only where there is a sidebar to open. The library is `shell.solo` and
          renders none, so on a phone this button used to dim the page behind a
          scrim covering nothing and wait to be dismissed. */}
      {inCourse && (
        <button class="tbtn mobnav" onClick={onMenu} aria-label="Open navigation"
                aria-controls="sidebar">Menu</button>
      )}
      {/* Home is the breadcrumb's root rather than a control beside it. The
          sidebar has an "All courses" link, but it is inside a drawer on a
          phone and gone entirely when the sidebar is collapsed — and the
          library is not just a picker, it is where a course is installed and
          removed, so the way back cannot depend on the one piece of chrome the
          reader is allowed to hide.

          It goes *inside* the crumb because a control in front of the crumb
          pushes it off the reading column's left edge: the bar is aligned with
          the prose beneath it, and 108px of button is 108px of misalignment. A
          trail that starts at the library is also what a breadcrumb is. */}
      <span class="crumb">
        {/* `home`, not `inCourse`. The cross-course review is not in a course
            and is not the library either, so keying the way back on `inCourse`
            left it with no way back at all: it had given up its Close button on
            the grounds that every page has a breadcrumb, and then rendered the
            one breadcrumb that did not. */}
        {home && (
          <>
            <a class="crumb-home" id="tb-home" href="#/" aria-label="All courses">
              <IconHome /><span class="crumb-word">Courses</span>
            </a>
            <span class="crumb-sep" aria-hidden="true">›</span>
          </>
        )}
        <span dangerouslySetInnerHTML={{ __html: M(crumb) }} />
      </span>
      <span class="spacer" />
      {/* Only while there is material on screen. The mode decides how a section
          renders, so on a hub or the Desk it would be a control over nothing —
          and the Desk in particular is about what to do next, not how to draw
          it. */}
      {reading && <ModeSwitch lane={lane} depth={depth} onMode={onMode} />}
      {inCourse && (
        <button class="tbtn" onClick={onSearch} aria-label="Search">
          <IconSearch /><span class="tb-word">Search /</span>
        </button>
      )}
      {/* The library's whole chrome. In a course every one of these is in the
          sidebar instead; see the header comment. */}
      {!inCourse && (
        <>
          {zoom !== 1 && (
            <button class="tbtn zoomchip" onClick={onZoomReset}
                    title="Reset content zoom  (ctrl 0)" aria-label="Reset content zoom">
              {Math.round(zoom * 100)}%
            </button>
          )}
          {/* Not while standing on it. Outside a course `home` is only true on
              the review page itself, so this is "the library, and nowhere
              else" without a third prop to say so. */}
          {due != null && !home && (
            <button class="tbtn rv" id="rv-open" onClick={onReview}
                    title="Review what is due  (r)" aria-label={`Review, ${due} due`}>
              Review <b>{due}</b>
            </button>
          )}
          <CourseActions />
        </>
      )}
    </div>
  );
}
