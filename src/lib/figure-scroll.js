/* A figure's caption stays put; only its drawing scrolls. Mark the edges that
 * still hide content so the fades disappear at either end of the scroll. */
export function watchFigureScroll(root) {
  const entries = [...root.querySelectorAll(".figure-viewport")].map(view => {
    const scroll = view.querySelector(".figure-scroll");
    const update = () => {
      const limit = scroll.scrollWidth - scroll.clientWidth;
      view.classList.toggle("has-left", scroll.scrollLeft > 2);
      view.classList.toggle("has-right", limit - scroll.scrollLeft > 2);
      scroll.tabIndex = limit > 2 ? 0 : -1;
    };
    scroll.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroll);
    if (scroll.firstElementChild) observer.observe(scroll.firstElementChild);
    update();
    return () => { scroll.removeEventListener("scroll", update); observer.disconnect(); };
  });
  return () => entries.forEach(cleanup => cleanup());
}
