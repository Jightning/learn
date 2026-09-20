/* A swipe must first declare a horizontal direction, then travel far enough
   on that line. Keeping these tests separate lets a vertical scroll cancel
   early instead of becoming a swipe when the finger later drifts right. */
const INTENT_DISTANCE = 12;
const OPEN_DISTANCE = 48;
const HORIZONTAL_RATIO = 1.5;

export function swipeIntent(dx, dy) {
  if (Math.hypot(dx, dy) < INTENT_DISTANCE) return null;
  return dx > Math.abs(dy) ? "right" : "other";
}

export function opensSidebar(dx, dy) {
  return dx >= OPEN_DISTANCE && dx >= Math.abs(dy) * HORIZONTAL_RATIO;
}
