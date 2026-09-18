import { useEffect, useRef } from "preact/hooks";
import { IconStart, IconIndex, IconPractice, IconMap, IconTuck, IconExplore,
         IconReview } from "./Icon.jsx";
import CourseActions from "./CourseActions.jsx";
import LaneSelect from "./LaneSelect.jsx";
import HueSelect from "./HueSelect.jsx";

/* State is carried by the number itself — weight, colour and an edge marker.
   The previous 26x18px pulse was too small to read as a signal and landed as a
   stray rectangle, which is worse than no device at all. */
function Cycle({ n, active, visited }) {
  return (
    <span class={"cyc" + (active ? " is-on" : "") + (visited ? " is-seen" : "")}>
      <span class="sec-num">{String(n).padStart(2, "0")}</span>
    </span>
  );
}

/* How much of the rail to keep beyond the mark, so it never lands flush
   against an edge and read as clipped. */
const EDGE = 28;

export default function Sidebar({ course, cid, rest, here, open, onNavigate, onTuck, actions,
                                  lane, onLane, due, zoom, onZoomReset,
                                  speech, onHue }) {
  const H = r => `#/${cid}${r ? "/" + r : ""}`;
  const rail = useRef(null);

  /* Bring the mark into view, because on anything longer than a short course
     it is not. Measured at 900px of sidebar: a 15-section course marks 721px
     down, a 62-section one 2021px down — a highlight below the fold of its own
     list is not a highlight.
     
     Minimally, and only the sidebar: never the page, never centred, and never
     while the pointer is over it, so a reader working down the list by hand is
     never yanked back to where the page happens to be. */
  useEffect(() => {
    const box = rail.current;
    if (!box || box.matches(":hover")) return;
    const mark = box.querySelector(".subs a.cur") || box.querySelector(".sec.active");
    if (!mark) return;
    const b = box.getBoundingClientRect(), m = mark.getBoundingClientRect();
    const over = m.bottom - (b.bottom - EDGE);
    const under = (b.top + EDGE) - m.top;
    const by = under > 0 ? -under : over > 0 ? over : 0;
    if (!by) return;
    /* Smooth for a nudge, instant for a relocation. Reading down a section
       moves the mark a row at a time and the glide is what makes that legible;
       arriving at section 40 of 62 is a 2000px jump, and animating that is a
       second of the rail streaming past on a control nobody was looking at. */
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const far = Math.abs(by) > b.height;
    box.scrollTo({ top: box.scrollTop + by, behavior: calm || far ? "auto" : "smooth" });
  }, [here, rest]);
  /* the primer belongs to the section it introduces, so the rail marks it too */
  const target = rest && rest.startsWith("primer/") ? rest.slice(7) : rest;
  const activeSec = target && target.startsWith("s") ? target.split("-")[0] : null;
  const curNum = activeSec ? Number(activeSec.slice(1)) : 0;

  /* One Index, not two. "Core concepts" and "Categories" were adjacent rows
     opening onto identical card grids, and the reader's only way to learn
     which was which was to visit both. They are two bands of one page now; see
     components/Index.jsx. Explore sits last because it is where you go when
     the index did not have the shape you wanted. */
  const ixHere = ["index", "concepts", "cat"].includes(rest)
    || rest.startsWith("c/") || rest.startsWith("cat/");
  const top = [
    ["", "Overview", IconStart, !rest],
    ["index", "Index", IconIndex, ixHere],
    ["practice", "Mixed practice", IconPractice, rest === "practice" || rest.startsWith("practice/")],
    /* The queue was a chip in the toolbar. It is a place you go, which is what
       every other row here is, and it sits beside mixed practice because the
       two are the same act at two schedules. It carries a count, so the count
       goes where a count goes in a table of contents: the far edge.

       Scoped to this course, and so is the count. A rail belongs to one course
       and a row in it that drilled every other course was the reason the page
       needed a frame of its own; the cross-course queue is on the dashboard.
       Absent entirely until this course has a drill bank. */
    ...(due != null ? [["review", "Review", IconReview,
                        rest === "review", due]] : []),
    ["map", "Dependency map", IconMap, rest === "map" || rest.startsWith("map/")],
    ["explore", "Explore", IconExplore, rest === "explore" || rest.startsWith("explore/")]
  ];

  return (
    <aside class={"sidebar" + (open ? " open" : "")} id="sidebar" ref={rail}>
      {/* No close control of its own. It sat pinned to the drawer's top-right,
          which on an iPhone is under the Dynamic Island — and the drawer
          already has three ways out that cost no chrome: the scrim beside it,
          the Menu button that opened it, and Escape. */}
      <div class="brand">
        {/* Not conditional on there being more than one course: the library
            is also where a course is installed and removed, so a single-course
            device needs this link most. */}
        <a class="backlib" href="#/">All courses</a>
        <span class="code">{course.code}</span>
        <span class="name">{course.title}</span>
        <span class="meta">{course.meta}</span>
      </div>

      <div class="navtop">
        {top.map(([route, label, Ico, cur, n]) => (
          <a key={label} href={H(route)} class={(cur ? "cur" : "") + (n != null ? " rv-row" : "")}
             id={n != null ? "rv-open" : undefined}
             title={n != null ? "Review what is due  (r)" : undefined}
             onClick={onNavigate}>
            <span class="k"><Ico /></span>{label}
            {n != null && <b class="rv-n">{n}</b>}
          </a>
        ))}
      </div>

      {/* the control acts on the sidebar, so it lives on the sidebar's edge */}
      <button class="tuck" onClick={onTuck} title="Hide the section list  (\\)"
              aria-label="Hide the section list">
        <IconTuck open />
      </button>

      <nav class="rail" aria-label="Course sections">
        {course.sections.map(s => {
          const on = s.id === activeSec;
          return (
            <div key={s.id} class={"sec" + (on ? " active open" : "")}>
              <a class="sec-btn" href={H(s.id)} onClick={onNavigate}>
                <Cycle n={s.num} active={on} visited={s.num < curNum} />
                <span class="sec-title">{s.title}</span>
              </a>
              <ul class="subs">
                {s.subs.map((sub, k) => (
                  <li key={sub.id}>
                    {/* `here` is where the reader is, not where they clicked —
                        see useReading in lib/nav.js. */}
                    <a href={H(sub.id)} class={here === sub.id ? "cur" : ""} onClick={onNavigate}>
                      {`${s.num}.${k + 1}  ${sub.title}`}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Everything that is a setting rather than a place.
       *
       * It used to be called "Reading options" and hold the two axes the mode
       * switch presets. The depth axis has gone: Study / Review / Names in the
       * toolbar is the same three states under names that say what they are
       * for, and two controls for one setting is one control too many — the
       * reader who found both had to work out that they were the same thing.
       * The lane is not that, so it stays: it is the one question the mode
       * switch cannot ask on its own.
       *
       * What is left reads top to bottom by how long a control's reach is: the
       * page actions first, on one line, because they are pressed mid-read and
       * forgotten; then the two settings that stay set — the lane, and the
       * colour the course wears on this device.
       *
       * It sits at the foot of the navigation and sticks there — the rail above
       * it is as long as the course, and a panel that scrolls away is a panel
       * that is not there on a 62-section course. Closed it is one line; open
       * it is a card, set on its own ground and inside its own border, so that
       * a panel that overlaps the section list is obviously in front of it
       * rather than part of it. */}
      {onLane && (
        <details class="axes">
          <summary><i class="caret" aria-hidden="true" />Settings</summary>
          <div class="axes-body">
            {/* The four page actions on one line, above the two settings that
                take a row each. They are the controls with the shortest reach —
                pressed mid-read and then forgotten — so they go where the eye
                lands first, and they are short enough that four of them fit the
                rail's width. No headings over the three parts: with six
                controls in a panel that is already inside a disclosure, a label
                per band was a third level of structure over a list you can read
                in one glance. */}
            <div class="axes-acts">
              <CourseActions inCourse cls="lane-b" show="page"
                             expanded={actions.expanded} onExpand={actions.onExpand}
                             zoom={zoom} onZoomReset={onZoomReset} />
              {/* Listen is the one control that must be reached by a real press:
                  iOS and Chrome only let speech start from a user gesture, so
                  this button is the gesture and nothing may start without it.
                  Absent where the browser has no speech engine at all. */}
              {speech && speech.supported && (
                <button class="lane-b spk-go" data-on={speech.live || undefined}
                        onClick={speech.live ? speech.stop : speech.start}>
                  {speech.live ? "Stop reading" : "▶ Listen"}
                </button>
              )}
              <CourseActions inCourse cls="lane-b" show="look" />
            </div>

            <LaneSelect lane={lane} onLane={onLane} />
            <HueSelect cid={cid} onHue={onHue} />
          </div>
        </details>
      )}
    </aside>
  );
}
