/* View switch helper: kept for call-site compatibility; transitions are
   instant (DESIGN.md MOTION 1 — state feedback only, no swipe overlays). */
export function wipeThen(action) {
  action();
}
