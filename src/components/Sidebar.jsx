import { useEffect, useRef } from "preact/hooks";
import { IconStart, IconIndex, IconPractice, IconMap, IconTuck, IconExplore,
         IconReview } from "./Icon.jsx";
import CourseActions from "./CourseActions.jsx";
import LaneSelect from "./LaneSelect.jsx";
import DepthSelect from "./DepthSelect.jsx";

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
                                  lane, onLane, depth, onDepth, due, zoom, onZoomReset,
                                  speech }) {
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

      {/* The two axes the mode switch presets, for a reader who wants them
          directly.
       *
       * They used to sit between a section's blurb and its first paragraph —
       * nine combinations and two unexplained taxonomies in front of the
       * material. They are not removed, because a course whose blocks are
       * almost all spine still needs both, and because the value of provided
       * support reverses with expertise: the right amount is a property of who
       * is reading, so the reader has to be able to reach it.
       *
       * Here, at the foot of the navigation, is as far from the reading column
       * as it gets while still being on the page the reader is reading. It is
       * a <details>, closed by default, so it costs one line until it is
       * wanted; the keys keep working whether or not it is open. */}
      {onLane && (
        <details class="axes">
          <summary><i class="caret" aria-hidden="true" />Reading options</summary>
          <LaneSelect lane={lane} onLane={onLane} />
          <DepthSelect depth={depth} onDepth={onDepth} />
          {/* The three the toolbar used to carry. They sit under the two axes
              rather than beside them because they are settings of the same
              kind — what the page shows, not where the page is — and because
              this is the only panel on the site that already means that. */}
          <div class="axes-acts">
            <CourseActions inCourse cls="lane-b"
                           expanded={actions.expanded} onExpand={actions.onExpand}
                           zoom={zoom} onZoomReset={onZoomReset} />
            {/* Listen belongs with the other two axes because it is the same
                kind of setting: what the page gives you, not where the page is.
                It is also the one control that must be reached by a real press
                — iOS and Chrome only let speech start from a user gesture, so
                this button is the gesture and nothing may start without it.
                Absent where the browser has no speech engine at all. */}
            {speech && speech.supported && (
              <button class="lane-b spk-go" data-on={speech.live || undefined}
                      onClick={speech.live ? speech.stop : speech.start}>
                {speech.live ? "Stop reading" : "▶ Listen"}
              </button>
            )}
          </div>
        </details>
      )}
    </aside>
  );
}
