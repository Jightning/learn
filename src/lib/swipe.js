/* Decide whether the gesture starts as a swipe, then judge its horizontal
   travel. A later vertical drift must not undo an already locked drawer drag. */
const INTENT_DISTANCE = 12;
const OPEN_DISTANCE = 48;
const HORIZONTAL_RATIO = 1.5;

/* Decide ownership at pointerdown, before either gesture starts moving. A
   scrollport owns the swipe even when it has not been tapped or focused. */
export function ownsHorizontalSwipe(target) {
  for (let el = target; el instanceof Element; el = el.parentElement) {
    if (el.classList.contains("slides")) return true;
    const overflow = getComputedStyle(el).overflowX;
    if ((overflow === "auto" || overflow === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
  }
  return false;
}

export function swipeIntent(dx, dy) {
  if (Math.hypot(dx, dy) < INTENT_DISTANCE) return null;
  return dx > Math.abs(dy) ? "right" : "other";
}

export function opensSidebar(dx) {
  return dx >= OPEN_DISTANCE;
}

/** Direction for a slide deck: horizontal intent must be clear before a
 * vertical page scroll can change frames. */
export function slideSwipe(dx, dy) {
  if (Math.abs(dx) < OPEN_DISTANCE || Math.abs(dx) <= Math.abs(dy) * HORIZONTAL_RATIO) return null;
  return dx < 0 ? "next" : "previous";
}

export function slideIntent(dx, dy) {
  if (Math.hypot(dx, dy) < INTENT_DISTANCE) return null;
  if (Math.abs(dx) <= Math.abs(dy) * HORIZONTAL_RATIO) return "other";
  return dx < 0 ? "next" : "previous";
}
