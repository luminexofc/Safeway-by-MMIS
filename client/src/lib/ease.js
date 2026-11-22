// The only motion token still in use. The rest of the vendored beui physics
// (EASE_*, SPRING_SWAP/PANEL/LAYOUT, TABS_GLIDE) lost its callers when the
// unused beui components were removed; they are recoverable from git history
// if a component needs them again.
export const SPRING_PRESS = { type: "spring", stiffness: 500, damping: 30, mass: 0.6 };
